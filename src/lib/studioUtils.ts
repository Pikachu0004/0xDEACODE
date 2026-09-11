import * as THREE from 'three';

/** Triangle count (approximate) for performance warnings. */
export function countTriangles(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    if (g.index) {
      n += g.index.count / 3;
    } else if (g.attributes.position) {
      n += g.attributes.position.count / 3;
    }
  });
  return Math.floor(n);
}

/** Rough RGBA byte estimate for unique textures (excludes video). */
export function estimateTextureBytes(root: THREE.Object3D): number {
  let b = 0;
  const seen = new Set<THREE.Texture>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      if (!mat || typeof mat !== 'object') continue;
      const std = mat as THREE.MeshStandardMaterial;
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const) {
        const t = std[key];
        if (t && (t as THREE.Texture).isTexture && !seen.has(t as THREE.Texture)) {
          seen.add(t as THREE.Texture);
          const img = (t as THREE.Texture).image as { width?: number; height?: number } | undefined;
          if (img?.width && img?.height) b += img.width * img.height * 4;
        }
      }
    }
  });
  return b;
}

export function getBoundingSize(object: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  return box.getSize(new THREE.Vector3());
}

export function snapScalar(value: number, step: number | null): number {
  if (step == null || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!found && m.isMesh) found = m;
  });
  return found;
}
