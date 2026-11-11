import { Suspense, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import { InteractionSystem } from './InteractionSystem';
import type { Project } from '../../store/useAppStore';

interface Props {
  project?: Project;
  modelUrl: string;
  onExit: () => void;
}

export function InteractiveARViewer({ project, modelUrl, onExit }: Props) {
  const [dismantleFactor, setDismantleFactor] = useState(0);
  const [driveMode, setDriveMode] = useState(false);
  const [driveVelocity, setDriveVelocity] = useState({ forward: 0, turn: 0 });

  const xrStore = useMemo(() => createXRStore(), []);

  return (
    <div className="absolute inset-0 z-50 bg-[#050505] overflow-hidden">
      {/* Non-XR UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-start z-[100] pointer-events-none">
        <button 
          onClick={onExit}
          className="pointer-events-auto px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-full backdrop-blur-md transition-all border border-white/10"
        >
          Exit Interactive Mode
        </button>
        
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => xrStore.enterAR()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-full shadow-lg transition-all"
          >
            Enter WebAR
          </button>
          <button 
            onClick={() => setDriveMode(!driveMode)}
            className={`px-5 py-2.5 text-sm font-bold rounded-full shadow-lg transition-all ${driveMode ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
          >
            {driveMode ? 'Exit Drive Mode' : 'Drive Mode'}
          </button>
          
          {!driveMode && (
            <div className="bg-black/50 p-3 rounded-xl border border-white/10 backdrop-blur-md">
               <label className="text-white text-xs font-bold uppercase tracking-widest block mb-1">Dismantle</label>
               <input 
                 type="range" 
                 min="0" max="1" step="0.01" 
                 value={dismantleFactor}
                 onChange={(e) => setDismantleFactor(parseFloat(e.target.value))}
                 className="w-full accent-emerald-500" 
               />
            </div>
          )}
        </div>
      </div>

      {driveMode && (
        <div className="absolute bottom-10 left-10 z-[100] pointer-events-auto flex flex-col items-center gap-2">
          <button 
            onPointerDown={() => setDriveVelocity(v => ({ ...v, forward: 1 }))}
            onPointerUp={() => setDriveVelocity(v => ({ ...v, forward: 0 }))}
            onPointerLeave={() => setDriveVelocity(v => ({ ...v, forward: 0 }))}
            className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-2xl font-bold select-none"
          >
            W
          </button>
          <div className="flex gap-2">
            <button 
              onPointerDown={() => setDriveVelocity(v => ({ ...v, turn: -1 }))}
              onPointerUp={() => setDriveVelocity(v => ({ ...v, turn: 0 }))}
              onPointerLeave={() => setDriveVelocity(v => ({ ...v, turn: 0 }))}
              className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-2xl font-bold select-none"
            >
              A
            </button>
            <button 
              onPointerDown={() => setDriveVelocity(v => ({ ...v, forward: -1 }))}
              onPointerUp={() => setDriveVelocity(v => ({ ...v, forward: 0 }))}
              onPointerLeave={() => setDriveVelocity(v => ({ ...v, forward: 0 }))}
              className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-2xl font-bold select-none"
            >
              S
            </button>
            <button 
              onPointerDown={() => setDriveVelocity(v => ({ ...v, turn: 1 }))}
              onPointerUp={() => setDriveVelocity(v => ({ ...v, turn: 0 }))}
              onPointerLeave={() => setDriveVelocity(v => ({ ...v, turn: 0 }))}
              className="w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-2xl font-bold select-none"
            >
              D
            </button>
          </div>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 50 }}>
        <XR store={xrStore}>
          <Suspense fallback={
            <Html center>
              <div className="text-white/50 text-sm font-medium tracking-widest uppercase">Loading Core...</div>
            </Html>
          }>
            <Environment preset="city" />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} castShadow intensity={1.2} shadow-bias={-0.0001} />
            
            <Physics gravity={[0, -9.81, 0]}>
              <InteractionSystem project={project} modelUrl={modelUrl} dismantleFactor={driveMode ? 0 : dismantleFactor} driveVelocity={driveVelocity} />
            </Physics>
            
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
          </Suspense>
        </XR>
      </Canvas>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none text-center">
        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Interactive WebAR Engine</p>
      </div>
    </div>
  );
}
