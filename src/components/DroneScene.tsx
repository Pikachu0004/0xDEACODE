import { Suspense, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  useAnimations,
  Environment,
  ContactShadows,
  Float,
  PresentationControls,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const DEFAULT_MODEL_URL = '/scifi_drone.glb';

export type DroneFramePreset = 'hero' | 'section' | 'default';

type DroneSceneProps = {
  className?: string;
  /** Extra multiplier after auto-fit (default 1) */
  modelScale?: number;
  modelUrl?: string;
  frame?: DroneFramePreset;
  interactive?: boolean;
};

/** World-space target for largest bounding-box dimension after centering */
const FIT_TARGET: Record<DroneFramePreset, number> = {
  /** Hero demo card — match readable size vs. section viewer (was 2.35, felt tiny) */
  hero: 2.3  ,
  /** Landing “From file to AR” — sized to read large inside the 80%-width viewer */
  section: 6.1,
  default: 2.2,
};

const CAMERA_PRESETS: Record<
  DroneFramePreset,
  { position: [number, number, number]; fov: number }
> = {
  hero: { position: [0, 0.08, 4.05], fov: 44 },
  /** Slightly wider FOV + distance so wide cars stay fully in frame while orbiting */
  section: { position: [0, 0.08, 4.85], fov: 52 },
  default: { position: [0, 0.15, 5.4], fov: 42 },
};

/** Centers mesh at origin and scales so max dimension matches `targetSize` (stable framing per GLB). */
function useFitModelToTarget(
  root: React.RefObject<THREE.Group | null>,
  model: THREE.Object3D,
  targetSize: number,
  modelScaleMul: number
) {
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    for (let i = g.children.length - 1; i >= 0; i--) g.remove(g.children[i]);
    g.position.set(0, 0, 0);
    g.scale.set(1, 1, 1);
    g.add(model);
    const box = new THREE.Box3().setFromObject(g);
    const center = box.getCenter(new THREE.Vector3());
    g.position.sub(center);
    box.setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    g.scale.setScalar((targetSize / maxDim) * modelScaleMul);
  }, [model, targetSize, modelScaleMul, root]);
}

function DroneModel({
  modelUrl,
  frame,
  modelScaleMul,
  idleOrbit,
}: {
  modelUrl: string;
  frame: DroneFramePreset;
  modelScaleMul: number;
  idleOrbit: boolean;
}) {
  const { scene, animations } = useGLTF(modelUrl);
  const pivot = useRef<THREE.Group>(null);
  const fitRoot = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const g = cloneSkinned(scene);
    g.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return g;
  }, [scene]);

  const targetSize = FIT_TARGET[frame] ?? FIT_TARGET.default;
  useFitModelToTarget(fitRoot, model, targetSize, modelScaleMul);

  const { actions, mixer } = useAnimations(animations, pivot);
  const hasClip = animations.length > 0;

  useEffect(() => {
    if (!hasClip || !actions) return;
    const names = Object.keys(actions).filter((k) => actions[k]);
    if (names.length === 0) return;
    const clip = actions[names[0]];
    clip?.reset().fadeIn(0.4).play();
    return () => {
      clip?.fadeOut(0.3);
    };
  }, [actions, hasClip]);

  useFrame((_, delta) => {
    if (mixer) mixer.update(delta);
    if (!pivot.current) return;
    const t = performance.now() * 0.001;
    if (hasClip) {
      pivot.current.rotation.y = t * 0.045;
      return;
    }
    if (!idleOrbit) return;
    // Section showcase: slow yaw only — keeps full model in frame (no vertical bob)
    if (frame === 'section') {
      pivot.current.rotation.y = t * 0.052;
      return;
    }
    pivot.current.rotation.y = t * 0.12;
    pivot.current.position.y = Math.sin(t * 0.45) * 0.025;
  });

  return (
    <group ref={pivot}>
      <group ref={fitRoot} />
    </group>
  );
}

function SceneContent({
  modelUrl,
  frame,
  modelScaleMul,
  interactive,
  useFloatIdle,
}: {
  modelUrl: string;
  frame: DroneFramePreset;
  modelScaleMul: number;
  interactive: boolean;
  useFloatIdle: boolean;
}) {
  const { animations } = useGLTF(modelUrl);
  const hasClip = animations.length > 0;
  const idleOrbit = !hasClip;

  const inner = (
    <DroneModel
      modelUrl={modelUrl}
      frame={frame}
      modelScaleMul={modelScaleMul}
      idleOrbit={idleOrbit}
    />
  );

  const modelEl =
    useFloatIdle && frame !== 'section' ? (
      <Float speed={0.85} rotationIntensity={0.04} floatIntensity={0.12}>
        {inner}
      </Float>
    ) : (
      inner
    );

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.55} />
      <spotLight
        position={[8, 12, 8]}
        angle={0.35}
        penumbra={0.85}
        intensity={1.15}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <pointLight position={[-6, 4, -4]} intensity={0.45} color="#e4e4e7" />
      <pointLight position={[6, -2, 6]} intensity={0.28} color="#a1a1aa" />

      {interactive ? (
        <PresentationControls
          global
          snap
          speed={0.95}
          zoom={1}
          polar={[-Math.PI / 3.2, Math.PI / 3.2]}
          azimuth={[-Math.PI / 1.35, Math.PI / 1.35]}
        >
          {modelEl}
        </PresentationControls>
      ) : (
        modelEl
      )}

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.38}
        scale={14}
        blur={1.6}
        far={6}
      />
      <Environment preset="city" />
    </>
  );
}

/** Keeps camera looking at origin; optional subtle drift */
function CameraRig({ frame }: { frame: DroneFramePreset }) {
  const { camera } = useThree();
  const cam = CAMERA_PRESETS[frame] ?? CAMERA_PRESETS.default;
  useEffect(() => {
    camera.position.set(cam.position[0], cam.position[1], cam.position[2]);
    if ('fov' in camera && 'updateProjectionMatrix' in camera) {
      (camera as THREE.PerspectiveCamera).fov = cam.fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
    camera.lookAt(0, 0, 0);
  }, [camera, cam]);
  return null;
}

export default function DroneScene({
  className,
  modelScale = 1,
  modelUrl = DEFAULT_MODEL_URL,
  frame = 'default',
  interactive = true,
}: DroneSceneProps) {
  const { animations } = useGLTF(modelUrl);
  const useFloatIdle = animations.length === 0;
  const cam = CAMERA_PRESETS[frame] ?? CAMERA_PRESETS.default;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.25]}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'default',
        }}
        camera={{
          position: cam.position,
          fov: cam.fov,
          near: 0.1,
          far: 100,
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <CameraRig frame={frame} />
        <Suspense
          fallback={
            <Html center prepend zIndexRange={[100, 0]}>
              <div
                role="status"
                className="flex flex-col items-center gap-2 rounded-lg border border-white/12 bg-black/75 px-4 py-3 text-white shadow-lg backdrop-blur-sm"
              >
                <span
                  className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white"
                  aria-hidden
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                  Loading 3D…
                </span>
              </div>
            </Html>
          }
        >
          <SceneContent
            modelUrl={modelUrl}
            frame={frame}
            modelScaleMul={modelScale}
            interactive={interactive}
            useFloatIdle={useFloatIdle}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
