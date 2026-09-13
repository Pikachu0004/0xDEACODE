import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function objectToBrush(obj: THREE.Object3D): Brush | null {
  const geometries: THREE.BufferGeometry[] = [];
  let material: THREE.Material | null = null;
  
  obj.updateMatrixWorld(true);
  
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      if (!material) material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      geometries.push(geom);
    }
  });

  if (geometries.length === 0) return null;

  const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
  if (!merged) return null;

  const brush = new Brush(merged, material || new THREE.MeshStandardMaterial({ color: 0xffffff }));
  // Matrix is already applied to geometry, so brush matrix is identity
  brush.matrixWorld.identity();
  return brush;
}

export function performCSG(
  targetObj: THREE.Object3D,
  cutterObj: THREE.Object3D,
  operation: 'subtract' | 'union' | 'intersect'
): THREE.Mesh | null {
  const targetBrush = objectToBrush(targetObj);
  const cutterBrush = objectToBrush(cutterObj);
  
  if (!targetBrush || !cutterBrush) return null;

  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  
  let op = SUBTRACTION;
  if (operation === 'union') op = ADDITION;
  if (operation === 'intersect') op = INTERSECTION;
  
  const result = evaluator.evaluate(targetBrush, cutterBrush, op);
  
  // The result is a Brush (which extends Mesh). 
  // We can return it directly. It has world matrix applied, so its local position is 0,0,0.
  return result;
}
