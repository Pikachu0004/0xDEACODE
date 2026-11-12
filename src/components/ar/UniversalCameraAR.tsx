import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Camera,
  X,
  RotateCcw,
  Compass,
  Zap,
  ZapOff,
  Check,
  Loader2,
  Move,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

interface UniversalCameraARProps {
  modelUrl: string;
  title?: string;
  onClose: () => void;
}

export function UniversalCameraAR({ modelUrl, title, onClose }: UniversalCameraARProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const groundPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const animFrameRef = useRef<number | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Touch tracking state
  const touchStateRef = useRef<{
    isDragging: boolean;
    initialDistance: number;
    initialScale: number;
    initialAngle: number;
    initialRotationY: number;
    lastX: number;
    lastY: number;
  }>({
    isDragging: false,
    initialDistance: 0,
    initialScale: 1,
    initialAngle: 0,
    initialRotationY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Gyro orientation state
  const gyroOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // UI State
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [gyroEnabled, setGyroEnabled] = useState(true);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [showHelpToast, setShowHelpToast] = useState(true);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is not supported in this browser.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }

        const videoTrack = stream.getVideoTracks()[0];
        videoTrackRef.current = videoTrack;

        // Check torch / flash capability
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
          if (capabilities.torch) {
            setTorchSupported(true);
          }
        }
      } catch (err: any) {
        console.warn('[Camera AR] Camera access error:', err);
        if (!cancelled) {
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings to view 3D in your room.'
              : 'Could not access the camera. Showing in virtual studio mode.'
          );
          setCameraReady(true);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle Torch / Flashlight Toggle
  const toggleTorch = useCallback(async () => {
    if (!videoTrackRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchOn;
      await (videoTrackRef.current as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Could not toggle torch:', e);
    }
  }, [torchOn, torchSupported]);

  // Handle Gyroscope / Device Orientation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialBeta: number | null = null;
    let initialGamma: number | null = null;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!gyroSupported) setGyroSupported(true);
      if (!gyroEnabled) return;

      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

      if (initialBeta === null) initialBeta = beta;
      if (initialGamma === null) initialGamma = gamma;

      // Calculate smooth tilt offset
      const deltaX = ((gamma - initialGamma) * Math.PI) / 180;
      const deltaY = ((beta - initialBeta) * Math.PI) / 180;

      // Dampen motion to keep experience stable
      gyroOffsetRef.current = {
        x: THREE.MathUtils.clamp(deltaX * 0.4, -0.6, 0.6),
        y: THREE.MathUtils.clamp(deltaY * 0.4, -0.6, 0.6),
      };
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [gyroEnabled, gyroSupported]);

  // Auto-hide help toast after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHelpToast(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 50);
    camera.position.set(0, 1.2, 2.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with transparent background to show camera underneath
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true, // Needed for photo snapshots
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 5, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // 5. Contact Shadow Receiver (Floor)
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.38 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // 6. Holographic Target Reticle on Floor
    const reticleGeo = new THREE.RingGeometry(0.25, 0.28, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.set(0, 0, 0);
    scene.add(reticle);
    reticleRef.current = reticle;

    // 7. Load GLB Model
    const loader = new GLTFLoader();
    setModelLoading(true);

    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        modelRef.current = root;

        // Compute Bounding Box & Normalize Scale
        const bbox = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetScale = 0.85 / maxDim; // Fits nicely on floor / table
        root.scale.setScalar(targetScale);

        // Center on floor
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        root.position.x = -center.x * targetScale;
        root.position.z = -center.z * targetScale;
        root.position.y = -bbox.min.y * targetScale;

        // Enable shadows on all child meshes
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Group container for user transformations
        const group = new THREE.Group();
        group.add(root);
        group.position.set(0, 0, 0);
        scene.add(group);
        modelRef.current = group;

        setModelLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('[UniversalCameraAR] Error loading GLTF model:', err);
        setModelLoading(false);
      }
    );

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    function renderLoop() {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Pulse holographic reticle
      if (reticleRef.current) {
        const s = 1 + Math.sin(elapsed * 3) * 0.05;
        reticleRef.current.scale.set(s, s, s);
      }

      // Apply subtle gyro camera tracking
      if (cameraRef.current) {
        const targetCamX = gyroOffsetRef.current.x * 0.8;
        const targetCamY = 1.2 + gyroOffsetRef.current.y * 0.5;
        cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.1;
        cameraRef.current.position.y += (targetCamY - cameraRef.current.position.y) * 0.1;
        cameraRef.current.lookAt(0, 0.2, 0);
      }

      renderer.render(scene, camera);
    }

    renderLoop();

    // 9. Resize Handler
    function handleResize() {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, [modelUrl]);

  // Touch Controls: Drag, Pinch-Scale, Rotate, Tap-Place
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStateRef.current.isDragging = true;
      touchStateRef.current.lastX = e.touches[0].clientX;
      touchStateRef.current.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && modelRef.current) {
      touchStateRef.current.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current.initialDistance = Math.hypot(dx, dy);
      touchStateRef.current.initialScale = modelRef.current.scale.x;
      touchStateRef.current.initialAngle = Math.atan2(dy, dx);
      touchStateRef.current.initialRotationY = modelRef.current.rotation.y;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!modelRef.current || !cameraRef.current || !containerRef.current) return;

    if (e.touches.length === 1 && touchStateRef.current.isDragging) {
      // Single finger: Reposition model on the floor plane
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const ndcX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);
      const intersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, intersection);

      if (intersection) {
        modelRef.current.position.x = intersection.x;
        modelRef.current.position.z = intersection.z;
        if (reticleRef.current) {
          reticleRef.current.position.x = intersection.x;
          reticleRef.current.position.z = intersection.z;
        }
      }
    } else if (e.touches.length === 2) {
      // Two fingers: Pinch-scale & Twist-rotate
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const currentAngle = Math.atan2(dy, dx);

      if (touchStateRef.current.initialDistance > 0) {
        const factor = currentDist / touchStateRef.current.initialDistance;
        const newScale = THREE.MathUtils.clamp(
          touchStateRef.current.initialScale * factor,
          0.15,
          4.0
        );
        modelRef.current.scale.setScalar(newScale);
        setCurrentScale(newScale);
      }

      const angleDelta = currentAngle - touchStateRef.current.initialAngle;
      modelRef.current.rotation.y = touchStateRef.current.initialRotationY - angleDelta;
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.isDragging = false;
  };

  // Reset Model to Center
  const resetPosition = () => {
    if (modelRef.current) {
      modelRef.current.position.set(0, 0, 0);
      modelRef.current.rotation.set(0, 0, 0);
      modelRef.current.scale.setScalar(1);
      setCurrentScale(1);
    }
    if (reticleRef.current) {
      reticleRef.current.position.set(0, 0, 0);
    }
    gyroOffsetRef.current = { x: 0, y: 0 };
  };

  // Adjust Scale via Slider or Preset
  const applyScale = (newScale: number) => {
    if (modelRef.current) {
      modelRef.current.scale.setScalar(newScale);
      setCurrentScale(newScale);
    }
  };

  // Capture AR Snapshot Photo (Camera Feed + 3D Model Composite)
  const takeSnapshot = async () => {
    if (!canvasRef.current) return;

    try {
      const snapCanvas = document.createElement('canvas');
      const w = window.innerWidth * (window.devicePixelRatio || 1);
      const h = window.innerHeight * (window.devicePixelRatio || 1);
      snapCanvas.width = w;
      snapCanvas.height = h;
      const ctx = snapCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw live camera video frame
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, w, h);
      } else {
        // Fallback dark gradient
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Overlay the Three.js 3D rendered canvas
      ctx.drawImage(canvasRef.current, 0, 0, w, h);

      // 3. Add elegant branding watermark
      ctx.font = `bold ${Math.round(w * 0.03)}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText('Pixora WebAR', w * 0.05, h - h * 0.05);

      // Visual shutter flash
      setSnapshotTaken(true);
      setTimeout(() => setSnapshotTaken(false), 500);

      // 4. Download photo or use mobile Web Share API
      snapCanvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `Pixora_AR_${Date.now()}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: title || 'My Pixora 3D AR Model',
            });
            return;
          } catch (_) {
            /* Fallback to direct download */
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pixora_AR_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.95);
    } catch (e) {
      console.warn('Snapshot error:', e);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-black overflow-hidden select-none touch-none flex flex-col justify-between"
    >
      {/* 1. Real Camera Feed Background */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          cameraReady && !cameraError ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Virtual Studio background if camera denied */}
      {cameraError && (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.08)_0%,_transparent_70%)]" />
        </div>
      )}

      {/* 2. Three.js Transparent 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 pointer-events-auto"
      />

      {/* Shutter Flash Animation */}
      {snapshotTaken && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping" />
      )}

      {/* 3. Top Header Bar */}
      <header className="relative z-30 p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/15 hover:bg-white/10 active:scale-95 transition-all shadow-lg"
            title="Exit AR"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate drop-shadow-md">
              {title || 'AR Camera View'}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-widest drop-shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Universal WebAR · All Devices
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-95 ${
                torchOn
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-black/60 text-white/80 border-white/15'
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setGyroEnabled(!gyroEnabled)}
            className={`px-3 py-2 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 active:scale-95 ${
              gyroEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-black/60 text-white/50 border-white/15'
            }`}
            title="Toggle Gyroscope Room Tracking"
          >
            <Compass className={`w-3.5 h-3.5 ${gyroEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="text-[10px] uppercase tracking-wider">Gyro {gyroEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </header>

      {/* Camera Access Warning banner if permission denied */}
      {cameraError && (
        <div className="relative z-30 mx-4 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs flex items-center gap-2 pointer-events-auto">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="leading-snug">{cameraError}</p>
        </div>
      )}

      {/* Model Loading Spinner */}
      {modelLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <div className="text-center">
            <p className="text-sm font-bold text-white tracking-wide">Placing 3D Model in Room…</p>
            <p className="text-xs text-white/50">{loadProgress}% loaded</p>
          </div>
        </div>
      )}

      {/* Floating Instructions Toast */}
      {showHelpToast && !modelLoading && (
        <div className="relative z-30 mx-auto max-w-sm px-4 py-2.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white/90 text-xs font-medium flex items-center gap-2.5 shadow-2xl animate-fade-in pointer-events-auto">
          <Move className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
          <span>Drag to move • Pinch to resize • Rotate with 2 fingers</span>
          <button
            onClick={() => setShowHelpToast(false)}
            className="ml-auto text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Bottom Controls & Action Bar */}
      <footer className="relative z-30 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 pointer-events-auto">
        {/* Scale Presets Toolbar */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mr-1 flex items-center gap-1">
            <Maximize2 className="w-3 h-3" /> Size:
          </span>
          {[
            { label: '50%', value: 0.5 },
            { label: '100% (Real)', value: 1.0 },
            { label: '150%', value: 1.5 },
            { label: '200%', value: 2.0 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyScale(preset.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                Math.abs(currentScale - preset.value) < 0.1
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Shutter and Primary Action Buttons */}
        <div className="flex items-center justify-around max-w-md mx-auto w-full pt-1">
          {/* Reset position button */}
          <button
            onClick={resetPosition}
            className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-white active:scale-90 transition-all"
            title="Reset position to center"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15">
              <RotateCcw className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider">Reset</span>
          </button>

          {/* Large Shutter Button (Snap Photo) */}
          <button
            onClick={takeSnapshot}
            className="relative p-1 rounded-full bg-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
            title="Take AR Photo"
          >
            <div className="w-16 h-16 rounded-full border-4 border-black/80 bg-white flex items-center justify-center">
              <Camera className="w-7 h-7 text-black" />
            </div>
          </button>

          {/* Done / Exit button */}
          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-white active:scale-90 transition-all"
            title="Exit AR View"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 backdrop-blur-md flex items-center justify-center border border-emerald-500/30">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider">Done</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
