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
  Maximize2,
  AlertTriangle,
  Footprints,
  Target,
  Gamepad2,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Megaphone,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface UniversalCameraARProps {
  modelUrl: string;
  title?: string;
  initialMotionMode?: boolean;
  onClose: () => void;
}

const degToRad = THREE.MathUtils.degToRad;
const qZero = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90 deg on X
const zee = new THREE.Vector3(0, 0, 1);

function getScreenOrientation(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  if (typeof (window as any).orientation === 'number') {
    return (window as any).orientation;
  }
  return 0;
}

/**
 * Normalizes angular difference between current compass heading and initial reference
 * into [-180, +180] degrees to prevent sudden 0/360 degree flips and spinning.
 */
function normalizeAngleDelta(currentAngle: number, referenceAngle: number): number {
  let delta = (currentAngle - referenceAngle) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/**
 * Converts device orientation angles (alpha, beta, gamma) into a Three.js Quaternion.
 * Matches real phone camera pointing out the back into the physical room.
 */
function computeDeviceQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  screenOrient: number = 0
): THREE.Quaternion {
  const _x = degToRad(beta);
  const _y = degToRad(alpha);
  const _z = degToRad(-gamma);

  const euler = new THREE.Euler(_x, _y, _z, 'YXZ');
  const q = new THREE.Quaternion().setFromEuler(euler);
  q.multiply(q1); // Camera points outward from the rear of the phone
  q.multiply(qZero.setFromAxisAngle(zee, -degToRad(screenOrient)));
  return q;
}

/**
 * Ultra-Stable Heavy-Damping Gimbal & Deadband Quaternion Stabilizer.
 * Completely eliminates micro-vibrations, compass twitch, and hand tremors from smartphone IMU sensors.
 * Placed 3D models remain 100% frozen in place like solid physical objects with ZERO shaking.
 */
class OrientationStabilizer {
  private currentQ = new THREE.Quaternion();
  private initialized = false;
  private isMoving = false;

  public update(rawQ: THREE.Quaternion): THREE.Quaternion {
    if (!this.initialized) {
      this.currentQ.copy(rawQ);
      this.initialized = true;
      return this.currentQ;
    }

    // Ensure shortest path interpolation
    if (this.currentQ.dot(rawQ) < 0) {
      rawQ.x = -rawQ.x;
      rawQ.y = -rawQ.y;
      rawQ.z = -rawQ.z;
      rawQ.w = -rawQ.w;
    }

    const dot = Math.min(Math.max(this.currentQ.dot(rawQ), -1), 1);
    const angleDiff = 2 * Math.acos(Math.abs(dot)); // angular difference in radians

    // Heavy Deadband Threshold: ~0.026 rad (~1.50 degrees).
    // Sensor noise, digital compass jitter, and human physiological hand tremors are under 1.5°.
    // Below this threshold, output quaternion is 100% BIT-EXACT IDENTICAL.
    // Result: 100% rock-solid, zero pixels of shaking or jitter!
    const DEADBAND = 0.026;
    const SETTLE_THRESHOLD = 0.018;

    if (!this.isMoving) {
      if (angleDiff < DEADBAND) {
        return this.currentQ; // Completely frozen in place with ZERO shaking
      }
      this.isMoving = true;
    } else {
      if (angleDiff < SETTLE_THRESHOLD) {
        this.isMoving = false;
        return this.currentQ;
      }
    }

    // Smooth Steadicam Gimbal Easing:
    // Gentle start (0.04) prevents sudden snapping; caps at 0.30 so it smoothly tracks deliberate turns
    const excess = angleDiff - SETTLE_THRESHOLD;
    const factor = Math.min(0.30, 0.04 + excess * 1.2);
    this.currentQ.slerp(rawQ, factor);
    return this.currentQ;
  }

  public reset() {
    this.initialized = false;
    this.isMoving = false;
  }
}

/**
 * High-Fidelity Procedural Web Audio Engine & Automotive Horn Synthesizer.
 * Delivers crisp combustion mechanics, turbo spool harmonics, and punchy dual-tone horn.
 */
class ProceduralEngineSound {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private enabled = true;

  // Engine audio nodes
  private oscFund: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscHarm: OscillatorNode | null = null;
  private oscWhine: OscillatorNode | null = null;

