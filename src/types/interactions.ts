export type InteractionType = 
  | 'OPEN_CLOSE'
  | 'ROTATE'
  | 'TOGGLE'
  | 'SLIDE'
  | 'PULL'
  | 'PUSH'
  | 'MOVE'
  | 'ANIMATION'
  | 'NONE';

export interface AssemblyConstraint {
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  snapDistance: number;
  snapRotationDeg: number;
}

export interface InteractivePart {
  id: string; // Internal mesh name or studioId
  name: string; // Human-readable name (e.g., "Front Door")
  semanticTag: string; // e.g. "Door", "Wheel", "Engine"
  interactionType: InteractionType;
  
  // For open/close, rotate, slide
  axis?: 'X' | 'Y' | 'Z';
  minValue?: number; // e.g. 0 deg
  maxValue?: number; // e.g. 70 deg
  defaultValue?: number;
  
  // For animation triggering
  animationName?: string;
  
  // For snapping/assembly
  isAssemblable?: boolean;
  assemblyConstraint?: AssemblyConstraint;
}

export interface ModelCapabilities {
  animations: boolean;
  interactiveParts: boolean;
  assembly: boolean;
  dismantling: boolean;
  physics: boolean;
  driving: boolean;
}
