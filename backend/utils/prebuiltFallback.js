const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('./arGlbPaths');

const PREBUILT_CATALOG = [
  {
    keywords: ['dtu', 'dce', 'delhi technological university', 'dtu gate'],
    filename: 'dtu_gate.glb',
    name: 'DTU Gate — Delhi Technological University (DCE)',
    thumbnail: '/models/dtu_gate_thumb.jpg',
  },
  {
    keywords: ['red fort', 'redfort', 'lal qila', 'delhi fort', 'qila'],
    filename: 'red_fort.glb',
    name: 'Red Fort (Lal Qila) — Delhi Monument',
    thumbnail: '/models/red_fort_thumb.jpg',
  },
  {
    keywords: ['duck', 'rubber duck', 'yellow duck', 'bath duck'],
    filename: 'duck.glb',
    name: 'Yellow Rubber Duck',
    thumbnail: '/models/duck_thumb.png',
  },
  {
    keywords: ['boat', 'speed boat', 'speedboat', 'ship', 'motorboat', 'yacht'],
    filename: 'speed_boat.glb',
    name: 'Speed Boat — Hydrofoil Racer',
    thumbnail: '/models/speed_boat_thumb.jpg',
  },
  {
    keywords: ['car', 'lamborghini', 'lambo', 'sports car', 'huracan', 'vehicle', 'automobile'],
    filename: 'lamborghini_basic_pbr.glb',
    name: 'Sports Car — Huracán-class',
    thumbnail: '/Lamborgini_image.png',
  },
  {
    keywords: ['toy car', 'toycar', 'diecast car'],
    filename: 'toy_car.glb',
    name: 'Vintage Toy Car',
    thumbnail: '/models/toy_car_thumb.png',
  },
  {
    keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'nike'],
    filename: 'shoes_basic_pbr.glb',
    name: 'Designer Sneakers',
    thumbnail: '/Shoes.png',
  },
  {
    keywords: ['ironman', 'iron man', 'hero', 'superhero', 'armor', 'suit'],
    filename: 'ironman_basic_pbr.glb',
    name: 'Armored Hero Suit',
    thumbnail: '/ironMan .png',
  },
  {
    keywords: ['drone', 'scifi drone', 'quadcopter'],
    filename: 'scifi_drone.glb',
    name: 'Sci-Fi Drone',
    thumbnail: '/drone-generated.png',
  },
];

/**
 * Attempts to match a prompt to our offline, high-fidelity 3D asset library
 * when external free GPU quotas are exhausted.
 */
function tryPrebuiltFallback(prompt, taskId) {
  if (!prompt || typeof prompt !== 'string') return null;
  const p = prompt.toLowerCase();
  const match = PREBUILT_CATALOG.find((m) =>
    m.keywords.some((kw) => {
      const reg = new RegExp(`(^|\\s|[,.!?])${kw.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}($|\\s|[,.!?])`, 'i');
      return reg.test(p) || p.includes(kw);
    })
  );
  if (!match) return null;

  const publicModelPath = path.resolve(__dirname, '../../public/models', match.filename);
  if (fs.existsSync(publicModelPath)) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const destGlb = path.join(UPLOAD_DIR, `${taskId}.glb`);
    try {
      fs.copyFileSync(publicModelPath, destGlb);
      return {
        glbServeUrl: `/uploads/ar/${taskId}.glb`,
        thumbnailUrl: match.thumbnail,
        name: match.name,
      };
    } catch (_) {
      return {
        glbServeUrl: `/models/${match.filename}`,
        thumbnailUrl: match.thumbnail,
        name: match.name,
      };
    }
  }

  return {
    glbServeUrl: `/models/${match.filename}`,
    thumbnailUrl: match.thumbnail,
    name: match.name,
  };
}

module.exports = {
  tryPrebuiltFallback,
};