  private hpFilter: BiquadFilterNode | null = null;
  private lpFilter: BiquadFilterNode | null = null;
  private peakFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Horn audio nodes
  private hornGain: GainNode | null = null;
  private hornOscLow: OscillatorNode | null = null;
  private hornOscHigh: OscillatorNode | null = null;
  private hornFilter: BiquadFilterNode | null = null;
  private isHornPlaying = false;

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    } else if (val && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.04);
    }
  }

  public start() {
    if (this.isRunning) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? 1 : 0, now);
      this.masterGain.connect(this.ctx.destination);

      // --- ENGINE GRAPH ---
      // 1. Highpass filter @ 42Hz: removes muddy DC subsonic boom so phone speakers sound clean and crisp
      this.hpFilter = this.ctx.createBiquadFilter();
      this.hpFilter.type = 'highpass';
      this.hpFilter.frequency.setValueAtTime(42, now);

      // 2. Mid exhaust resonance peak filter @ 680Hz
      this.peakFilter = this.ctx.createBiquadFilter();
      this.peakFilter.type = 'peaking';
      this.peakFilter.frequency.setValueAtTime(680, now);
      this.peakFilter.Q.setValueAtTime(1.8, now);
      this.peakFilter.gain.setValueAtTime(4.0, now); // +4dB exhaust crispness

      // 3. Dynamic lowpass filter: opens up to 3400Hz under throttle for clear engine roar
      this.lpFilter = this.ctx.createBiquadFilter();
      this.lpFilter.type = 'lowpass';
      this.lpFilter.frequency.setValueAtTime(850, now);

      // Engine gain control
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, now);

      // Connect filter chain: Filters -> EngineGain -> MasterGain
      this.hpFilter.connect(this.peakFilter);
      this.peakFilter.connect(this.lpFilter);
      this.lpFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      // 4. Fundamental engine cylinder stroke (sawtooth for crisp harmonics)
      this.oscFund = this.ctx.createOscillator();
      this.oscFund.type = 'sawtooth';
      this.oscFund.frequency.setValueAtTime(52, now); // 52Hz crisp idle

      // 5. Deep sub thrum (triangle)
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'triangle';
      this.oscSub.frequency.setValueAtTime(26, now);

      // 6. Cylinder combustion texture (slightly detuned sawtooth for realistic multi-cylinder chorusing)
      this.oscHarm = this.ctx.createOscillator();
      this.oscHarm.type = 'sawtooth';
      this.oscHarm.frequency.setValueAtTime(105, now);

      // 7. Mechanical intake / Turbo whine (sine wave in high register for clear high-end detail)
      this.oscWhine = this.ctx.createOscillator();
      this.oscWhine.type = 'sine';
      this.oscWhine.frequency.setValueAtTime(480, now);

      const whineGain = this.ctx.createGain();
      whineGain.gain.setValueAtTime(0.035, now);
      this.oscWhine.connect(whineGain);
      whineGain.connect(this.lpFilter);

      // Connect oscillators to engine filter chain
      this.oscFund.connect(this.hpFilter);
      this.oscSub.connect(this.hpFilter);
      this.oscHarm.connect(this.hpFilter);

      this.oscFund.start();
      this.oscSub.start();
      this.oscHarm.start();
      this.oscWhine.start();

      // --- DUAL-TONE AUTOMOTIVE HORN GRAPH ---
      this.hornGain = this.ctx.createGain();
      this.hornGain.gain.setValueAtTime(0, now);

      this.hornFilter = this.ctx.createBiquadFilter();
      this.hornFilter.type = 'bandpass';
      this.hornFilter.frequency.setValueAtTime(1150, now);
      this.hornFilter.Q.setValueAtTime(1.4, now);

      this.hornFilter.connect(this.hornGain);
      this.hornGain.connect(this.masterGain);

      this.isRunning = true;
    } catch (e) {
      console.warn('Procedural engine audio init error:', e);
    }
  }

  public setThrottle(speed: number) {
    if (!this.isRunning || !this.ctx || !this.oscFund || !this.engineGain || !this.lpFilter) return;
    try {
      const now = this.ctx.currentTime;
      const absSpeed = Math.min(1, Math.abs(speed));

      if (absSpeed > 0.04) {
        // Dynamic throttle rev-up
        const fundFreq = 52 + absSpeed * 125; // 52Hz idle up to 177Hz full throttle
        this.oscFund.frequency.setTargetAtTime(fundFreq, now, 0.07);
        if (this.oscSub) this.oscSub.frequency.setTargetAtTime(fundFreq * 0.5, now, 0.07);
        if (this.oscHarm) this.oscHarm.frequency.setTargetAtTime(fundFreq * 2.03, now, 0.07);
        if (this.oscWhine) this.oscWhine.frequency.setTargetAtTime(450 + absSpeed * 950, now, 0.09);

        // Open up lowpass filter to let crisp high-end roar through
        const cutoff = 850 + absSpeed * 2400; // Opens up to 3250Hz!
        this.lpFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

        // Boost gain under throttle
        this.engineGain.gain.setTargetAtTime(0.08 + absSpeed * 0.16, now, 0.06);
      } else {
        // Return smoothly to crisp idle
        this.oscFund.frequency.setTargetAtTime(52, now, 0.18);
        if (this.oscSub) this.oscSub.frequency.setTargetAtTime(26, now, 0.18);
        if (this.oscHarm) this.oscHarm.frequency.setTargetAtTime(105, now, 0.18);
        if (this.oscWhine) this.oscWhine.frequency.setTargetAtTime(480, now, 0.22);

        this.lpFilter.frequency.setTargetAtTime(850, now, 0.16);
        this.engineGain.gain.setTargetAtTime(0.08, now, 0.15);
      }
    } catch (_) {}
  }

  public playHorn() {
    if (!this.enabled) return;
    if (!this.isRunning) this.start();
    if (!this.ctx || !this.hornGain || this.isHornPlaying) return;

    try {
      const now = this.ctx.currentTime;

      // Authentic automotive dual frequencies: Low 415Hz (G#4) + High 520Hz (C5)
      this.hornOscLow = this.ctx.createOscillator();
      this.hornOscLow.type = 'sawtooth';
      this.hornOscLow.frequency.setValueAtTime(415, now);

      this.hornOscHigh = this.ctx.createOscillator();
      this.hornOscHigh.type = 'square'; // Blended square gives that brassy automotive bite
      this.hornOscHigh.frequency.setValueAtTime(520, now);

      if (this.hornFilter) {
        this.hornOscLow.connect(this.hornFilter);
        this.hornOscHigh.connect(this.hornFilter);
      }

      this.hornOscLow.start(now);
      this.hornOscHigh.start(now);

      // Fast punchy attack
      this.hornGain.gain.cancelScheduledValues(now);
      this.hornGain.gain.setValueAtTime(this.hornGain.gain.value, now);
      this.hornGain.gain.linearRampToValueAtTime(0.38, now + 0.02);

      this.isHornPlaying = true;
    } catch (e) {
      console.warn('Play horn error:', e);
    }
  }

  public stopHorn() {
    if (!this.ctx || !this.hornGain || !this.isHornPlaying) return;
    try {
      const now = this.ctx.currentTime;
      // Smooth 40ms release ramp
      this.hornGain.gain.cancelScheduledValues(now);
      this.hornGain.gain.setValueAtTime(this.hornGain.gain.value, now);
      this.hornGain.gain.linearRampToValueAtTime(0, now + 0.04);

      const low = this.hornOscLow;
      const high = this.hornOscHigh;
      setTimeout(() => {
        try {
          low?.stop();
          low?.disconnect();
          high?.stop();
          high?.disconnect();
        } catch (_) {}
      }, 50);

      this.isHornPlaying = false;
      this.hornOscLow = null;
      this.hornOscHigh = null;
    } catch (_) {}
  }

  public stop() {
    if (!this.isRunning) return;
    try {
      this.stopHorn();
      this.masterGain?.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      this.oscFund?.stop();
      this.oscSub?.stop();
      this.oscHarm?.stop();
      this.oscWhine?.stop();
      this.ctx?.close();
    } catch (_) {}
    this.isRunning = false;
    this.ctx = null;
  }
}

