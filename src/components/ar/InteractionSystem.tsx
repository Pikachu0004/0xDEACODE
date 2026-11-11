import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { Project } from '../../store/useAppStore';

interface Props {
  project?: Project;
  modelUrl: string;
  dismantleFactor?: number;
  driveVelocity?: { forward: number; turn: number };
}

export function InteractionSystem({ project, modelUrl, dismantleFactor = 0, driveVelocity }: Props) {
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, scene);
  
  const originalTransforms = useRef<Map<string, { pos: THREE.Vector3, rot: THREE.Euler, center: THREE.Vector3 }>>(new Map());
  const boundingBox = useRef<THREE.Box3>(new THREE.Box3());
  const centerOfMass = useRef<THREE.Vector3>(new THREE.Vector3());
  
  const [grabbedMesh, setGrabbedMesh] = useState<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!scene) return;
    
    boundingBox.current.setFromObject(scene);
    boundingBox.current.getCenter(centerOfMass.current);
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        const childBox = new THREE.Box3().setFromObject(child);
        const childCenter = new THREE.Vector3();
        childBox.getCenter(childCenter);
        
        originalTransforms.current.set(child.uuid, {
          pos: child.position.clone(),
          rot: child.rotation.clone(),
          center: childCenter
        });
      }
    });
  }, [scene]);

  useFrame(() => {
    // Apply Dismantle logic
    if (dismantleFactor > 0 && !grabbedMesh) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const orig = originalTransforms.current.get(child.uuid);
          const partConfig = project?.interactiveParts?.[child.name];
          // Don't dismantle if it's the main chassis or unconfigured (optional design choice, but we'll dismantle all for effect unless specifically locked)
          if (orig) {
            // Push child away from centerOfMass
            const direction = orig.center.clone().sub(centerOfMass.current).normalize();
            // Scale the distance based on the slider
            const offset = direction.multiplyScalar(dismantleFactor * 1.5);
            
            // Lerp towards the dismantled position
            child.position.lerp(orig.pos.clone().add(offset), 0.15);
          }
        }
      });
    } else if (dismantleFactor === 0 && !grabbedMesh) {
      // Snap back to original
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const orig = originalTransforms.current.get(child.uuid);
          if (orig) {
            child.position.lerp(orig.pos, 0.15);
            child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, orig.rot.x, 0.15);
            child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, orig.rot.y, 0.15);
            child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, orig.rot.z, 0.15);
          }
        }
      });
    }
    
    // Apply Drive Mode logic
    if (driveVelocity && (driveVelocity.forward !== 0 || driveVelocity.turn !== 0)) {
      const delta = 0.016; // Approx frame delta
      // Turn
      scene.rotation.y -= driveVelocity.turn * delta * 2;
      
      // Forward/Back
      const moveSpeed = driveVelocity.forward * delta * 5;
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(scene.quaternion);
      scene.position.add(dir.multiplyScalar(moveSpeed));
      
      // Spin tagged wheels
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const partConfig = project?.interactiveParts?.[child.name];
          if (partConfig?.semanticTag?.toLowerCase() === 'wheel') {
             child.rotation.x -= moveSpeed * 10;
          }
        }
      });
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    const partConfig = project?.interactiveParts?.[mesh.name];
    
    if (partConfig?.interactionType === 'OPEN_CLOSE') {
      // Toggle rotation
      const currentRot = mesh.rotation.y;
      mesh.rotation.y = currentRot > 0.5 ? 0 : Math.PI / 2;
    } else if (partConfig?.interactionType === 'ANIMATION' && partConfig.animationName) {
      const action = actions[partConfig.animationName];
      if (action) {
        action.reset().play();
      }
    } else if (dismantleFactor > 0) {
      // Only allow grabbing if dismantled
      setGrabbedMesh(mesh);
      (mesh.material as THREE.Material).transparent = true;
      (mesh.material as THREE.Material).opacity = 0.8;
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (grabbedMesh) {
      (grabbedMesh.material as THREE.Material).opacity = 1.0;
      const orig = originalTransforms.current.get(grabbedMesh.uuid);
      if (orig) {
        // Snap logic
        const dist = grabbedMesh.position.distanceTo(orig.pos);
        if (dist < 0.3) {
           grabbedMesh.position.copy(orig.pos);
           grabbedMesh.rotation.copy(orig.rot);
        }
      }
      setGrabbedMesh(null);
    }
  };
  
  const handlePointerMove = (e: any) => {
    if (grabbedMesh && e.point) {
      // Simple follow point in 3D space (using raycast hit point from the scene primitive)
      // To keep it strictly in front of the camera, we could unproject.
      // But using e.point is an easy way to slide it along other objects.
      // Let's just lerp it towards the pointer ray at a fixed distance.
      grabbedMesh.position.lerp(e.point, 0.5);
    }
  };

  return (
    <primitive 
      object={scene} 
      onPointerDown={handlePointerDown} 
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerMissed={() => setGrabbedMesh(null)}
    />
  );
}
