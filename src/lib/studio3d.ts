import * as THREE from 'three';
import type { StudioNodeTransform } from '../store/useAppStore';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { apiUrl } from './api';

const MESHY_CDN = /^https:\/\/assets\.meshy\.ai\//i;

export function loadGltf(url: string): Promise<THREE.Group> {
  if (url.startsWith('blob:')) {
    return Promise.reject(
      new Error(
        'This model URL was a temporary browser link and no longer works after refresh. Upload the GLB again or pick an asset from your project.'
      )
    );
  }
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene as THREE.Group),
      undefined,
      reject
    );
  });
}

/** Load GLB from Meshy CDN via backend proxy (browser cannot fetch assets.meshy.ai — CORS). */
export async function loadGltfMeshy(url: string, token: string | null | undefined): Promise<THREE.Group> {
  const { scene } = await loadGltfMeshyWithAnimations(url, token);
  return scene;
}

export type GltfLoadResult = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

export async function loadGltfWithAnimations(url: string): Promise<GltfLoadResult> {
  if (url.startsWith('blob:')) {
    return Promise.reject(
      new Error(
        'This model URL was a temporary browser link and no longer works after refresh. Upload the GLB again or pick an asset from your project.'
      )
    );
  }
  const loader = new GLTFLoader();
  const gltf: GLTF = await loader.loadAsync(url);
  return { scene: gltf.scene as THREE.Group, animations: gltf.animations };
}

export async function loadGltfMeshyWithAnimations(
  url: string,
  token: string | null | undefined
): Promise<GltfLoadResult> {
  if (!MESHY_CDN.test(url)) {
    return loadGltfWithAnimations(url);
  }
  if (!token) {
    throw new Error('Sign in to load Meshy-hosted models (CDN is proxied by the server).');
  }
  const res = await fetch(apiUrl('/api/meshy/proxy-asset'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Proxy failed (${res.status})`);
  }
  const buf = await res.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buf, '');
  return { scene: gltf.scene as THREE.Group, animations: gltf.animations };
}

export function arrayBufferToGlbDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}

export async function exportObject3DToGlbDataUrl(root: THREE.Object3D): Promise<string> {
  const buffer = await exportObject3DToGlbArrayBuffer(root);
  return arrayBufferToGlbDataUrl(buffer);
}

/** Binary GLB for upload (e.g. public WebAR hosting). */
export async function exportObject3DToGlbArrayBuffer(root: THREE.Object3D): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(root, { binary: true });
  if (result instanceof ArrayBuffer) return result;
  throw new Error('Expected GLB binary output');
}

export function centerObjectAtOrigin(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
}

export function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  orbit: { target: THREE.Vector3; update: () => void },
  object: THREE.Object3D,
  pad = 1.45
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fovRad = (camera.fov * Math.PI) / 180;
  const dist = (maxDim / 2 / Math.tan(fovRad / 2)) * pad;
  camera.position.set(dist * 0.75, dist * 0.55, dist * 0.95);
  camera.near = Math.max(0.01, dist / 200);
  camera.far = dist * 50;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);
  orbit.target.set(0, 0, 0);
  orbit.update();
}

export function applyStudioTransform(obj: THREE.Object3D, t: StudioNodeTransform) {
  obj.position.set(...t.position);
  obj.rotation.set(...t.rotation);
  obj.scale.set(...t.scale);
}

export function readStudioTransform(obj: THREE.Object3D): StudioNodeTransform {
  return {
    position: obj.position.toArray() as [number, number, number],
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
    scale: obj.scale.toArray() as [number, number, number],
  };
}
