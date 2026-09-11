import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useAppStore, type StudioExtraModel, type StudioRigConfig } from '../store/useAppStore';
import {
  applyStudioTransform,
  arrayBufferToGlbDataUrl,
  centerObjectAtOrigin,
  exportObject3DToGlbArrayBuffer,
  exportObject3DToGlbDataUrl,
  fitCameraToObject,
  loadGltfMeshyWithAnimations,
  loadGltfWithAnimations,
  readStudioTransform,
} from '../lib/studio3d';
import { submitWebArPublish } from '../lib/submitWebArPublish';
import {
  countTriangles,
  estimateTextureBytes,
  findFirstMesh,
  getBoundingSize,
} from '../lib/studioUtils';
import { formatDimsInches, inchesToMeters, metersToInches } from '../lib/studioInches';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Box,
  Sun,
  Moon,
  Move,
  RotateCw,
  Maximize,
  Save,
  Download,
  Crosshair,
  Grid,
  Eye,
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  Copy,
  AlignVerticalJustifyStart,
  Palette,
  Play,
  Pause,
  Repeat,
  QrCode,
  Sparkles,
  Layers,
  Activity,
  LayoutGrid,
  Wrench,
  PanelsTopLeft,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { ArdyaWordmark } from '../components/ArdyaWordmark';
import { StudioAiChat } from '../components/studio/StudioAiChat';
import { StudioDownloadDialog } from '../components/studio/StudioDownloadDialog';
import { StudioGuideDialog } from '../components/studio/StudioGuideDialog';
import { StudioMotionRigDialog } from '../components/studio/StudioMotionRigDialog';
import { StudioPublishDialog, type StudioPublishOptions } from '../components/studio/StudioPublishDialog';

const PRIMARY_ID = 'primary';
const LOGO_ID = 'logo';

/** Only top-level scene roots carry `studioId` — never traverse into meshes (avoids wrong picks / duplicates). */
function findSceneRootByStudioId(root: THREE.Group | null, studioId: string): THREE.Object3D | null {
  if (!root) return null;
  for (let i = 0; i < root.children.length; i++) {
    const c = root.children[i];
    if (c.userData.studioId === studioId) return c;
  }
  return null;
}

