const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const createApp = require('../createApp');
const User = require('../models/User');

describe('Projects & chat API', () => {
  let app;
  let mongoServer;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.JWT_SECRET = 'test-jwt-secret-visiarise-integration';
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const cols = mongoose.connection.collections;
    for (const key of Object.keys(cols)) {
      await cols[key].deleteMany({});
    }
    const u = await User.create({
      name: 'Test',
      email: 'tester@example.com',
      password: 'secret12',
      isVerified: true,
    });
    token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  });

  it('creates and lists projects', async () => {
    const create = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P1', description: 'D1' })
      .expect(201);
    expect(create.body.project.id).toBeDefined();
    expect(create.body.project.name).toBe('P1');

    const list = await request(app).get('/api/projects').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.projects).toHaveLength(1);
    expect(list.body.projects[0].name).toBe('P1');
  });

  it('patches modelUrls and persists chat with Meshy links', async () => {
    const create = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P2' })
      .expect(201);
    const pid = create.body.project.id;

    await request(app)
      .patch(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        modelUrl: 'https://example.com/m.glb',
        modelUrls: { glb: 'https://example.com/m.glb', fbx: 'https://example.com/m.fbx' },
        meshyTaskId: 'meshy-task-1',
      })
      .expect(200);

    const getOne = await request(app)
      .get(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getOne.body.project.modelUrls.fbx).toContain('example.com');

    await request(app)
      .post(`/api/projects/${pid}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'user', content: 'hello', clientMessageId: 'c1' })
      .expect(201);

    await request(app)
      .post(`/api/projects/${pid}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'assistant',
        content: 'done',
        modelUrl: 'https://example.com/m.glb',
        modelUrls: { glb: 'https://example.com/m.glb' },
        meshyTaskId: 'meshy-task-1',
        clientMessageId: 'c2',
      })
      .expect(201);

    const chat = await request(app)
      .get(`/api/projects/${pid}/chat`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chat.body.messages).toHaveLength(2);
    expect(chat.body.messages[1].modelUrls.glb).toContain('example.com');
  });

  it('hosts public AR share when arSharePublic and GLB uploaded', async () => {
    const minimalGlbBuffer = () => {
      const gltfJson = JSON.stringify({
        asset: { version: '2.0' },
        scenes: [{ nodes: [] }],
        scene: 0,
        nodes: [],
      });
      const jsonStr = gltfJson + ' '.repeat((4 - (Buffer.byteLength(gltfJson) % 4)) % 4);
      const jsonBuf = Buffer.from(jsonStr, 'utf8');
      const totalLen = 12 + 8 + jsonBuf.length;
      const out = Buffer.alloc(totalLen);
      out.writeUInt32LE(0x46546c67, 0);
      out.writeUInt32LE(2, 4);
      out.writeUInt32LE(totalLen, 8);
      let o = 12;
      out.writeUInt32LE(jsonBuf.length, o);
      o += 4;
      out.writeUInt32LE(0x4e4f534a, o);
      o += 4;
      jsonBuf.copy(out, o);
      return out;
    };

    const create = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AR Pub' })
      .expect(201);
    const pid = create.body.project.id;

    await request(app).get(`/api/projects/share/${pid}`).expect(404);

    const glb = minimalGlbBuffer();
    await request(app)
      .post(`/api/projects/${pid}/ar-glb`)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/octet-stream')
      .send(glb)
      .expect(200);

    await request(app).get(`/api/projects/share/${pid}`).expect(404);

    await request(app)
      .patch(`/api/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        arSharePublic: true,
        arPageTitle: 'My Demo',
        arPageTagline: 'Try it',
        status: 'published',
      })
      .expect(200);

    const share = await request(app).get(`/api/projects/share/${pid}`).expect(200);
    expect(share.body.arPageTitle).toBe('My Demo');
    expect(share.body.modelUrl).toContain('model.glb');

    const model = await request(app).get(`/api/projects/share/${pid}/model.glb`).expect(200);
    expect(model.headers['content-type']).toMatch(/model\/gltf-binary/);
    expect(Number(model.headers['content-length'])).toBeGreaterThanOrEqual(92);
  });

  it('returns 401 without token', async () => {
    await request(app).get('/api/projects').expect(401);
  });
});