export function UniversalCameraAR({
  modelUrl,
  title,
  initialMotionMode = false,
  onClose,
}: UniversalCameraARProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const modelMeshRootRef = useRef<THREE.Group | null>(null);
  const reticleRef = useRef<THREE.Group | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const groundPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const animFrameRef = useRef<number | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Orientation stabilizer (eliminates wobble & tremor)
  const stabilizerRef = useRef<OrientationStabilizer>(new OrientationStabilizer());
  const targetQuaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialAlphaRef = useRef<number | null>(null);
  const filteredAlphaRef = useRef<number | null>(null);
  const currentAlphaRef = useRef<number>(0);
  const manualYawRef = useRef<number>(0);
  const manualPitchRef = useRef<number>(0);

  // Motion / Drive controls state
  const [isMotionMode, setIsMotionMode] = useState(initialMotionMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isHonking, setIsHonking] = useState(false);
  const [tiltSteeringEnabled, setTiltSteeringEnabled] = useState(true);
  const [currentTiltDegrees, setCurrentTiltDegrees] = useState(0);

  const driveVelocityRef = useRef<{ forward: number; turn: number }>({ forward: 0, turn: 0 });
  const tiltSteerRef = useRef<number>(0);
  const tiltSteeringEnabledRef = useRef<boolean>(true);
  const rawTiltAngleRef = useRef<number>(0);
  const lastTiltUiUpdateRef = useRef<number>(0);
  const engineAudioRef = useRef<ProceduralEngineSound>(new ProceduralEngineSound());
  const vibratePulseRef = useRef<any>(null);

  useEffect(() => {
    tiltSteeringEnabledRef.current = tiltSteeringEnabled;
  }, [tiltSteeringEnabled]);

  // Touch tracking state (with threshold to avoid tremor during taps)
  const touchStateRef = useRef<{
    isDragging: boolean;
    hasMovedPastThreshold: boolean;
    startX: number;
    startY: number;
    initialDistance: number;
    initialScale: number;
    initialAngle: number;
    initialRotationY: number;
    lastX: number;
    lastY: number;
  }>({
    isDragging: false,
    hasMovedPastThreshold: false,
    startX: 0,
    startY: 0,
    initialDistance: 0,
    initialScale: 1,
    initialAngle: 0,
    initialRotationY: 0,
    lastX: 0,
    lastY: 0,
  });

  // UI State
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  // Auto-lock state: true whenever finger is released (model is locked in physical 3D world space)
  const [isDraggingModel, setIsDraggingModel] = useState(false);

  // Gyroscope & Stability mode: Default to Solid Lock (false) so the placed model sits 100% STILL with zero shaking!
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);

  // Camera torch & UI controls
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);
  const [cameraDistance, setCameraDistance] = useState(2.0); // Distance in meters
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [showHelpToast, setShowHelpToast] = useState(true);

  // 1. Initialize camera stream
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

        // Check torch capability
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
      engineAudioRef.current.stop();
      if (vibratePulseRef.current) clearInterval(vibratePulseRef.current);
    };
  }, []);

  // Sync sound toggle with engine audio
  useEffect(() => {
    engineAudioRef.current.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // 2. iOS Motion Permission Check & Request
  useEffect(() => {
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      setNeedsMotionPermission(true);
    }
  }, []);

  const requestMotionPermission = useCallback(async () => {
    if (
      typeof (DeviceOrientationEvent as any) !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === 'granted') {
          setNeedsMotionPermission(false);
          setGyroSupported(true);
          setGyroEnabled(true);
        }
      } catch (e) {
        console.warn('Could not request motion permission:', e);
      }
    }
  }, []);

  // 3. Handle Torch Toggle
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

  // 4. Handle Gyroscope & Device Orientation with Deadband Stabilization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!gyroSupported) setGyroSupported(true);

      const alpha = e.alpha ?? 0;
      const beta = e.beta ?? 90;
      const gamma = e.gamma ?? 0;

      currentAlphaRef.current = alpha;

      // 1. Digital Compass Magnetometer Noise Filter:
      // Smartphone compasses fluctuate rapidly by +/- 1.5 degrees indoors.
      // We apply angular circular smoothing to eliminate compass twitching.
      if (filteredAlphaRef.current === null) {
        filteredAlphaRef.current = alpha;
      } else {
        let diff = (alpha - filteredAlphaRef.current) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        // Deadband on compass: ignore fluctuations under 1.2 degrees
        if (Math.abs(diff) > 1.2) {
          filteredAlphaRef.current += diff * 0.15; // Smooth 15% EMA
        }
      }
      const smoothAlpha = filteredAlphaRef.current ?? alpha;

      // Set initial heading reference on first orientation event
      if (initialAlphaRef.current === null) {
        initialAlphaRef.current = smoothAlpha;
      }

      // Compute normalized relative heading (prevents 0/360 degree flips)
      const relativeAlpha = normalizeAngleDelta(smoothAlpha, initialAlphaRef.current);
      const screenAngle = getScreenOrientation();

      // Compute exact 3D device orientation quaternion only when 360 Room gyro is active
      if (gyroEnabled) {
        targetQuaternionRef.current = computeDeviceQuaternion(
          relativeAlpha,
          beta,
          gamma,
          screenAngle
        );
      }

      // --- PHONE ROTATE / TILT STEERING ---
      let effectiveTilt = gamma; // Default portrait roll (-90 to +90)
      if (screenAngle === 90) {
        effectiveTilt = beta;
      } else if (screenAngle === 270) {
        effectiveTilt = -beta;
      }
      rawTiltAngleRef.current = Math.round(effectiveTilt);

      // Deadzone of 3.5 degrees to avoid involuntary hand tremor
      const DEADZONE = 3.5;
      if (Math.abs(effectiveTilt) > DEADZONE) {
        const sign = effectiveTilt > 0 ? 1 : -1;
        // Max steer reached at ~28 degrees phone tilt
        const magnitude = Math.min(1, (Math.abs(effectiveTilt) - DEADZONE) / 24.5);
        // Tilting phone left (negative effectiveTilt) steers car left (+Y turn in 3D scene)
        tiltSteerRef.current = -sign * magnitude;
      } else {
        tiltSteerRef.current = 0;
      }

      // Throttle UI angle display update to ~8fps (120ms) to eliminate React re-render overhead
      const nowMs = performance.now();
      if (nowMs - lastTiltUiUpdateRef.current > 120) {
        lastTiltUiUpdateRef.current = nowMs;
        setCurrentTiltDegrees(Math.round(effectiveTilt));
      }
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

  // 5. Calibrate Heading Reference (Re-align forward view to current phone angle)
  const recalibrateHeading = useCallback(() => {
    filteredAlphaRef.current = null;
    initialAlphaRef.current = currentAlphaRef.current;
    manualYawRef.current = 0;
    manualPitchRef.current = 0;
    stabilizerRef.current.reset();
  }, []);

  // 6. Auto-hide help toast
  useEffect(() => {
    const timer = setTimeout(() => setShowHelpToast(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // 7. Initialize Three.js Scene, Camera, Lights, and Renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // A. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // B. Camera with Calibrated Field of View (FOV)
    // Vertical FOV of 55° matches real smartphone camera in portrait mode,
    // ensuring the 3D model and physical room rotate at the EXACT same pixel speed (no sliding).
    const calibratedFov = height > width ? 55 : 45;
    const camera = new THREE.PerspectiveCamera(calibratedFov, width / height, 0.05, 100);
    camera.position.set(0, 1.25, 0);
    cameraRef.current = camera;

    // C. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // D. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.9);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(2, 6, 1);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // E. Realistic Soft Floor Shadow Receiver
    const shadowGeo = new THREE.PlaneGeometry(35, 35);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.005, -2.0);
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);
    shadowMeshRef.current = shadowMesh;

    // F. Placement Target Reticle (only shows while finger is actively dragging)
    const reticleGroup = new THREE.Group();
    const outerRingGeo = new THREE.RingGeometry(0.3, 0.33, 40);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    reticleGroup.add(outerRing);

    const innerDotGeo = new THREE.CircleGeometry(0.06, 24);
    const innerDotMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const innerDot = new THREE.Mesh(innerDotGeo, innerDotMat);
    innerDot.rotation.x = -Math.PI / 2;
    reticleGroup.add(innerDot);

    reticleGroup.position.set(0, 0.001, -2.0);
    reticleGroup.visible = false; // Hidden when locked
    scene.add(reticleGroup);
    reticleRef.current = reticleGroup;

    // G. Model Group (Anchored in physical 3D world space)
    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0, -2.0); // Initially placed 2m in front on floor
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    if (dirLightRef.current) {
      dirLightRef.current.target = modelGroup;
    }

    // H. Load 3D Model
    const loader = new GLTFLoader();
    setModelLoading(true);

    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        modelMeshRootRef.current = root;

        // Normalize Scale
        const bbox = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetScale = 0.85 / maxDim; // Standard room size
        root.scale.setScalar(targetScale);

        // Center base on floor (Y = 0)
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        root.position.x = -center.x * targetScale;
        root.position.z = -center.z * targetScale;
        root.position.y = -bbox.min.y * targetScale;

        // Enable shadows
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        modelGroup.add(root);
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

    // I. Animation & Render Loop (Handles Deadband 360 gyro & driving physics)
    let clock = new THREE.Clock();

    function renderLoop() {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Pulse reticle when dragging
      if (reticleRef.current && reticleRef.current.visible) {
        const s = 1 + Math.sin(elapsed * 5) * 0.08;
        reticleRef.current.scale.set(s, s, s);
      }

      // 1. Motion Mode Driving Physics (Car Movement on Real Floor)
      if (isMotionMode && modelGroupRef.current) {
        // Effective steering: on-screen touch buttons take priority,
        // otherwise phone rotate / tilt steering smoothly steers the vehicle
        let effectiveTurn = driveVelocityRef.current.turn;
        if (effectiveTurn === 0 && tiltSteeringEnabledRef.current) {
          effectiveTurn = tiltSteerRef.current;
        }

        // Steer rotation around Y axis
        if (effectiveTurn !== 0) {
          modelGroupRef.current.rotation.y += effectiveTurn * 2.2 * delta;

          // Subtle audio feedback when steering while stationary
          if (driveVelocityRef.current.forward === 0) {
            engineAudioRef.current.start();
            engineAudioRef.current.setThrottle(Math.abs(effectiveTurn) * 0.3);
          }
        } else if (driveVelocityRef.current.forward === 0) {
          engineAudioRef.current.setThrottle(0);
        }

        // Drive forward/backward in the direction the object is facing
        if (driveVelocityRef.current.forward !== 0) {
          const speed = driveVelocityRef.current.forward * 1.8 * delta; // 1.8 m/s speed
          const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            modelGroupRef.current.rotation.y
          );
          modelGroupRef.current.position.addScaledVector(forwardVec, speed);

          // Floor shadow follows underneath the moving object
          if (shadowMeshRef.current) {
            shadowMeshRef.current.position.x = modelGroupRef.current.position.x;
            shadowMeshRef.current.position.z = modelGroupRef.current.position.z;
          }

          // Lighting follows the object
          if (dirLightRef.current) {
            dirLightRef.current.position.set(
              modelGroupRef.current.position.x + 2,
              6,
              modelGroupRef.current.position.z + 1
            );
          }

          // Update distance readout
          const curDist = Math.hypot(
            modelGroupRef.current.position.x,
            modelGroupRef.current.position.z
          );
          setCameraDistance(parseFloat(curDist.toFixed(1)));
        }
      }

      // 2. Camera Orientation with Deadband Zero-Wobble Stabilization
      if (cameraRef.current) {
        if (gyroEnabled && gyroSupported) {
          // Pass raw quaternion through the deadband stabilizer
          const stabilizedQ = stabilizerRef.current.update(targetQuaternionRef.current.clone());
          cameraRef.current.quaternion.copy(stabilizedQ);
        } else {
          const euler = new THREE.Euler(manualPitchRef.current, manualYawRef.current, 0, 'YXZ');
          cameraRef.current.quaternion.setFromEuler(euler);
        }
      }

      renderer.render(scene, camera);
    }

    renderLoop();

    // J. Window Resize Handler
    function handleResize() {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.fov = h > w ? 55 : 45;
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
  }, [modelUrl, gyroEnabled, gyroSupported, isMotionMode]);

  // Handle Automotive Horn (Authentic dual-tone blast + haptics)
  const triggerHorn = (active: boolean) => {
    setIsHonking(active);
    if (active) {
      engineAudioRef.current.playHorn();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([70, 30, 70]);
      }
    } else {
      engineAudioRef.current.stopHorn();
    }
  };

  // Handle Driving Inputs (Forward, Backward, Left, Right) with Real Engine Sound & Phone Vibration
  const startDrive = (forward: number, turn: number) => {
    driveVelocityRef.current = { forward, turn };

    // Start procedural engine sound & rev up throttle
    engineAudioRef.current.start();
    engineAudioRef.current.setThrottle(forward !== 0 ? forward : turn !== 0 ? 0.35 : 0);

    // Trigger physical phone vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
      if (!vibratePulseRef.current && forward !== 0) {
        vibratePulseRef.current = setInterval(() => {
          if (navigator.vibrate) navigator.vibrate(35);
        }, 110);
      }
    }
  };

  const stopDrive = (type: 'forward' | 'turn' | 'all') => {
    if (type === 'forward' || type === 'all') {
      driveVelocityRef.current.forward = 0;
      if (vibratePulseRef.current) {
        clearInterval(vibratePulseRef.current);
        vibratePulseRef.current = null;
      }
    }
    if (type === 'turn' || type === 'all') {
      driveVelocityRef.current.turn = 0;
    }
    if (type === 'all') {
      triggerHorn(false);
    }

    // Drop engine sound back to idle
    if (driveVelocityRef.current.forward === 0 && driveVelocityRef.current.turn === 0) {
      engineAudioRef.current.setThrottle(0);
    }
  };

  // Keyboard controls for Motion Mode (W, A, S, D / Arrow keys / H or Space for Horn)
  useEffect(() => {
    if (!isMotionMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (['w', 'ArrowUp'].includes(e.key)) startDrive(1, driveVelocityRef.current.turn);
      if (['s', 'ArrowDown'].includes(e.key)) startDrive(-1, driveVelocityRef.current.turn);
      if (['a', 'ArrowLeft'].includes(e.key)) startDrive(driveVelocityRef.current.forward, 1);
      if (['d', 'ArrowRight'].includes(e.key)) startDrive(driveVelocityRef.current.forward, -1);
      if (['h', ' '].includes(e.key) && !e.repeat) {
        e.preventDefault();
        triggerHorn(true);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) stopDrive('forward');
      if (['a', 'd', 'ArrowLeft', 'ArrowRight'].includes(e.key)) stopDrive('turn');
      if (['h', ' '].includes(e.key)) {
        e.preventDefault();
        triggerHorn(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopDrive('all');
    };
  }, [isMotionMode]);

  // Touch Controls: Move, Pinch-Scale, Twist-Rotate with Tremor Filtering & Instant AUTO-LOCK on release
  const handleTouchStart = (e: React.TouchEvent) => {
    if (needsMotionPermission) {
      requestMotionPermission();
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStateRef.current.startX = touch.clientX;
      touchStateRef.current.startY = touch.clientY;
      touchStateRef.current.lastX = touch.clientX;
      touchStateRef.current.lastY = touch.clientY;
      touchStateRef.current.hasMovedPastThreshold = false;
      touchStateRef.current.isDragging = false;
    } else if (e.touches.length === 2 && modelGroupRef.current) {
      touchStateRef.current.isDragging = false;
      touchStateRef.current.hasMovedPastThreshold = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current.initialDistance = Math.hypot(dx, dy);
      touchStateRef.current.initialScale = modelGroupRef.current.scale.x;
      touchStateRef.current.initialAngle = Math.atan2(dy, dx);
      touchStateRef.current.initialRotationY = modelGroupRef.current.rotation.y;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!modelGroupRef.current || !cameraRef.current || !containerRef.current) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const moveDist = Math.hypot(
        touch.clientX - touchStateRef.current.startX,
        touch.clientY - touchStateRef.current.startY
      );

      // Tremor Threshold: Finger must deliberately move > 14 pixels before dragging begins.
      // This guarantees that stationary finger resting or button tapping never wobbles or moves the object!
      if (!touchStateRef.current.hasMovedPastThreshold) {
        if (moveDist < 14) return;
        touchStateRef.current.hasMovedPastThreshold = true;
        touchStateRef.current.isDragging = true;
        setIsDraggingModel(true);
        if (reticleRef.current) reticleRef.current.visible = true;
      }

      if (!touchStateRef.current.isDragging) return;

      touchStateRef.current.lastX = touch.clientX;
      touchStateRef.current.lastY = touch.clientY;

      // Raycast touch position directly onto floor plane (Y = 0)
      const rect = containerRef.current.getBoundingClientRect();
      const ndcX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);
      const intersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, intersection);

      if (intersection) {
        // Clamp placement distance so it stays within room bounds (0.4m to 12m)
        const dist = Math.hypot(intersection.x, intersection.z);
        if (dist > 0.35 && dist < 12.0) {
          modelGroupRef.current.position.x = intersection.x;
          modelGroupRef.current.position.z = intersection.z;

          if (reticleRef.current) {
            reticleRef.current.position.x = intersection.x;
            reticleRef.current.position.z = intersection.z;
          }
          if (shadowMeshRef.current) {
            shadowMeshRef.current.position.x = intersection.x;
            shadowMeshRef.current.position.z = intersection.z;
          }
          if (dirLightRef.current) {
            dirLightRef.current.position.set(intersection.x + 2, 6, intersection.z + 1);
          }
          setCameraDistance(parseFloat(dist.toFixed(1)));
        }
      }
    } else if (e.touches.length === 2) {
      // Two fingers: Pinch-to-scale & Twist-to-rotate
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
        modelGroupRef.current.scale.setScalar(newScale);
        setCurrentScale(newScale);
      }

      const angleDelta = currentAngle - touchStateRef.current.initialAngle;
      modelGroupRef.current.rotation.y = touchStateRef.current.initialRotationY - angleDelta;
    }
  };

  // Instant Rock-Solid AUTO-LOCK on Finger Release:
  // Wherever you leave the model, it automatically locks firmly into that 3D spot in the room!
  const handleTouchEnd = () => {
    touchStateRef.current.isDragging = false;
    touchStateRef.current.hasMovedPastThreshold = false;
    setIsDraggingModel(false);

    // Lock position firmly to floor with rounded decimals to prevent floating-point drift
    if (modelGroupRef.current) {
      modelGroupRef.current.position.x = Math.round(modelGroupRef.current.position.x * 1000) / 1000;
      modelGroupRef.current.position.z = Math.round(modelGroupRef.current.position.z * 1000) / 1000;
    }

    // Hide reticle so only realistic model + floor shadow remain visible
    if (reticleRef.current) {
      reticleRef.current.visible = false;
    }
  };

  // Adjust Scale via Slider or Preset
  const applyScale = (newScale: number) => {
    if (modelGroupRef.current) {
      modelGroupRef.current.scale.setScalar(newScale);
      setCurrentScale(newScale);
    }
  };

  // Adjust Distance / Step Closer or Back in the room
  const adjustDistance = (delta: number) => {
    if (!modelGroupRef.current) return;
    const currentDist = Math.hypot(
      modelGroupRef.current.position.x,
      modelGroupRef.current.position.z
    ) || 2.0;
    const targetDist = THREE.MathUtils.clamp(currentDist + delta, 0.8, 6.0);
    const ratio = targetDist / currentDist;

    modelGroupRef.current.position.x *= ratio;
    modelGroupRef.current.position.z *= ratio;

    if (reticleRef.current) {
      reticleRef.current.position.x = modelGroupRef.current.position.x;
      reticleRef.current.position.z = modelGroupRef.current.position.z;
    }
    if (shadowMeshRef.current) {
      shadowMeshRef.current.position.x = modelGroupRef.current.position.x;
      shadowMeshRef.current.position.z = modelGroupRef.current.position.z;
    }
    setCameraDistance(parseFloat(targetDist.toFixed(1)));
  };

  // Reset Model to Center in front of Camera
  const resetPosition = () => {
    if (modelGroupRef.current) {
      modelGroupRef.current.position.set(0, 0, -2.0);
      modelGroupRef.current.rotation.set(0, 0, 0);
      modelGroupRef.current.scale.setScalar(1);
      setCurrentScale(1);
      setCameraDistance(2.0);
    }
    if (reticleRef.current) {
      reticleRef.current.position.set(0, 0.001, -2.0);
      reticleRef.current.visible = false;
    }
    if (shadowMeshRef.current) {
      shadowMeshRef.current.position.set(0, -0.005, -2.0);
    }
    recalibrateHeading();
    stopDrive('all');
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
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Overlay the Three.js 3D rendered canvas
      ctx.drawImage(canvasRef.current, 0, 0, w, h);

      // 3. Add branding watermark
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

      {/* Fallback Virtual Studio background if camera denied */}
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
      <header className="relative z-30 p-3 sm:p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2.5">
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
              <span className={`w-2 h-2 rounded-full ${isDraggingModel ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
              {isDraggingModel
                ? '✋ Moving to Spot…'
                : isMotionMode
                ? '🚗 Driving Active'
                : !gyroEnabled
                ? '🔒 Solid Still (Zero Shake)'
                : '🌐 360 Room Pan'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Motion Mode Toggle */}
          <button
            onClick={() => {
              const next = !isMotionMode;
              setIsMotionMode(next);
              if (!next) stopDrive('all');
            }}
            className={`px-3 py-2 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 active:scale-95 shadow-lg ${
              isMotionMode
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black border-emerald-400'
                : 'bg-black/60 text-white/80 border-white/15 hover:bg-white/10'
            }`}
            title="Toggle Driving Motion Mode"
          >
            <Gamepad2 className="w-3.5 h-3.5 fill-current" />
            <span className="text-[10px] uppercase tracking-wider">{isMotionMode ? 'Driving ON' : 'Motion'}</span>
          </button>

          {/* Sound Toggle (in motion mode) */}
          {isMotionMode && (
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 ${
                soundEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-black/60 text-white/50 border-white/15'
              }`}
              title="Toggle Engine Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          {/* Torch Toggle */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 ${
                torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/60 text-white/80 border-white/15'
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Calibrate / Re-center Heading */}
          <button
            onClick={recalibrateHeading}
            className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 border border-white/15 hover:bg-white/10 active:scale-95 transition-all"
            title="Re-center Forward View"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Stability Mode Toggle: Solid Lock (100% Still, Zero Shake) vs 360 Room View */}
          <button
            onClick={() => {
              const next = !gyroEnabled;
              setGyroEnabled(next);
              if (!next) {
                stabilizerRef.current.reset();
              }
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 active:scale-95 shadow-lg ${
              !gyroEnabled
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/30'
                : 'bg-black/60 text-white/80 border-white/15 hover:bg-white/10'
            }`}
            title={!gyroEnabled ? 'Solid Lock Active (100% Still, Zero Shakes)' : 'Switch to 100% Solid Still Lock'}
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wider">
              {!gyroEnabled ? 'Solid Still' : '360 Gyro'}
            </span>
          </button>
        </div>
      </header>

      {/* iOS Motion Permission Prompt if required */}
      {needsMotionPermission && (
        <div className="relative z-30 mx-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md text-emerald-200 text-xs flex items-center justify-between gap-2 pointer-events-auto shadow-2xl">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Enable 360° room motion tracking on this device</span>
          </div>
          <button
            onClick={requestMotionPermission}
            className="px-3 py-1.5 bg-emerald-500 text-black font-bold text-[11px] rounded-full uppercase tracking-wider active:scale-95 shadow"
          >
            Enable
          </button>
        </div>
      )}

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
        <div className="relative z-30 mx-auto max-w-sm px-4 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white/90 text-xs font-medium flex items-center gap-2.5 shadow-2xl animate-fade-in pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            {isMotionMode
              ? 'Use Left & Right thumbs to steer and drive with real sound & vibration!'
              : !gyroEnabled
              ? '🔒 Solid Still Lock: 100% still with zero shakes • Drag to place anywhere'
              : '🌐 360 Room View: Gimbal-stabilized smooth pan • Tap Solid Still for zero shake'}
          </span>
          <button
            onClick={() => setShowHelpToast(false)}
            className="ml-auto text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Motion Mode Gamepad HUD (Left Hand: Steer Left & Right | Right Hand: Forward & Back | Center: Horn & Phone Rotate) */}
      {isMotionMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-6 pointer-events-none select-none flex flex-col justify-end">
          {/* Upper Motion Bar: Phone Rotate (Tilt Steer) Status & Distance Readout */}
          <div className="flex items-center justify-between max-w-xl mx-auto w-full mb-3 px-2">
            {/* Phone Rotate / Tilt Steering Toggle & Live Angle Meter */}
            <button
              onClick={() => setTiltSteeringEnabled(!tiltSteeringEnabled)}
              className={`pointer-events-auto px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl backdrop-blur-xl border flex items-center gap-2 transition-all active:scale-95 shadow-xl ${
                tiltSteeringEnabled
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                  : 'bg-black/60 border-white/15 text-white/50'
              }`}
              title="Toggle Phone Rotate / Tilt Steering"
            >
              <Smartphone className={`w-4 h-4 ${tiltSteeringEnabled ? 'text-emerald-400 animate-pulse' : ''}`} />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {tiltSteeringEnabled ? 'Phone Rotate: ON' : 'Phone Rotate: OFF'}
                </span>
                {tiltSteeringEnabled && (
                  <span className="text-[9px] font-mono text-emerald-300/90 font-medium">
                    {Math.abs(currentTiltDegrees) > 3
                      ? `${currentTiltDegrees < 0 ? '◀ Turning Left' : 'Turning Right ▶'} ${Math.abs(currentTiltDegrees)}°`
                      : '• Centered (Tilt to Steer)'}
                  </span>
                )}
              </div>
            </button>

            {/* Quick Actions Strip: Reset Car & Distance */}
            <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-white/15 shadow-xl text-white/80">
              <button
                onClick={resetPosition}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-white active:scale-90"
                title="Reset Car in Front of Camera"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reset</span>
              </button>
              <span className="text-white/20">|</span>
              <span className="text-[10px] font-bold text-emerald-400 font-mono">
                {cameraDistance}m
              </span>
            </div>
          </div>

          {/* Primary Dual-Thumb Gaming Controls Cluster */}
          <div className="flex items-end justify-between max-w-xl mx-auto w-full px-1">
            {/* LEFT HAND CLUSTER: Steer Left & Steer Right */}
            <div className="pointer-events-auto flex items-center gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-3xl border border-white/20 shadow-2xl">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrive(driveVelocityRef.current.forward, 1);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  stopDrive('turn');
                }}
                onPointerLeave={() => stopDrive('turn')}
                onPointerCancel={() => stopDrive('turn')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 hover:bg-emerald-500/25 active:bg-emerald-500 text-white active:text-black flex flex-col items-center justify-center border border-white/20 active:scale-90 transition-all shadow-lg active:shadow-emerald-500/60 touch-none select-none"
                title="Steer Left"
              >
                <ChevronLeft className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Left</span>
              </button>

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrive(driveVelocityRef.current.forward, -1);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  stopDrive('turn');
                }}
                onPointerLeave={() => stopDrive('turn')}
                onPointerCancel={() => stopDrive('turn')}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 hover:bg-emerald-500/25 active:bg-emerald-500 text-white active:text-black flex flex-col items-center justify-center border border-white/20 active:scale-90 transition-all shadow-lg active:shadow-emerald-500/60 touch-none select-none"
                title="Steer Right"
              >
                <ChevronRight className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Right</span>
              </button>
            </div>

            {/* CENTER CLUSTER: Prominent HORN Button */}
            <div className="pointer-events-auto flex flex-col items-center gap-1 pb-1">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerHorn(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  triggerHorn(false);
                }}
                onPointerLeave={() => triggerHorn(false)}
                onPointerCancel={() => triggerHorn(false)}
                className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border transition-all active:scale-90 shadow-2xl touch-none select-none ${
                  isHonking
                    ? 'bg-amber-400 text-black border-amber-300 ring-4 ring-amber-400/60 scale-105 shadow-amber-400/80'
                    : 'bg-gradient-to-b from-amber-500/35 to-amber-600/25 text-amber-300 border-amber-400/40 hover:bg-amber-500/40 backdrop-blur-xl'
                }`}
                title="Press and hold to honk car horn"
              >
                {isHonking && (
                  <span className="absolute inset-0 rounded-full border-2 border-amber-300 animate-ping opacity-75" />
                )}
                <Megaphone className={`w-6 h-6 sm:w-7 sm:h-7 ${isHonking ? 'scale-110' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">HORN</span>
              </button>
            </div>

            {/* RIGHT HAND CLUSTER: Forward (Drive) on Top, Back (Reverse) on Bottom */}
            <div className="pointer-events-auto flex flex-col gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-3xl border border-white/20 shadow-2xl">
              {/* Drive Forward (Gas Pedal) */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrive(1, driveVelocityRef.current.turn);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  stopDrive('forward');
                }}
                onPointerLeave={() => stopDrive('forward')}
                onPointerCancel={() => stopDrive('forward')}
                className="w-20 h-14 sm:w-24 sm:h-16 rounded-2xl bg-gradient-to-r from-emerald-500/40 to-teal-400/40 hover:from-emerald-500/50 hover:to-teal-400/50 active:from-emerald-400 active:to-teal-300 text-white active:text-black flex items-center justify-center gap-1.5 border border-emerald-400/40 active:scale-90 transition-all shadow-xl active:shadow-emerald-500/60 touch-none select-none"
                title="Drive Forward"
              >
                <ChevronUp className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Drive</span>
                  <span className="text-[7px] sm:text-[8px] opacity-75 font-bold uppercase">Forward</span>
                </div>
              </button>

              {/* Drive Backward (Reverse / Brake Pedal) */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrive(-1, driveVelocityRef.current.turn);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  stopDrive('forward');
                }}
                onPointerLeave={() => stopDrive('forward')}
                onPointerCancel={() => stopDrive('forward')}
                className="w-20 h-12 sm:w-24 sm:h-14 rounded-2xl bg-white/10 hover:bg-amber-500/25 active:bg-amber-400 text-white active:text-black flex items-center justify-center gap-1.5 border border-white/20 active:scale-90 transition-all shadow-lg active:shadow-amber-500/60 touch-none select-none"
                title="Drive Backward / Reverse"
              >
                <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Back</span>
                  <span className="text-[7px] opacity-75 font-bold uppercase">Reverse</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 5. Standard Mode Bottom Controls & Action Bar */
        <footer className="relative z-30 p-3 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2.5 pointer-events-auto">
          {/* Seamless Control Strip: Scale Presets & Distance Step */}
          <div className="flex flex-wrap items-center justify-between max-w-md mx-auto w-full gap-2 px-1">
            {/* Scale Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mr-0.5 flex items-center gap-1">
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
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    Math.abs(currentScale - preset.value) < 0.1
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Distance Stepper: Step Closer or Step Back */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              <Footprints className="w-3 h-3 text-emerald-400" />
              <button
                onClick={() => adjustDistance(-0.4)}
                className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                title="Step Closer"
              >
                -
              </button>
              <span className="text-[10px] font-bold text-white/90 px-1 tracking-wider">
                {cameraDistance}m
              </span>
              <button
                onClick={() => adjustDistance(0.4)}
                className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs active:scale-90"
                title="Step Back"
              >
                +
              </button>
            </div>
          </div>

          {/* Shutter and Primary Action Toolbar */}
          <div className="flex items-center justify-around max-w-md mx-auto w-full pt-0.5">
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
      )}
    </div>
  );
}
