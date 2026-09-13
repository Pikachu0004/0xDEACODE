import * as THREE from 'three';
import type { StudioNodeTransform } from '../store/useAppStore';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { apiUrl } from './api';

const EXTERNAL_CDN = /^https?:\/\/(?!localhost|127\.0\.0\.1)/i;

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
  if (!EXTERNAL_CDN.test(url)) {
    return loadGltfWithAnimations(url);
  }

  const res = await fetch(apiUrl('/api/tripo/proxy-asset'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

export function exportObject3DToObjDataUrl(root: THREE.Object3D): string {
  const exporter = new OBJExporter();
  const result = exporter.parse(root);
  return `data:text/plain;charset=utf-8,${encodeURIComponent(result)}`;
}

export function exportObject3DToStlDataUrl(root: THREE.Object3D): string {
  const exporter = new STLExporter();
  const result = exporter.parse(root, { binary: true });
  // STLExporter returns a DataView for binary
  const buffer = (result as any).buffer ? (result as any).buffer : (result as any);
  return arrayBufferToGlbDataUrl(buffer).replace('model/gltf-binary', 'application/sla');
}

export function exportObject3DToPlyDataUrl(root: THREE.Object3D): Promise<string> {
  const exporter = new PLYExporter();
  return new Promise((resolve) => {
    exporter.parse(root, (result: any) => {
      resolve(arrayBufferToGlbDataUrl(result).replace('model/gltf-binary', 'application/ply'));
    }, { binary: true });
  });
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

export async function generatePrimitiveGlbDataUrl(type: 'cube' | 'sphere' | 'cylinder' | 'plane'): Promise<string> {
  let geometry: THREE.BufferGeometry;
  switch (type) {
    case 'cube': geometry = new THREE.BoxGeometry(1, 1, 1); break;
    case 'sphere': geometry = new THREE.SphereGeometry(0.5, 32, 16); break;
    case 'cylinder': geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(1, 1);
      geometry.rotateX(-Math.PI / 2);
      break;
    default: geometry = new THREE.BoxGeometry(1, 1, 1); break;
  }
  const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  return await exportObject3DToGlbDataUrl(group);
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
