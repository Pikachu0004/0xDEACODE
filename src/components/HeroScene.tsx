import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment, ContactShadows, PresentationControls, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function DroneModel({ scrollProgress }: { scrollProgress: number }) {
  const { scene } = useGLTF('/scifi_drone.glb');
  const droneRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const g = scene.clone(true);
    g.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return g;
  }, [scene]);

  useFrame((state) => {
    if (droneRef.current) {
      const t = state.clock.getElapsedTime();
      
      // Base floating animation
      droneRef.current.position.y = Math.sin(t / 2) / 8;
      
      // Scroll-based rotation and position
      // We want it to stay centered longer, then move to the side for features
      
      let targetX = 0;
      let targetZ = 0;
      let targetRotationY = t * 0.2; // Constant slow rotation
      let targetScale = 2.4;

      if (scrollProgress > 0.1 && scrollProgress < 0.4) {
        // First feature: move slightly right
        targetX = THREE.MathUtils.lerp(0, 2, (scrollProgress - 0.1) / 0.3);
        targetRotationY += (scrollProgress - 0.1) * Math.PI;
        targetScale = 2.1;
      } else if (scrollProgress >= 0.4 && scrollProgress < 0.7) {
        // Second feature: move to left
        targetX = THREE.MathUtils.lerp(2, -2, (scrollProgress - 0.4) / 0.3);
        targetRotationY += (scrollProgress - 0.1) * Math.PI;
        targetScale = 2.1;
      } else if (scrollProgress >= 0.7) {
        // Final section: move back or fade out
        targetX = THREE.MathUtils.lerp(-2, 0, (scrollProgress - 0.7) / 0.3);
        targetZ = THREE.MathUtils.lerp(0, -5, (scrollProgress - 0.7) / 0.3);
        targetScale = 1.85;
      }

      droneRef.current.position.x = THREE.MathUtils.lerp(droneRef.current.position.x, targetX, 0.08);
      droneRef.current.position.z = THREE.MathUtils.lerp(droneRef.current.position.z, targetZ, 0.08);
      droneRef.current.rotation.y = THREE.MathUtils.lerp(droneRef.current.rotation.y, targetRotationY + Math.sin(t / 4) / 6, 0.08);
      droneRef.current.scale.setScalar(THREE.MathUtils.lerp(droneRef.current.scale.x, targetScale, 0.08));
    }
  });

  return <primitive object={model} ref={droneRef} />;
}

export default function HeroScene({ scrollProgress = 0 }: { scrollProgress?: number }) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <PresentationControls
          global
          snap
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
        >
          <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <DroneModel scrollProgress={scrollProgress} />
          </Float>
        </PresentationControls>

        <Environment preset="city" />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
        
        {/* Background Glow */}
        <mesh position={[0, 0, -5]}>
          <planeGeometry args={[20, 20]} />
          <MeshDistortMaterial
            color="#8b5cf6"
            speed={2}
            distort={0.4}
            radius={1}
            transparent
            opacity={0.1}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