export default function Studio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, updateProject, user } = useAppStore();
  const [projectTitle, setProjectTitle] = useState('');
  const project = projects.find((p) => p.id === id);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const contentRootRef = useRef<THREE.Group | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const pendingTransformsRef = useRef<Record<string, ReturnType<typeof readStudioTransform>>>({});

  const clockRef = useRef<THREE.Clock | null>(null);
  const mixersRef = useRef<Map<string, THREE.AnimationMixer>>(new Map());
  const pmremGeneratorRef = useRef<THREE.PMREMGenerator | null>(null);
  const envMapRef = useRef<THREE.Texture | null>(null);
  const arPreviewGridRef = useRef<THREE.GridHelper | null>(null);
  const selectionPrimedRef = useRef(false);
  const studioRigApplyRef = useRef<(elapsed: number) => void>(() => {});

  const glbInputRef = useRef<HTMLInputElement>(null);
  const hdrInputRef = useRef<HTMLInputElement>(null);
  const fuseInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fuseBusyRef = useRef(false);

  /** Bumps when Three.js scene is (re)created so effects re-run after Strict Mode remount. */
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const [sceneContentVersion, setSceneContentVersion] = useState(0);
  const loadRequestRef = useRef(0);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [activeTool, setActiveTool] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [lighting, setLighting] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [bgColor, setBgColor] = useState('#030014');
  const [selectionIds, setSelectionIds] = useState<string[]>([]);
  const [uiTheme, setUiTheme] = useState<'dark' | 'light'>('dark');
  const [snapTranslate, setSnapTranslate] = useState(0);
  const [snapRotateDeg, setSnapRotateDeg] = useState(0);
  const [snapScale, setSnapScale] = useState(0);
  const [snapSurface, setSnapSurface] = useState(false);
  const [arPlanePreview, setArPlanePreview] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [dirLightOn, setDirLightOn] = useState(true);
  const [physicsGravity, setPhysicsGravity] = useState(false);
  const [physicsCollision, setPhysicsCollision] = useState(false);
  const [animLoop, setAnimLoop] = useState(true);
  const [activeClipName, setActiveClipName] = useState<string | null>(null);
  const [animClipList, setAnimClipList] = useState<string[]>([]);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [perfStats, setPerfStats] = useState({ tris: 0, texBytes: 0 });
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem('visiarise-studio-hints') !== '1';
    } catch {
      return true;
    }
  });
  const [tfPos, setTfPos] = useState({ x: 0, y: 0, z: 0 });
  const [tfRotDeg, setTfRotDeg] = useState({ x: 0, y: 0, z: 0 });
  const [tfScale, setTfScale] = useState({ x: 1, y: 1, z: 1 });
  const [dimMeters, setDimMeters] = useState({ w: 0, h: 0, d: 0 });
  /** Target dimensions in inches (real-world AR sizing). */
  const [targetDimIn, setTargetDimIn] = useState({ w: '', h: '', d: '' });
  const [mobileTab, setMobileTab] = useState<'canvas' | 'tools' | 'scene' | 'ai'>('canvas');
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rigDialogOpen, setRigDialogOpen] = useState(false);
  /** Desktop (md+): inspector sidebar — default collapsed for max canvas. */
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [matColor, setMatColor] = useState('#ffffff');
  const [matRough, setMatRough] = useState(0.5);
  const [matMetal, setMatMetal] = useState(0);
  const logoScaleVal = project?.logoScale ?? 0.65;
  const logoOffsetVal = project?.logoOffsetY ?? 0.4;
  const [logoScaleUi, setLogoScaleUi] = useState(logoScaleVal);
  const [logoOffsetUi, setLogoOffsetUi] = useState(logoOffsetVal);
  /** Uniform scale for selected 3D object (main or fused layer), not logo. */
  const [uniformScaleUi, setUniformScaleUi] = useState(1);
  const [rigDraft, setRigDraft] = useState<StudioRigConfig>({
    enabled: false,
    mode: 'rotate',
    speed: 1,
    amplitude: 0.12,
  });

  useEffect(() => {
    if (project) setProjectTitle(project.name);
  }, [project?.id, project?.name]);

  useEffect(() => {
    if (project) setProjectDescription(project.description || '');
  }, [project?.id, project?.description]);

  useEffect(() => {
    setLogoScaleUi(project?.logoScale ?? 0.65);
    setLogoOffsetUi(project?.logoOffsetY ?? 0.4);
  }, [project?.id, project?.logoScale, project?.logoOffsetY]);

  const primarySource = project?.modelDataUrl || project?.modelUrl || '';
  const gizmoTargetId =
    selectionIds.length > 0 ? selectionIds[selectionIds.length - 1]! : '';

  useEffect(() => {
    if (!rigDialogOpen || !gizmoTargetId) return;
    const r = project?.studioRigs?.[gizmoTargetId];
    setRigDraft(
      r ?? {
        enabled: false,
        mode: 'rotate',
        speed: 1,
        amplitude: 0.12,
      }
    );
  }, [rigDialogOpen, gizmoTargetId, project?.studioRigs]);

  useEffect(() => {
    selectionPrimedRef.current = false;
    setSelectionIds([]);
  }, [id]);

  useEffect(() => {
    if (!primarySource) {
      setSelectionIds([]);
      selectionPrimedRef.current = false;
      return;
    }
    if (!selectionPrimedRef.current && selectionIds.length === 0) {
      setSelectionIds([PRIMARY_ID]);
      selectionPrimedRef.current = true;
    }
  }, [primarySource, selectionIds.length]);

  useEffect(() => {
    if (!id) return;
    const url = `${window.location.origin}/ar/${id}`;
    void QRCode.toDataURL(url, { width: 168, margin: 1, color: { dark: '#000000', light: '#ffffff' } }).then(
      setQrDataUrl
    );
  }, [id]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root || gizmoTargetId === LOGO_ID) {
      setUniformScaleUi(1);
      return;
    }
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    const s = target.scale;
    const u = (s.x + s.y + s.z) / 3;
    setUniformScaleUi(Number(Math.max(0.01, u).toFixed(3)));
  }, [gizmoTargetId, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root || !gizmoTargetId) {
      setTfPos({ x: 0, y: 0, z: 0 });
      setTfRotDeg({ x: 0, y: 0, z: 0 });
      setTfScale({ x: 1, y: 1, z: 1 });
      setDimMeters({ w: 0, h: 0, d: 0 });
      return;
    }
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    setTfPos({ x: target.position.x, y: target.position.y, z: target.position.z });
    setTfRotDeg({
      x: THREE.MathUtils.radToDeg(target.rotation.x),
      y: THREE.MathUtils.radToDeg(target.rotation.y),
      z: THREE.MathUtils.radToDeg(target.rotation.z),
    });
    setTfScale({ x: target.scale.x, y: target.scale.y, z: target.scale.z });
    const sz = getBoundingSize(target);
    setDimMeters({ w: sz.x, h: sz.y, d: sz.z });
  }, [gizmoTargetId, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root) return;
    setPerfStats({
      tris: countTriangles(root),
      texBytes: estimateTextureBytes(root),
    });
  }, [sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    const mesh = findFirstMesh(target);
    if (!mesh) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (mat && 'color' in mat && 'roughness' in mat) {
      const m = mat as THREE.MeshStandardMaterial;
      setMatColor('#' + m.color.getHexString());
      setMatRough(m.roughness);
      setMatMetal(m.metalness);
    }
  }, [gizmoTargetId, sceneContentVersion, sceneEpoch]);

  const extrasSerialized = project
    ? JSON.stringify(
        (project.studioExtras || []).map((x) => ({ id: x.id, u: x.modelDataUrl || x.modelUrl || '' }))
      )
    : '';
  const logoSerialized = project
    ? `${project.logoDataUrl || ''}|${logoScaleVal}|${logoOffsetVal}`
    : '';
  const transformsKey = project ? JSON.stringify(project.studioTransforms || {}) : '';

  // Three.js scene (once per mount; epoch signals Strict Mode remount to loaders)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    clockRef.current = new THREE.Clock();
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmremGeneratorRef.current = pmrem;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbitControlsRef.current = orbit;

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(1.12);
    transform.addEventListener('dragging-changed', (e) => {
      const ev = e as unknown as { value?: boolean };
      orbit.enabled = !ev.value;
    });
    scene.add(transform.getHelper());
    transformControlsRef.current = transform;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    ambientLightRef.current = ambient;
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    directional.castShadow = true;
    directionalLightRef.current = directional;
    scene.add(directional);

    const contentRoot = new THREE.Group();
    contentRoot.name = 'ContentRoot';
    scene.add(contentRoot);
    contentRootRef.current = contentRoot;

    const gridHelper = new THREE.GridHelper(20, 20, 0x7743db, 0x222222);
    gridHelperRef.current = gridHelper;

    const animate = () => {
      requestAnimationFrame(animate);
      const dt = clockRef.current?.getDelta() ?? 0;
      const elapsed = clockRef.current?.getElapsedTime() ?? 0;
      studioRigApplyRef.current(elapsed);
      mixersRef.current.forEach((m) => m.update(dt));
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    setSceneEpoch((e) => e + 1);

    return () => {
      resizeObserver.disconnect();
      mixersRef.current.forEach((m) => {
        m.stopAllAction();
      });
      mixersRef.current.clear();
      pmremGeneratorRef.current?.dispose();
      pmremGeneratorRef.current = null;
      clockRef.current = null;
      if (envMapRef.current) {
        envMapRef.current.dispose();
        envMapRef.current = null;
      }
      transformControlsRef.current?.dispose();
      renderer.dispose();
      scene.clear();
      contentRootRef.current = null;
      gridHelperRef.current = null;
      arPreviewGridRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      orbitControlsRef.current = null;
      transformControlsRef.current = null;
      ambientLightRef.current = null;
      directionalLightRef.current = null;
    };
  }, []);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(''), 2600);
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const grid = gridHelperRef.current;
    if (!scene || !grid) return;
    if (showGrid) scene.add(grid);
    else scene.remove(grid);
  }, [showGrid, sceneEpoch]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(bgColor);
  }, [bgColor, sceneEpoch]);

  useEffect(() => {
    const a = ambientLightRef.current;
    const d = directionalLightRef.current;
    if (!a || !d) return;
    a.intensity = 0.35 + lighting * 0.25;
    d.intensity = 0.45 + lighting * 0.55;
  }, [lighting, sceneEpoch]);

  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(activeTool);
    }
  }, [activeTool]);

  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;
    const onChange = () => {
      const o = tc.object;
      if (o && typeof o.userData.studioId === 'string') {
        pendingTransformsRef.current[o.userData.studioId] = readStudioTransform(o);
        setTfPos({ x: o.position.x, y: o.position.y, z: o.position.z });
        setTfRotDeg({
          x: THREE.MathUtils.radToDeg(o.rotation.x),
          y: THREE.MathUtils.radToDeg(o.rotation.y),
          z: THREE.MathUtils.radToDeg(o.rotation.z),
        });
        setTfScale({ x: o.scale.x, y: o.scale.y, z: o.scale.z });
        const sz = getBoundingSize(o);
        setDimMeters({ w: sz.x, h: sz.y, d: sz.z });
        if (!id) return;
        const p = useAppStore.getState().projects.find((x) => x.id === id);
        const rig = p?.studioRigs?.[o.userData.studioId];
        if (rig?.enabled && rig.mode !== 'none') {
          o.userData.rigBaseQuat = o.quaternion.clone();
          o.userData.rigBasePos = o.position.clone();
          o.userData.rigInit = true;
        }
      }
    };
    tc.addEventListener('objectChange', onChange);
    return () => tc.removeEventListener('objectChange', onChange);
  }, [sceneEpoch, id]);

  // Build scene meshes from project sources (deps avoid reloading on unrelated project edits)
  useEffect(() => {
    const req = ++loadRequestRef.current;
    if (!sceneRef.current || !contentRootRef.current || !transformControlsRef.current || !id) return;

    const run = async () => {
      const contentRoot = contentRootRef.current;
      const transformControls = transformControlsRef.current;
      const cam = cameraRef.current;
      const orbit = orbitControlsRef.current;
      const p = useAppStore.getState().projects.find((x) => x.id === id);
      if (!contentRoot || !transformControls || !p) return;

      const stale = () => req !== loadRequestRef.current;

      mixersRef.current.forEach((m) => m.stopAllAction());
      mixersRef.current.clear();

      transformControls.detach();
      while (contentRoot.children.length) {
        const c = contentRoot.children[0];
        contentRoot.remove(c);
      }

      const src = p.modelDataUrl || p.modelUrl || '';
      if (!src) {
        if (req === loadRequestRef.current) {
          setLoadError('');
          setSceneContentVersion((v) => v + 1);
        }
        return;
      }

      setLoadError('');
      try {
        const token = user?.token;
        const { scene: primary, animations: animPrimary } = p.modelDataUrl
          ? await loadGltfWithAnimations(p.modelDataUrl)
          : await loadGltfMeshyWithAnimations(p.modelUrl || '', token);
        if (stale()) return;
        primary.userData.studioId = PRIMARY_ID;
        primary.userData.animationClips = animPrimary;
        const mixerPrimary = new THREE.AnimationMixer(primary);
        primary.userData.mixer = mixerPrimary;
        mixersRef.current.set(PRIMARY_ID, mixerPrimary);
        const trP = p.studioTransforms?.[PRIMARY_ID];
        if (trP) applyStudioTransform(primary, trP);
        else centerObjectAtOrigin(primary);
        if (stale()) return;
        contentRoot.add(primary);

        let spread = 0;
        for (const ex of p.studioExtras || []) {
          if (stale()) return;
          const exSrc = ex.modelDataUrl || ex.modelUrl;
          if (!exSrc) continue;
          const { scene: g, animations: animEx } = ex.modelDataUrl
            ? await loadGltfWithAnimations(ex.modelDataUrl)
            : await loadGltfMeshyWithAnimations(ex.modelUrl || '', token);
          if (stale()) return;
          g.userData.studioId = ex.id;
          g.userData.animationClips = animEx;
          const mixerEx = new THREE.AnimationMixer(g);
          g.userData.mixer = mixerEx;
          mixersRef.current.set(ex.id, mixerEx);
          const tr = p.studioTransforms?.[ex.id];
          if (tr) applyStudioTransform(g, tr);
          else {
            spread += 1;
            g.position.x = spread * 2.2;
          }
          contentRoot.add(g);
        }

        if (p.logoDataUrl) {
          if (stale()) return;
          const tex = await new Promise<THREE.Texture>((resolve, reject) => {
            new THREE.TextureLoader().load(p.logoDataUrl!, resolve, undefined, reject);
          });
          if (stale()) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const img = tex.image as HTMLImageElement;
          const aspect = img?.width && img?.height ? img.width / img.height : 1;
          const sc = p.logoScale ?? 0.65;
          const geo = new THREE.PlaneGeometry(sc * aspect, sc);
          const mesh = new THREE.Mesh(geo, mat);
          const logoGroup = new THREE.Group();
          logoGroup.userData.studioId = LOGO_ID;
          logoGroup.add(mesh);

          const box = new THREE.Box3().setFromObject(contentRoot);
          const maxY = box.max.y;
          const off = p.logoOffsetY ?? 0.4;
          logoGroup.position.set(0, maxY + off, 0);
          const trL = p.studioTransforms?.[LOGO_ID];
          if (trL) applyStudioTransform(logoGroup, trL);
          contentRoot.add(logoGroup);
        }

        if (stale()) return;
        if (cam && orbit && contentRoot.children.length) {
          fitCameraToObject(cam, orbit, contentRoot);
        }

        for (let i = 0; i < contentRoot.children.length; i++) {
          const o = contentRoot.children[i];
          const sid = o.userData.studioId;
          if (sid && typeof sid === 'string' && p.studioRigs?.[sid]) {
            o.userData.rigInit = false;
            delete o.userData.rigBaseQuat;
            delete o.userData.rigBaseEuler;
            delete o.userData.rigBasePos;
          }
        }

        if (req === loadRequestRef.current) {
          setSceneContentVersion((v) => v + 1);
        }
      } catch (e) {
        console.error(e);
        if (req === loadRequestRef.current) {
          const msg =
            e instanceof Error
              ? e.message
              : 'Could not load this model. Upload a valid GLB/GLTF or pick a fresh asset.';
          setLoadError(msg.length > 180 ? `${msg.slice(0, 180)}…` : msg);
          setSceneContentVersion((v) => v + 1);
        }
      }
    };

    void run();
  }, [id, sceneEpoch, primarySource, extrasSerialized, logoSerialized, transformsKey, user?.token]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root) return;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material;
      const mats = Array.isArray(m) ? m : [m];
      mats.forEach((mat) => {
        if (mat && 'wireframe' in mat) {
          (mat as THREE.MeshStandardMaterial).wireframe = wireframeMode;
        }
      });
    });
  }, [wireframeMode, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    studioRigApplyRef.current = (t: number) => {
      if (!id) return;
      const root = contentRootRef.current;
      if (!root) return;
      const tc = transformControlsRef.current;
      const p = useAppStore.getState().projects.find((x) => x.id === id);
      const rigs = p?.studioRigs;
      if (!rigs) return;
      const qSpin = new THREE.Quaternion();
      const yAxis = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < root.children.length; i++) {
        const o = root.children[i];
        const sid = o.userData.studioId;
        if (!sid || typeof sid !== 'string') continue;
        if (tc?.dragging && tc.object === o) continue;
        const rig = rigs[sid];
        if (!rig?.enabled || rig.mode === 'none') continue;
        if (!o.userData.rigInit) {
          o.userData.rigBaseQuat = o.quaternion.clone();
          o.userData.rigBasePos = o.position.clone();
          o.userData.rigInit = true;
        }
        const baseQ = o.userData.rigBaseQuat as THREE.Quaternion;
        const baseP = o.userData.rigBasePos as THREE.Vector3;
        if (rig.mode === 'rotate') {
          qSpin.setFromAxisAngle(yAxis, t * rig.speed);
          o.quaternion.copy(baseQ).premultiply(qSpin);
        } else if (rig.mode === 'bob') {
          o.position.x = baseP.x;
          o.position.z = baseP.z;
          o.position.y = baseP.y + Math.sin(t * rig.speed) * rig.amplitude;
        }
      }
    };
  }, [id, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const tc = transformControlsRef.current;
    const root = contentRootRef.current;
    if (!tc || !root) return;
    const target = gizmoTargetId ? findSceneRootByStudioId(root, gizmoTargetId) : null;
    if (target) tc.attach(target);
    else tc.detach();
  }, [gizmoTargetId, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;
    tc.setTranslationSnap(snapTranslate > 0 ? snapTranslate : null);
    tc.setRotationSnap(snapRotateDeg > 0 ? THREE.MathUtils.degToRad(snapRotateDeg) : null);
    tc.setScaleSnap(snapScale > 0 ? snapScale : null);
  }, [snapTranslate, snapRotateDeg, snapScale, sceneEpoch]);

  useEffect(() => {
    const r = rendererRef.current;
    const d = directionalLightRef.current;
    if (!r || !d) return;
    r.shadowMap.enabled = shadowsEnabled;
    d.castShadow = shadowsEnabled && dirLightOn;
    d.visible = dirLightOn;
  }, [shadowsEnabled, dirLightOn, sceneEpoch]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const prev = arPreviewGridRef.current;
    if (prev) {
      scene.remove(prev);
      prev.dispose();
      arPreviewGridRef.current = null;
    }
    if (!arPlanePreview) return;
    const refGrid = new THREE.GridHelper(1, 10, 0x22c55e, 0x14532d);
    refGrid.position.y = 0.002;
    refGrid.name = 'AR1mRefGrid';
    scene.add(refGrid);
    arPreviewGridRef.current = refGrid;
  }, [arPlanePreview, sceneEpoch]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root || !gizmoTargetId || gizmoTargetId === LOGO_ID) {
      setActiveClipName(null);
      setAnimClipList([]);
      return;
    }
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    const clips = (target?.userData?.animationClips as THREE.AnimationClip[] | undefined) ?? [];
    setAnimClipList(clips.map((c) => c.name));
    setActiveClipName(clips[0]?.name ?? null);
    setAnimPlaying(false);
  }, [gizmoTargetId, sceneContentVersion, sceneEpoch]);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    const mixer = target?.userData?.mixer as THREE.AnimationMixer | undefined;
    const clips = (target?.userData?.animationClips as THREE.AnimationClip[]) ?? [];
    if (!mixer || !activeClipName || clips.length === 0) return;
    const clip = clips.find((c) => c.name === activeClipName);
    if (!clip) return;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    if (animLoop) {
      action.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      action.setLoop(THREE.LoopOnce, 1);
    }
    action.clampWhenFinished = !animLoop;
    if (animPlaying) {
      action.reset().play();
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [gizmoTargetId, activeClipName, animPlaying, animLoop, sceneContentVersion, sceneEpoch]);

  const handleSave = () => {
    if (!id || !project) return;
    setIsSaving(true);
    const name = projectTitle.trim() || project.name;
    const transforms = { ...project.studioTransforms, ...pendingTransformsRef.current };
    const desc = projectDescription.trim();
    updateProject(id, {
      name,
      studioTransforms: transforms,
      ...(desc !== (project.description || '') ? { description: desc } : {}),
    });
    window.setTimeout(() => setIsSaving(false), 500);
    showStatus('Project saved');
  };

  const saveRigToProject = () => {
    if (!id || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    updateProject(id, {
      studioRigs: {
        ...(project?.studioRigs || {}),
        [gizmoTargetId]: rigDraft,
      },
    });
    const r = contentRootRef.current;
    const node = r && gizmoTargetId ? findSceneRootByStudioId(r, gizmoTargetId) : null;
    if (node) {
      node.userData.rigInit = false;
      delete node.userData.rigBaseQuat;
      delete node.userData.rigBasePos;
    }
    showStatus('Motion rig saved');
  };

  const openPublishDialog = () => {
    if (!id || !contentRootRef.current) return;
    const root = contentRootRef.current;
    if (root.children.length === 0) {
      showStatus('Add a model before publishing');
      return;
    }
    if (!user?.token) {
      showStatus('Sign in to publish a shareable link');
      return;
    }
    setPublishDialogOpen(true);
  };

  const confirmPublishAr = async (opts: StudioPublishOptions) => {
    if (!id || !contentRootRef.current || !user?.token) return;
    const root = contentRootRef.current;
    setIsPublishing(true);
    try {
      const buffer = await exportObject3DToGlbArrayBuffer(root);
      await submitWebArPublish(id, buffer, opts, user.token);
      const dataUrl = arrayBufferToGlbDataUrl(buffer);
      updateProject(id, {
        modelDataUrl: dataUrl,
        modelUrl: undefined,
        status: 'published',
        arSharePublic: opts.arSharePublic,
        arPageTitle: opts.arPageTitle,
        arPageTagline: opts.arPageTagline,
        arCtaLabel: opts.arCtaLabel,
        arAccentHex: opts.arAccentHex,
      });
      setPublishDialogOpen(false);
      showStatus(opts.arSharePublic ? 'Live — share link & QR work for everyone' : 'Saved privately on your account');
      navigate(`/ar/${id}`);
    } catch (e) {
      console.error(e);
      const raw = e instanceof Error ? e.message : String(e);
      const actionable =
        raw.includes('Project not found') || raw.includes('Invalid project id')
          ? 'This project is not on the server. Open Dashboard (while signed in), create or pick a project, then publish again.'
          : `Publish failed — ${raw}`;
      showStatus(actionable);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyShareLink = async () => {
    if (!id) return;
    if (project && project.arSharePublic === false) {
      showStatus('Republish with “Public” so anyone can open this link');
      return;
    }
    const url = `${window.location.origin}/ar/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showStatus('Share link copied');
    } catch {
      showStatus('Copy blocked — copy URL manually');
    }
  };

  const openMarketplaceListing = () => {
    if (!id || !project) return;
    try {
      const modelUrl = project.modelUrl || project.modelDataUrl || '';
      sessionStorage.setItem(
        `visiarise-listing-${id}`,
        JSON.stringify({
          name: project.name || 'My AR model',
          description: project.description || '',
          modelUrl,
          thumb: project.thumbnailUrl || '',
        })
      );
    } catch {
      /* ignore */
    }
    navigate(`/marketplace?list=1&project=${encodeURIComponent(id)}`);
    showStatus('Opening marketplace — listing form prefilled');
  };

  const downloadMergedGlb = async () => {
    const root = contentRootRef.current;
    if (!root || root.children.length === 0) {
      showStatus('Nothing to export');
      return;
    }
    try {
      const dataUrl = await exportObject3DToGlbDataUrl(root);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(projectTitle || project?.name || 'scene').replace(/\s+/g, '-')}.glb`;
      a.click();
      showStatus('GLB downloaded');
    } catch (e) {
      console.error(e);
      showStatus('Download failed');
    }
  };

  const captureScreenshot = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectTitle || project?.name || 'viewport').replace(/\s+/g, '-')}.png`;
    a.click();
    showStatus('Screenshot saved');
  };

  const snapAllToGround = () => {
    const root = contentRootRef.current;
    if (!root) return;
    root.children.forEach((child) => {
      if (child.userData.studioId === LOGO_ID) return;
      const box = new THREE.Box3().setFromObject(child);
      child.position.y += -box.min.y;
    });
    root.children.forEach((o) => {
      const sid = o.userData.studioId;
      if (typeof sid === 'string') pendingTransformsRef.current[sid] = readStudioTransform(o);
    });
    showStatus('Models snapped to ground');
  };

  const onPrimaryGlb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !id) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProject(id, { modelDataUrl: reader.result as string, modelUrl: undefined });
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const onFuseGlb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !id || fuseBusyRef.current) return;
    fuseBusyRef.current = true;
    const reader = new FileReader();
    reader.onload = () => {
      fuseBusyRef.current = false;
      const cur = useAppStore.getState().projects.find((x) => x.id === id);
      const next: StudioExtraModel = {
        id: `layer-${Date.now()}`,
        name: f.name.replace(/\.[^/.]+$/, '') || 'Fused layer',
        modelDataUrl: reader.result as string,
      };
      updateProject(id, { studioExtras: [...(cur?.studioExtras || []), next] });
      showStatus('Model fused into scene');
    };
    reader.onerror = () => {
      fuseBusyRef.current = false;
      showStatus('Upload failed');
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const duplicateSelected = () => {
    if (!id || !project) return;
    const cur = useAppStore.getState().projects.find((x) => x.id === id);
    if (!cur) return;
    if (gizmoTargetId === PRIMARY_ID) {
      const src = cur.modelDataUrl || cur.modelUrl;
      if (!src) {
        showStatus('Nothing to duplicate');
        return;
      }
      const next: StudioExtraModel = {
        id: `layer-${Date.now()}`,
        name: `${cur.name || 'Model'} copy`,
        ...(cur.modelDataUrl ? { modelDataUrl: cur.modelDataUrl } : { modelUrl: cur.modelUrl }),
      };
      updateProject(id, { studioExtras: [...(cur.studioExtras || []), next] });
      showStatus('Duplicate added — select it in the list');
      return;
    }
    if (gizmoTargetId === LOGO_ID) {
      showStatus('Logo cannot be duplicated');
      return;
    }
    const ex = cur.studioExtras?.find((x) => x.id === gizmoTargetId);
    if (!ex) return;
    const copy: StudioExtraModel = {
      id: `layer-${Date.now()}`,
      name: `${ex.name} copy`,
      ...(ex.modelDataUrl ? { modelDataUrl: ex.modelDataUrl } : { modelUrl: ex.modelUrl }),
    };
    updateProject(id, { studioExtras: [...(cur.studioExtras || []), copy] });
    showStatus('Layer duplicated');
  };

  const applyUniformScale = (factor: number) => {
    const root = contentRootRef.current;
    const tc = transformControlsRef.current;
    if (!root || !tc || !gizmoTargetId) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target || gizmoTargetId === LOGO_ID) return;
    target.scale.setScalar(factor);
    pendingTransformsRef.current[gizmoTargetId] = readStudioTransform(target);
    tc.detach();
    tc.attach(target);
  };

  const onLogoImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !id) return;
    const reader = new FileReader();
    reader.onload = () => updateProject(id, { logoDataUrl: reader.result as string });
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const removeExtra = (extraId: string) => {
    if (!id) return;
    const cur = useAppStore.getState().projects.find((x) => x.id === id);
    if (!cur?.studioExtras) return;
    updateProject(id, { studioExtras: cur.studioExtras.filter((x) => x.id !== extraId) });
    setSelectionIds((prev) => {
      if (!prev.includes(extraId)) return prev;
      const n = prev.filter((x) => x !== extraId);
      return n.length === 0 && primarySource ? [PRIMARY_ID] : n;
    });
  };

  const removePrimaryModel = () => {
    if (!id) return;
    const cur = useAppStore.getState().projects.find((x) => x.id === id);
    if (!cur || !(cur.modelDataUrl || cur.modelUrl)) return;
    const st = { ...(cur.studioTransforms || {}) };
    delete st[PRIMARY_ID];
    const rigs = { ...(cur.studioRigs || {}) };
    delete rigs[PRIMARY_ID];
    updateProject(id, {
      modelUrl: null,
      modelDataUrl: null,
      thumbnailUrl: null,
      meshyPreviewTaskId: null,
      meshyTaskId: null,
      modelUrls: null,
      studioTransforms: st,
      studioRigs: rigs,
    });
    selectionPrimedRef.current = false;
    setSelectionIds((prev) => {
      if (!prev.includes(PRIMARY_ID)) return prev;
      const n = prev.filter((x) => x !== PRIMARY_ID);
      if (n.length > 0) return n;
      const firstEx = cur.studioExtras?.[0];
      if (firstEx) return [firstEx.id];
      if (cur.logoDataUrl) return [LOGO_ID];
      return [];
    });
    showStatus('Main model removed');
  };

  const clearLogo = () => {
    if (!id) return;
    updateProject(id, { logoDataUrl: undefined });
    setSelectionIds((prev) => {
      if (!prev.includes(LOGO_ID)) return prev;
      const n = prev.filter((x) => x !== LOGO_ID);
      return n.length === 0 && primarySource ? [PRIMARY_ID] : n;
    });
  };

  const resetCamera = () => {
    const root = contentRootRef.current;
    const cam = cameraRef.current;
    const orbit = orbitControlsRef.current;
    if (root && cam && orbit && root.children.length) fitCameraToObject(cam, orbit, root);
  };

  const applyNumericTransform = () => {
    const root = contentRootRef.current;
    const tc = transformControlsRef.current;
    if (!root || !tc || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    target.position.set(tfPos.x, tfPos.y, tfPos.z);
    target.rotation.set(
      THREE.MathUtils.degToRad(tfRotDeg.x),
      THREE.MathUtils.degToRad(tfRotDeg.y),
      THREE.MathUtils.degToRad(tfRotDeg.z)
    );
    target.scale.set(tfScale.x, tfScale.y, tfScale.z);
    pendingTransformsRef.current[gizmoTargetId] = readStudioTransform(target);
    tc.detach();
    tc.attach(target);
    const sz = getBoundingSize(target);
    setDimMeters({ w: sz.x, h: sz.y, d: sz.z });
  };

  const normalizeHeightToMeter = () => {
    const root = contentRootRef.current;
    const tc = transformControlsRef.current;
    if (!root || !tc || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    const sz = getBoundingSize(target);
    const h = Math.max(sz.y, 0.0001);
    const factor = 1 / h;
    target.scale.multiplyScalar(factor);
    pendingTransformsRef.current[gizmoTargetId] = readStudioTransform(target);
    tc.detach();
    tc.attach(target);
    const sz2 = getBoundingSize(target);
    setDimMeters({ w: sz2.x, h: sz2.y, d: sz2.z });
    showStatus(`Normalized height to 1 m (~${metersToInches(1).toFixed(1)} in)`);
  };

  const applyDimensionTargets = () => {
    const root = contentRootRef.current;
    const tc = transformControlsRef.current;
    if (!root || !tc || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    const sz = getBoundingSize(target);
    const twIn = parseFloat(targetDimIn.w);
    const thIn = parseFloat(targetDimIn.h);
    const tdIn = parseFloat(targetDimIn.d);
    if (!Number.isFinite(twIn) && !Number.isFinite(thIn) && !Number.isFinite(tdIn)) {
      showStatus('Enter at least one width, height, or depth (inches)');
      return;
    }
    const twM = Number.isFinite(twIn) && twIn > 0 ? inchesToMeters(twIn) : null;
    const thM = Number.isFinite(thIn) && thIn > 0 ? inchesToMeters(thIn) : null;
    const tdM = Number.isFinite(tdIn) && tdIn > 0 ? inchesToMeters(tdIn) : null;
    const sx = twM != null ? twM / Math.max(sz.x, 0.0001) : 1;
    const sy = thM != null ? thM / Math.max(sz.y, 0.0001) : 1;
    const sz_ = tdM != null ? tdM / Math.max(sz.z, 0.0001) : 1;
    target.scale.multiply(new THREE.Vector3(sx, sy, sz_));
    pendingTransformsRef.current[gizmoTargetId] = readStudioTransform(target);
    tc.detach();
    tc.attach(target);
    const sz2 = getBoundingSize(target);
    setDimMeters({ w: sz2.x, h: sz2.y, d: sz2.z });
    showStatus('Dimensions applied (inches → scene meters)');
  };

  const onHdrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const pmrem = pmremGeneratorRef.current;
    if (!f || !scene || !renderer || !pmrem) return;
    const url = URL.createObjectURL(f);
    const loader = new RGBELoader();
    loader.load(
      url,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const env = pmrem.fromEquirectangular(tex).texture;
        if (envMapRef.current) envMapRef.current.dispose();
        envMapRef.current = env;
        scene.environment = env;
        tex.dispose();
        URL.revokeObjectURL(url);
        showStatus('HDRI environment loaded');
      },
      undefined,
      () => {
        URL.revokeObjectURL(url);
        showStatus('Could not load HDRI');
      }
    );
    e.target.value = '';
  };

  const clearEnvironment = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.environment = null;
    if (envMapRef.current) {
      envMapRef.current.dispose();
      envMapRef.current = null;
    }
    showStatus('Environment cleared');
  };

  const onViewportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f || !id) return;
    const name = f.name.toLowerCase();
    if (name.endsWith('.glb') || name.endsWith('.gltf')) {
      const reader = new FileReader();
      reader.onload = () => {
        updateProject(id, { modelDataUrl: reader.result as string, modelUrl: undefined });
        showStatus('GLB set as main model');
      };
      reader.readAsDataURL(f);
      return;
    }
    if (/\.(png|jpg|jpeg|webp|gif)$/.test(name)) {
      const reader = new FileReader();
      reader.onload = () => {
        updateProject(id, { logoDataUrl: reader.result as string });
        showStatus('Image set as logo');
      };
      reader.readAsDataURL(f);
      return;
    }
    showStatus('Drop GLB/GLTF or an image — video/audio coming soon');
  };

  const applyMaterialValues = (color: string, rough: number, metal: number) => {
    const root = contentRootRef.current;
    if (!root || !gizmoTargetId || gizmoTargetId === LOGO_ID) return;
    const target = findSceneRootByStudioId(root, gizmoTargetId);
    if (!target) return;
    const mesh = findFirstMesh(target);
    if (!mesh) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (mat && 'color' in mat && 'roughness' in mat) {
      const m = mat as THREE.MeshStandardMaterial;
      m.color.set(color);
      m.roughness = rough;
      m.metalness = metal;
      m.needsUpdate = true;
    }
  };

  if (!project) return <div className="p-10 text-white">Project not found.</div>;

  const hierarchyEntries: { id: string; label: string; kind: 'primary' | 'extra' | 'logo' }[] = [
    ...(primarySource ? [{ id: PRIMARY_ID, label: 'Main model', kind: 'primary' as const }] : []),
    ...(project.studioExtras || []).map((ex) => ({
      id: ex.id,
      label: ex.name,
      kind: 'extra' as const,
    })),
    ...(project.logoDataUrl ? [{ id: LOGO_ID, label: 'Logo / image', kind: 'logo' as const }] : []),
  ];

  const themeMuted = uiTheme === 'light' ? 'text-zinc-500' : 'text-white/40';
  const themeInk = uiTheme === 'light' ? 'text-zinc-900' : 'text-white';
  const themeHeader = uiTheme === 'light' ? 'border-zinc-200 bg-white/80' : 'border-white/5 bg-black/40';
  const themeAside = uiTheme === 'light' ? 'border-zinc-200 bg-white/70' : 'border-white/5 bg-black/40';
  const themeTools = uiTheme === 'light' ? 'border-zinc-200 bg-white/90' : 'border-white/5 bg-black/50';
  const themeViewport = uiTheme === 'light' ? 'bg-zinc-200' : 'bg-[#0a0a0a]';
  const hiSel = (entryId: string) =>
    selectionIds.includes(entryId)
      ? 'bg-brand-primary/10 border-brand-primary/30'
      : uiTheme === 'light'
        ? 'bg-white border-zinc-200 hover:border-zinc-300'
        : 'bg-white/5 border-white/5 hover:border-white/10';

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${uiTheme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-[#050505] text-white'}`}
    >
      <input ref={hdrInputRef} type="file" accept=".hdr,.hdri" className="hidden" onChange={onHdrFile} />
      <header className={`min-h-14 sm:h-16 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between gap-2 px-3 sm:px-6 py-2 sm:py-0 border-b backdrop-blur-md z-20 ${themeHeader}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/project/${id}`}
            className={`p-2 rounded-full transition-colors shrink-0 ${uiTheme === 'light' ? 'hover:bg-zinc-200' : 'hover:bg-white/5'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${themeMuted}`} />
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <ArdyaWordmark className="text-sm shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={() => {
                  const t = projectTitle.trim();
                  if (t && id) updateProject(id, { name: t });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Name your project"
                className={`w-full max-w-[140px] sm:max-w-xs bg-transparent border-none outline-none text-sm font-bold tracking-tight truncate placeholder:opacity-40 ${themeInk}`}
                aria-label="Project name"
              />
              <p className={`text-[10px] uppercase tracking-widest font-bold ${themeMuted}`}>AR Studio</p>
            </div>
          </div>
        </div>

        {(statusMsg || loadError) && (
          <div
            className={`hidden md:block text-[10px] font-bold uppercase tracking-wider max-w-[220px] truncate ${
              loadError ? 'text-red-500' : 'text-brand-primary'
            }`}
          >
            {loadError || statusMsg}
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap sm:flex-wrap justify-start sm:justify-end overflow-x-auto max-w-[100vw] pb-0.5 sm:pb-0 [-webkit-overflow-scrolling:touch]">
          <input
            ref={glbInputRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            className="hidden"
            onChange={onPrimaryGlb}
          />
          <input ref={fuseInputRef} type="file" accept=".glb,.gltf" className="hidden" onChange={onFuseGlb} />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onLogoImage}
          />

          <button
            type="button"
            onClick={() => glbInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] sm:text-xs font-bold hover:opacity-90 ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100' : 'border-white/15 text-white/80 hover:bg-white/5'}`}
            title="Replace main GLB"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">GLB</span>
          </button>
          <button
            type="button"
            onClick={() => fuseInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] sm:text-xs font-bold hover:opacity-90 ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100' : 'border-white/15 text-white/80 hover:bg-white/5'}`}
            title="Fuse another GLB into this scene"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Fuse</span>
          </button>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] sm:text-xs font-bold hover:opacity-90 ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100' : 'border-white/15 text-white/80 hover:bg-white/5'}`}
            title="Add logo image above the model"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setUiTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className={`p-2 transition-colors ${uiTheme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}
            title={uiTheme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {uiTheme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button
            type="button"
            onClick={() => hdrInputRef.current?.click()}
            className={`p-2 transition-colors ${uiTheme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}
            title="Load HDRI environment (.hdr)"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={copyShareLink}
            className={`p-2 transition-colors ${uiTheme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}
            title="Copy AR share link"
          >
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => setDownloadDialogOpen(true)}
            className={`p-2 transition-colors ${uiTheme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}
            title="Download & export"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={openMarketplaceListing}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-bold ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800' : 'border-white/15 text-white/80'}`}
            title="List this project on the marketplace (prefills title & description)"
          >
            <Store className="w-3.5 h-3.5" />
            Sell
          </button>
          <button
            type="button"
            onClick={() => setAiDialogOpen(true)}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-bold ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800' : 'border-white/15 text-white/80'}`}
            title="AI generate & chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI
          </button>
          <button
            type="button"
            onClick={() => setRigDialogOpen(true)}
            disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-bold disabled:opacity-30 ${uiTheme === 'light' ? 'border-zinc-300 text-zinc-800' : 'border-white/15 text-white/80'}`}
            title="Motion rig (preview)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rig
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className={`p-2 transition-colors ${uiTheme === 'light' ? 'text-zinc-500 hover:text-zinc-900' : 'text-white/50 hover:text-white'}`}
            title="Studio guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <div className={`w-px h-6 mx-1 hidden sm:block ${uiTheme === 'light' ? 'bg-zinc-300' : 'bg-white/5'}`} />

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 sm:px-6 py-2 bg-brand-primary text-black rounded-full text-[10px] sm:text-xs font-bold hover:bg-brand-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            <span className="hidden sm:inline">{isSaving ? 'Saving…' : 'Save'}</span>
          </button>
          <button
            type="button"
            onClick={openPublishDialog}
            disabled={isPublishing}
            className="px-4 sm:px-6 py-2 bg-white text-black rounded-full text-[10px] sm:text-xs font-bold hover:bg-white/90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Maximize className="w-3 h-3" />
            <span className="hidden sm:inline">{isPublishing ? 'Export…' : 'Publish AR'}</span>
          </button>
        </div>
      </header>

      {(loadError || statusMsg) && (
        <div className="md:hidden px-4 py-2 text-[10px] font-bold uppercase border-b border-white/5 text-center bg-black/30">
          <span className={loadError ? 'text-red-400' : 'text-brand-primary'}>{loadError || statusMsg}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Mobile: gizmo tools only on Tools tab */}
        <aside
          className={`md:hidden flex-row items-center gap-1 overflow-x-auto shrink-0 border-b px-2 py-2 z-10 [-webkit-overflow-scrolling:touch] ${themeTools} ${
            mobileTab === 'tools' ? 'flex' : 'hidden'
          }`}
        >
          {(
            [
              { id: 'translate' as const, icon: Move, label: 'Move' },
              { id: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
              { id: 'scale' as const, icon: Maximize, label: 'Scale' },
            ] as const
          ).map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`p-2.5 rounded-lg shrink-0 ${
                activeTool === tool.id
                  ? 'bg-brand-primary text-black'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              aria-label={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-8 bg-white/10 mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 rounded-lg shrink-0 ${showGrid ? 'text-brand-primary' : 'text-white/40'}`}
            aria-label="Toggle grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`p-2.5 rounded-lg shrink-0 ${wireframeMode ? 'text-brand-primary' : 'text-white/40'}`}
            aria-label="Wireframe"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={snapAllToGround}
            className="p-2.5 rounded-lg shrink-0 text-white/40"
            aria-label="Snap to ground"
          >
            <AlignVerticalJustifyStart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetCamera}
            className="p-2.5 rounded-lg shrink-0 text-white/40"
            aria-label="Reset camera"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </aside>

        <aside
          className={`hidden md:flex w-14 sm:w-16 border-r flex-col items-center py-4 sm:py-6 gap-3 z-10 shrink-0 ${themeTools}`}
        >
          {(
            [
              { id: 'translate' as const, icon: Move, label: 'Move' },
              { id: 'rotate' as const, icon: RotateCw, label: 'Rotate' },
              { id: 'scale' as const, icon: Maximize, label: 'Scale' },
            ] as const
          ).map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`p-2.5 sm:p-3 rounded-xl transition-all group relative ${
                activeTool === tool.id
                  ? 'bg-brand-primary text-black'
                  : 'text-white/20 hover:text-white hover:bg-white/5'
              }`}
            >
              <tool.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute left-14 px-2 py-1 rounded bg-black border border-white/10 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tool.label}
              </span>
            </button>
          ))}
          <div className="w-8 h-px bg-white/5 my-1" />
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2.5 sm:p-3 rounded-xl transition-all group relative ${
              showGrid ? 'text-brand-primary' : 'text-white/20 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle grid"
          >
            <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`p-2.5 sm:p-3 rounded-xl transition-all group relative ${
              wireframeMode ? 'text-brand-primary' : 'text-white/20 hover:text-white hover:bg-white/5'
            }`}
            title="Wireframe mode"
          >
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={snapAllToGround}
            className="p-2.5 sm:p-3 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all group relative"
            title="Snap models to ground"
          >
            <AlignVerticalJustifyStart className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={resetCamera}
            className="p-2.5 sm:p-3 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all group relative"
            title="Reset camera"
          >
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </aside>

        <div className="relative flex flex-1 min-h-0 min-w-0 flex-col md:flex-row">
        <main
          ref={containerRef}
          className={`relative min-w-0 md:flex-1 ${themeViewport} ${
            mobileTab === 'scene' || mobileTab === 'ai'
              ? 'h-[min(38vh,320px)] shrink-0 md:h-auto md:min-h-0'
              : 'flex-1 min-h-[min(50vh,480px)] md:min-h-0'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={onViewportDrop}
          title="Drop GLB/GLTF or image to import"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {gizmoTargetId && gizmoTargetId !== LOGO_ID && dimMeters.w > 0 ? (
            <div className="absolute top-14 sm:top-16 right-3 max-w-[min(92vw,280px)] rounded-xl px-3 py-2 bg-black/55 backdrop-blur-md border border-white/10 text-[10px] font-mono leading-snug text-white/90 pointer-events-none">
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-primary/90 mb-1">Real size (AR)</p>
              <p>{formatDimsInches(dimMeters.w, dimMeters.h, dimMeters.d)}</p>
              <p className="text-white/50 mt-0.5">
                {dimMeters.w.toFixed(3)} × {dimMeters.h.toFixed(3)} × {dimMeters.d.toFixed(3)} m
              </p>
              <p className="text-white/40 text-[9px] mt-1">1 scene unit = 1 meter</p>
            </div>
          ) : null}

          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex flex-wrap items-center gap-3">
            <div className="px-3 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Live</span>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-wider cursor-pointer">
              <Palette className="w-3.5 h-3.5" />
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-7 h-5 rounded border-0 p-0 bg-transparent cursor-pointer"
                title="Viewport background"
              />
            </label>
          </div>

          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-center gap-6 max-w-[95vw]">
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-white/40 shrink-0" />
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={lighting}
                onChange={(e) => setLighting(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-brand-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                aria-label="Lighting"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspectorOpen((o) => !o)}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-30 w-9 h-14 items-center justify-center rounded-l-lg border border-white/15 bg-black/55 backdrop-blur-md shadow-lg transition-colors ${
              uiTheme === 'light'
                ? 'text-zinc-700 hover:bg-white/90 hover:text-zinc-900'
                : 'text-white/90 hover:bg-white/10'
            }`}
            title={inspectorOpen ? 'Hide scene panel' : 'Show scene panel'}
            aria-expanded={inspectorOpen}
            aria-label={inspectorOpen ? 'Hide scene panel' : 'Show scene panel'}
          >
            {inspectorOpen ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </main>

        {mobileTab === 'ai' && id ? (
          <div
            className={`md:hidden flex-1 flex flex-col min-h-0 border-t overflow-hidden ${themeAside}`}
          >
            <StudioAiChat
              projectId={id}
              compact
              themeMuted={themeMuted}
              themeInk={themeInk}
              uiTheme={uiTheme}
              onModelReady={() => setSceneContentVersion((v) => v + 1)}
            />
          </div>
        ) : null}

        <aside
          className={`w-full flex-col z-10 shrink-0 border-t md:border-t-0 max-h-[min(42vh,320px)] md:max-h-none md:self-stretch md:transition-[width,opacity] md:duration-200 md:ease-out ${themeAside} ${
            mobileTab === 'scene' ? 'flex flex-1 min-h-0 overflow-hidden' : 'hidden'
          } md:flex md:min-h-0 ${
            inspectorOpen
              ? 'md:w-80 md:border-l md:opacity-100 md:pointer-events-auto'
              : 'md:w-0 md:min-w-0 md:max-w-0 md:overflow-hidden md:border-0 md:opacity-0 md:pointer-events-none'
          }`}
        >
          <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-8">
            {showOnboarding ? (
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(true);
                  try {
                    localStorage.setItem('visiarise-studio-hints', '1');
                  } catch {
                    /* ignore */
                  }
                  setShowOnboarding(false);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] ${uiTheme === 'light' ? 'border-amber-300 bg-amber-50' : 'border-amber-500/30 bg-amber-500/10'}`}
              >
                <span className="font-bold text-brand-primary">New here?</span> Open the full guide — tap{' '}
                <HelpCircle className="inline w-3.5 h-3.5" /> in the header.
              </button>
            ) : null}

            <div>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 ${themeMuted}`}>Description</h2>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                onBlur={() => {
                  if (!id) return;
                  const t = projectDescription.trim();
                  if (t !== (project.description || '')) updateProject(id, { description: t });
                }}
                placeholder="Describe this AR experience for your team…"
                rows={3}
                className={`w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs resize-none ${themeInk}`}
              />
            </div>

            <div>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeMuted}`}>Scene hierarchy</h2>
              <div className="space-y-2">
                {hierarchyEntries.length === 0 && (
                  <p className={`text-xs py-6 text-center ${uiTheme === 'light' ? 'text-zinc-400' : 'text-white/35'}`}>
                    Upload a GLB to start.
                  </p>
                )}
                {hierarchyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${hiSel(entry.id)}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) {
                        setSelectionIds((prev) =>
                          prev.includes(entry.id) ? prev.filter((x) => x !== entry.id) : [...prev, entry.id]
                        );
                      } else {
                        setSelectionIds([entry.id]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectionIds([entry.id]);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Box className="w-4 h-4 text-brand-primary shrink-0" />
                      <span className={`text-sm font-medium truncate opacity-90 ${themeInk}`}>{entry.label}</span>
                    </div>
                    {entry.kind === 'primary' && (
                      <button
                        type="button"
                        className="text-white/30 hover:text-red-400 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrimaryModel();
                        }}
                        aria-label="Remove main model"
                        title="Remove main model"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {entry.kind === 'extra' && (
                      <button
                        type="button"
                        className="text-white/30 hover:text-red-400 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExtra(entry.id);
                        }}
                        aria-label="Remove layer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {entry.kind === 'logo' && (
                      <button
                        type="button"
                        className="text-white/30 hover:text-red-400 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearLogo();
                        }}
                        aria-label="Remove logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => fuseInputRef.current?.click()}
                className={`w-full mt-3 py-3 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest ${
                  uiTheme === 'light'
                    ? 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400'
                    : 'border-white/15 text-white/40 hover:text-white hover:border-white/25'
                }`}
              >
                <Plus className="w-4 h-4" />
                Fuse model
              </button>
              <p className={`text-[9px] mt-2 ${themeMuted}`} title="Grouping / parenting">
                Grouping &amp; FBX/video import: planned · hierarchy supports Cmd/Ctrl multi-select.
              </p>
            </div>

            <details className="group" open>
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Snap &amp; precision
              </summary>
              <div className={`mt-3 space-y-3 text-[11px] ${uiTheme === 'light' ? 'text-zinc-700' : 'text-white/70'}`}>
                <label className="flex flex-col gap-1">
                  <span className={themeMuted}>Grid move snap (units)</span>
                  <select
                    value={snapTranslate}
                    onChange={(e) => setSnapTranslate(parseFloat(e.target.value))}
                    className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                  >
                    <option value={0}>Off</option>
                    <option value={0.1}>0.1</option>
                    <option value={0.25}>0.25</option>
                    <option value={0.5}>0.5</option>
                    <option value={1}>1</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={themeMuted}>Angle snap (°)</span>
                  <select
                    value={snapRotateDeg}
                    onChange={(e) => setSnapRotateDeg(parseFloat(e.target.value))}
                    className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                  >
                    <option value={0}>Off</option>
                    <option value={5}>5</option>
                    <option value={15}>15</option>
                    <option value={45}>45</option>
                    <option value={90}>90</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={themeMuted}>Scale snap</span>
                  <select
                    value={snapScale}
                    onChange={(e) => setSnapScale(parseFloat(e.target.value))}
                    className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                  >
                    <option value={0}>Off</option>
                    <option value={0.05}>0.05</option>
                    <option value={0.1}>0.1</option>
                    <option value={0.25}>0.25</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 cursor-pointer opacity-60" title="Surface snap requires hit-testing (planned)">
                  <input type="checkbox" checked={snapSurface} onChange={(e) => setSnapSurface(e.target.checked)} />
                  Surface snap (preview)
                </label>
              </div>
            </details>

            <div>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeMuted}`}>Selected object scale</h2>
              <p className={`text-[10px] mb-3 ${uiTheme === 'light' ? 'text-zinc-500' : 'text-white/35'}`}>
                Uniform scale for the gizmo target (main or fused layer). Use left toolbar for axis gizmos.
              </p>
              <div className="mb-1 flex justify-between text-[9px] font-mono text-white/45">
                <span>Uniform</span>
                <span>{uniformScaleUi.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={5}
                step={0.02}
                value={Math.min(5, Math.max(0.05, uniformScaleUi))}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setUniformScaleUi(v);
                  applyUniformScale(v);
                }}
                disabled={gizmoTargetId === LOGO_ID || !primarySource}
                className="w-full accent-brand-primary h-1 bg-white/10 rounded-full"
              />
            </div>

            <details className="group" open>
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Move className="w-3.5 h-3.5" />
                Transform (numeric)
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <p className={themeMuted}>Applies to gizmo target. Units match the scene.</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['x', 'y', 'z'] as const).map((ax) => (
                    <label key={`p-${ax}`} className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold">{ax} pos</span>
                      <input
                        type="number"
                        step={0.01}
                        value={tfPos[ax]}
                        onChange={(e) => setTfPos((p) => ({ ...p, [ax]: parseFloat(e.target.value) || 0 }))}
                        disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                        className="rounded border px-1 py-1 text-xs bg-transparent"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['x', 'y', 'z'] as const).map((ax) => (
                    <label key={`r-${ax}`} className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold">rot {ax}°</span>
                      <input
                        type="number"
                        step={1}
                        value={tfRotDeg[ax]}
                        onChange={(e) => setTfRotDeg((p) => ({ ...p, [ax]: parseFloat(e.target.value) || 0 }))}
                        disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                        className="rounded border px-1 py-1 text-xs bg-transparent"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['x', 'y', 'z'] as const).map((ax) => (
                    <label key={`s-${ax}`} className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold">scl {ax}</span>
                      <input
                        type="number"
                        step={0.01}
                        min={0.001}
                        value={tfScale[ax]}
                        onChange={(e) => setTfScale((p) => ({ ...p, [ax]: parseFloat(e.target.value) || 0.001 }))}
                        disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                        className="rounded border px-1 py-1 text-xs bg-transparent"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={applyNumericTransform}
                  disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                  className="w-full py-2 rounded-lg bg-brand-primary text-black text-xs font-bold uppercase disabled:opacity-30"
                >
                  Apply transform
                </button>
              </div>
            </details>

            <details className="group" open>
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Maximize className="w-3.5 h-3.5" />
                Real-world scale
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <p className={themeMuted}>
                  Sizes use <strong>inches</strong> for real-world AR (internally 1 unit = 1 meter). Auto-fit sets
                  height to 1 m (~39.37 in).
                </p>
                <p className="font-mono text-[10px]">
                  {formatDimsInches(dimMeters.w, dimMeters.h, dimMeters.d)}
                </p>
                <p className="font-mono text-[10px] text-white/50">
                  {dimMeters.w.toFixed(3)} × {dimMeters.h.toFixed(3)} × {dimMeters.d.toFixed(3)} m
                </p>
                <button
                  type="button"
                  onClick={normalizeHeightToMeter}
                  disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                  className="w-full py-2 rounded-lg border border-white/15 text-xs font-bold uppercase hover:bg-white/5 disabled:opacity-30"
                >
                  Normalize height to 1 unit
                </button>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={arPlanePreview}
                    onChange={(e) => setArPlanePreview(e.target.checked)}
                  />
                  AR plane preview (1 m reference grid)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['w', 'h', 'd'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase">{k} (in)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 12"
                        value={targetDimIn[k]}
                        onChange={(e) => setTargetDimIn((d) => ({ ...d, [k]: e.target.value }))}
                        className="rounded border px-1 py-1 text-xs bg-transparent"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={applyDimensionTargets}
                  disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                  className="w-full py-2 rounded-lg border border-white/15 text-xs font-bold uppercase hover:bg-white/5 disabled:opacity-30"
                >
                  Apply target W×H×D
                </button>
              </div>
            </details>

            <details className="group" open>
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Palette className="w-3.5 h-3.5" />
                Material (PBR)
              </summary>
              <div className={`mt-3 space-y-3 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <p className={themeMuted}>First mesh with MeshStandardMaterial on the selected object.</p>
                <label className="flex items-center gap-2">
                  <span className="w-14">Color</span>
                  <input
                    type="color"
                    value={matColor}
                    onChange={(e) => {
                      const c = e.target.value;
                      setMatColor(c);
                      applyMaterialValues(c, matRough, matMetal);
                    }}
                    disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                    className="h-8 w-14 rounded border-0 bg-transparent cursor-pointer"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={themeMuted}>Roughness</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={matRough}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMatRough(v);
                      applyMaterialValues(matColor, v, matMetal);
                    }}
                    disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                    className="w-full accent-brand-primary h-1 bg-white/10 rounded-full"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={themeMuted}>Metalness</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={matMetal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setMatMetal(v);
                      applyMaterialValues(matColor, matRough, v);
                    }}
                    disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                    className="w-full accent-brand-primary h-1 bg-white/10 rounded-full"
                  />
                </label>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Sun className="w-3.5 h-3.5" />
                Lighting &amp; shadows
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dirLightOn}
                    onChange={(e) => setDirLightOn(e.target.checked)}
                  />
                  Directional light
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shadowsEnabled}
                    onChange={(e) => setShadowsEnabled(e.target.checked)}
                  />
                  Cast shadows
                </label>
                <p className={themeMuted}>HDRIs load from the header sparkle button.</p>
                <button
                  type="button"
                  onClick={clearEnvironment}
                  className="w-full py-2 rounded-lg border border-white/15 text-xs font-bold uppercase hover:bg-white/5"
                >
                  Clear HDRI environment
                </button>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Play className="w-3.5 h-3.5" />
                Animation
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                {animClipList.length === 0 ? (
                  <p className={themeMuted}>No clips on this selection (or logo selected).</p>
                ) : (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className={themeMuted}>Clip</span>
                      <select
                        value={activeClipName ?? ''}
                        onChange={(e) => setActiveClipName(e.target.value || null)}
                        className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
                      >
                        {animClipList.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnimPlaying((p) => !p)}
                        className="flex-1 py-2 rounded-lg bg-brand-primary text-black text-xs font-bold uppercase flex items-center justify-center gap-1"
                      >
                        {animPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {animPlaying ? 'Pause' : 'Play'}
                      </button>
                      <label className="flex items-center gap-2 px-2 border rounded-lg border-white/15">
                        <input type="checkbox" checked={animLoop} onChange={(e) => setAnimLoop(e.target.checked)} />
                        <Repeat className="w-3.5 h-3.5" />
                        Loop
                      </label>
                    </div>
                    <p className={themeMuted}>Rigged GLB/FBX skeleton: supported via GLB clips in this pipeline.</p>
                    <p className={themeMuted}>Keyframe timeline editor: planned.</p>
                  </>
                )}
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Box className="w-3.5 h-3.5" />
                AR &amp; anchors
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-700' : 'text-white/70'}`}>
                <p className={themeMuted}>
                  Published WebAR uses plane placement on supported devices. Horizontal / vertical plane hints and
                  image / face anchors are configured in the runtime viewer; editor wiring is planned.
                </p>
                <label className="flex items-center gap-2 opacity-70">
                  <input type="checkbox" defaultChecked readOnly />
                  Surface placement (default)
                </label>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Activity className="w-3.5 h-3.5" />
                Interaction &amp; gestures
              </summary>
              <div className={`mt-3 space-y-3 text-[11px] ${uiTheme === 'light' ? 'text-zinc-700' : 'text-white/70'}`}>
                <p className={themeMuted}>
                  Runtime: tap, drag, pinch, rotate on touch devices. Event hooks (onClick, onHover, onEnterView) are
                  exposed in the AR viewer pipeline for deployed scenes.
                </p>
                <p className="font-mono text-[10px] opacity-70">
                  {`events: { onClick, onHover, onEnterView }`}
                </p>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Physics (optional)
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <label className="flex items-center gap-2 cursor-pointer opacity-80">
                  <input
                    type="checkbox"
                    checked={physicsGravity}
                    onChange={(e) => setPhysicsGravity(e.target.checked)}
                  />
                  Gravity preview (editor stub)
                </label>
                <label className="flex items-center gap-2 cursor-pointer opacity-80">
                  <input
                    type="checkbox"
                    checked={physicsCollision}
                    onChange={(e) => setPhysicsCollision(e.target.checked)}
                  />
                  Collision detection (editor stub)
                </label>
                <p className={themeMuted}>Full physics export is not baked into GLB yet.</p>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <Eye className="w-3.5 h-3.5" />
                Performance &amp; LOD
              </summary>
              <div className={`mt-3 space-y-2 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <p className="font-mono text-[10px]">
                  Triangles: {perfStats.tris.toLocaleString()} · Tex ~{(perfStats.texBytes / (1024 * 1024)).toFixed(1)}{' '}
                  MB
                </p>
                {perfStats.tris > 100000 ? (
                  <p className="text-amber-500 text-[10px] font-bold">High poly count — consider decimation or LOD.</p>
                ) : null}
                {perfStats.texBytes > 50 * 1024 * 1024 ? (
                  <p className="text-amber-500 text-[10px] font-bold">Large texture footprint — compress maps.</p>
                ) : null}
                <p className={themeMuted}>LOD: mesh simplification at export is planned.</p>
              </div>
            </details>

            <details className="group">
              <summary
                className={`text-xs font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 ${themeMuted}`}
              >
                <QrCode className="w-3.5 h-3.5" />
                Export &amp; mobile preview
              </summary>
              <div className={`mt-3 space-y-3 text-[11px] ${uiTheme === 'light' ? 'text-zinc-800' : 'text-white/80'}`}>
                <p className={themeMuted}>
                  After you publish, your QR points to your site. Choose <strong>Public</strong> in the publish dialog
                  so anyone can open the link — the GLB is hosted on your server.
                </p>
                {qrDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrDataUrl} alt="QR AR preview" className="rounded-lg border border-white/10 w-40 h-40" />
                    <span className="font-mono text-[9px] break-all text-center opacity-70">
                      {typeof window !== 'undefined' ? `${window.location.origin}/ar/${id}` : ''}
                    </span>
                  </div>
                ) : (
                  <p className={themeMuted}>Generating QR…</p>
                )}
              </div>
            </details>

            <div>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeMuted}`}>Logo layout</h2>
              <p className={`text-[10px] mb-3 ${uiTheme === 'light' ? 'text-zinc-500' : 'text-white/35'}`}>
                Adjust size & height; drag ends apply to the scene.
              </p>
              <div className="space-y-3">
                <div
                  onPointerUp={(e) => {
                    if (!id || !project.logoDataUrl) return;
                    const t = e.target as HTMLInputElement;
                    if (t?.type === 'range' && t.name === 'logo-scale') {
                      updateProject(id, { logoScale: parseFloat(t.value) });
                    }
                    if (t?.type === 'range' && t.name === 'logo-offset') {
                      updateProject(id, { logoOffsetY: parseFloat(t.value) });
                    }
                  }}
                >
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase">Scale</span>
                    <input
                      name="logo-scale"
                      type="range"
                      min={0.15}
                      max={2.5}
                      step={0.05}
                      value={logoScaleUi}
                      onChange={(e) => setLogoScaleUi(parseFloat(e.target.value))}
                      className="w-full accent-brand-primary h-1 bg-white/10 rounded-full mt-1"
                      disabled={!project.logoDataUrl}
                    />
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] font-bold text-white/30 uppercase">Height offset</span>
                    <input
                      name="logo-offset"
                      type="range"
                      min={-1}
                      max={3}
                      step={0.05}
                      value={logoOffsetUi}
                      onChange={(e) => setLogoOffsetUi(parseFloat(e.target.value))}
                      className="w-full accent-brand-primary h-1 bg-white/10 rounded-full mt-1"
                      disabled={!project.logoDataUrl}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${themeMuted}`}>Selection</h2>
              <button
                type="button"
                onClick={() => setRigDialogOpen(true)}
                disabled={!gizmoTargetId || gizmoTargetId === LOGO_ID}
                className="w-full mb-2 py-3 bg-white/5 border border-white/10 text-white/90 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <RotateCw className="w-4 h-4" />
                Motion rig…
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('ai')}
                className="w-full mb-2 py-3 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary/25 transition-all flex md:hidden items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                AI generate
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                disabled={
                  !gizmoTargetId ||
                  gizmoTargetId === LOGO_ID ||
                  (gizmoTargetId === PRIMARY_ID && !primarySource)
                }
                className="w-full mb-2 py-3 bg-white/5 border border-white/10 text-white/90 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Copy className="w-4 h-4" />
                Duplicate as new layer
              </button>
              <button
                type="button"
                onClick={() => {
                  const sid = gizmoTargetId;
                  if (!id || !sid) return;
                  if (sid === PRIMARY_ID) {
                    removePrimaryModel();
                  } else if (sid !== LOGO_ID) removeExtra(sid);
                }}
                disabled={
                  !gizmoTargetId ||
                  gizmoTargetId === LOGO_ID ||
                  (gizmoTargetId === PRIMARY_ID && !primarySource)
                }
                className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500/15 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-4 h-4" />
                Remove selected
              </button>
              <p className="text-[9px] text-white/25 mt-2">
                Duplicate copies the mesh into a new fused layer. Remove deletes the asset from the project.
              </p>
            </div>
          </div>
        </aside>
        </div>
      </div>

      <nav
        className={`fixed bottom-0 left-0 right-0 z-[70] flex justify-around items-stretch border-t pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden ${
          uiTheme === 'light' ? 'bg-white/95 border-zinc-200' : 'bg-black/95 border-white/10'
        }`}
        aria-label="Studio sections"
      >
        {(
          [
            { id: 'canvas' as const, label: 'Canvas', Icon: LayoutGrid },
            { id: 'tools' as const, label: 'Tools', Icon: Wrench },
            { id: 'scene' as const, label: 'Scene', Icon: PanelsTopLeft },
            { id: 'ai' as const, label: 'AI', Icon: MessageSquare },
          ] as const
        ).map(({ id: tid, label, Icon }) => (
          <button
            key={tid}
            type="button"
            onClick={() => setMobileTab(tid)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-bold uppercase tracking-wider ${
              mobileTab === tid
                ? 'text-brand-primary'
                : uiTheme === 'light'
                  ? 'text-zinc-500'
                  : 'text-white/45'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>

      <StudioDownloadDialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        themeMuted={themeMuted}
        uiTheme={uiTheme}
        meshyUrls={project?.modelUrls}
        onDownloadMergedGlb={downloadMergedGlb}
        onScreenshot={captureScreenshot}
        onCopyShareLink={copyShareLink}
      />
      <StudioGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} uiTheme={uiTheme} />
      <StudioMotionRigDialog
        open={rigDialogOpen}
        onClose={() => setRigDialogOpen(false)}
        uiTheme={uiTheme}
        rig={rigDraft}
        onChange={setRigDraft}
        onApply={saveRigToProject}
        targetLabel={
          gizmoTargetId === PRIMARY_ID ? 'Main model' : gizmoTargetId ? gizmoTargetId.slice(0, 12) : '—'
        }
      />
      {aiDialogOpen && id ? (
        <div className="fixed inset-0 z-[95] hidden md:flex items-center justify-center bg-black/65 p-6">
          <div
            className={`w-full max-w-lg max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              uiTheme === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-[#0a0a0a] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <span className={`text-sm font-bold uppercase tracking-widest ${themeInk}`}>AI Studio</span>
              <button
                type="button"
                onClick={() => setAiDialogOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden">
              <StudioAiChat
                projectId={id}
                themeMuted={themeMuted}
                themeInk={themeInk}
                uiTheme={uiTheme}
                onModelReady={() => {
                  setSceneContentVersion((v) => v + 1);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {project ? (
        <StudioPublishDialog
          open={publishDialogOpen}
          busy={isPublishing}
          projectName={projectTitle.trim() || project.name}
          defaults={{
            arPageTitle: project.arPageTitle || project.name,
            arPageTagline: project.arPageTagline || project.description?.slice(0, 280) || '',
            arCtaLabel: project.arCtaLabel || 'View in your space',
            arAccentHex: project.arAccentHex || '#10b981',
            arSharePublic: project.arSharePublic !== false,
          }}
          onClose={() => !isPublishing && setPublishDialogOpen(false)}
          onConfirm={confirmPublishAr}
        />
      ) : null}
    </div>
  );
}
