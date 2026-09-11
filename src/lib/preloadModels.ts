import { useGLTF } from '@react-three/drei';

/** Eagerly fetch common GLBs before Canvas mounts. */
useGLTF.preload('/scifi_drone.glb');
useGLTF.preload('/Human_Avatar_Kishan_Nishad_model.glb');
useGLTF.preload('/models/lamborghini_basic_pbr.glb');
useGLTF.preload('/models/shoes_basic_pbr.glb');
