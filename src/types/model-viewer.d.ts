import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean | string;
        'camera-controls'?: boolean | string;
        'shadow-intensity'?: string | number;
        'environment-image'?: string;
        exposure?: string | number;
        poster?: string;
        loading?: string;
        reveal?: string;
        'ar-modes'?: string;
        ar?: boolean | string;
        'ar-scale'?: string;
        'camera-orbit'?: string;
        'field-of-view'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'min-field-of-view'?: string;
        'max-field-of-view'?: string;
        'interaction-prompt'?: string;
        'interaction-policy'?: string;
        'auto-rotate-delay'?: string | number;
        'rotation-speed'?: string | number;
      }, HTMLElement>;
    }
  }
}
