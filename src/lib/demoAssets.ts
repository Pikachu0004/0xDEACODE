/** Landing + demo workflow — real assets from /public */

export const DEMO_PROMPT =
  'Photorealistic human avatar for virtual meetings: neutral expression, soft studio lighting, clean PBR materials, subtle subsurface scattering, 4K detail.';

export const DEMO_IMAGE_URL = '/Human_Avatar_Kishan_Nishad_img.png';
export const DEMO_MODEL_URL = '/Human_Avatar_Kishan_Nishad_model.glb';

export type LandingDemoScene = {
  id: string;
  label: string;
  prompt: string;
  imageUrl: string;
  modelUrl: string;
  /** Passed to DroneScene `modelScale` (auto-fit is applied first) */
  modelScale?: number;
};

/** One horizontal hero panel per scene — paired copy + demo (scroll deck) */
export const LANDING_DEMO_SCENES: LandingDemoScene[] = [
  {
    id: 'avatar',
    label: 'Avatar',
    prompt: DEMO_PROMPT,
    imageUrl: DEMO_IMAGE_URL,
    modelUrl: DEMO_MODEL_URL,
  },
  {
    id: 'lambo',
    label: 'Lamborghini',
    prompt:
      'Photorealistic lime sports car for showroom WebAR: glossy paint, studio HDRI, PBR wheels and glass, three-quarter hero framing, driveway-scale AR.',
    imageUrl: '/Lamborgini_image.png',
    modelUrl: '/models/lamborghini_basic_pbr.glb',
    modelScale: 0.9,
  },
  {
    id: 'drone',
    label: 'Drone',
    prompt:
      'Sleek sci-fi delivery drone: matte hull panels, subtle emissive accents, soft rim light, compact silhouette for indoor AR placement tests.',
    imageUrl: '/drone-generated.png',
    modelUrl: '/scifi_drone.glb',
  },
  {
    id: 'shoes',
    label: 'Sneakers',
    prompt:
      'Premium white sneakers on a neutral pedestal: fabric weave, rubber sole micro-detail, soft shadows — ecommerce AR try-on ready.',
    imageUrl: '/Shoes.png',
    modelUrl: '/models/shoes_basic_pbr.glb',
    modelScale: 1.05,
  },
];

export type HeroDeckPanelCopy = {
  /** Two top pills — same layout as slide 1 on every slide */
  badges: readonly [string, string];
  kicker: string;
  /** First line of the hero h1 (same type scale on all slides) */
  heroLead: string;
  /** Rotating gradient accent — short phrases, cycles while slide is active */
  heroAccentPhrases: readonly [string, string, ...string[]];
  subtitle: string;
  bullets: readonly [string, string, string];
  /** Muted pull-quote, border accent (all panels) */
  quote: string;
  /** Second button — contextual per slide */
  secondaryCta: { to: string; label: string };
};

/** VisiARise story per horizontal panel — keep in sync with LANDING_DEMO_SCENES order */
export const HERO_DECK_COPY: HeroDeckPanelCopy[] = [
  {
    badges: ['Sustainable digital-first creation', 'VisiARise · Spatial intelligence'],
    kicker: '01 · Ardya',
    heroLead: 'Build digitally,',
    heroAccentPhrases: [
      'reduce physically',
      'preview in AR',
      'ship with clarity',
      'waste less material',
    ],
    subtitle:
      'One mesh from first prompt to WebAR—no “export and pray.” Ardya turns language and references into a visual you can judge before you build. Same path graduates to WebAR so stakeholders stop guessing from flat mocks.',
    bullets: [
      'Prompt or image → concept frame in the product',
      'Convert to a real GLB you can orbit here',
      'Share a link or QR — Safari / Chrome WebAR',
    ],
    quote:
      'We compress the loop from idea → inspectable 3D → shareable AR so teams approve in context, not in slides.',
    secondaryCta: { to: '/marketplace', label: 'Explore Marketplace' },
  },
  {
    badges: ['Innovation · Mesh integrity', 'Buy once, reuse everywhere'],
    kicker: '02 · Marketplace',
    heroLead: 'Spin the store,',
    heroAccentPhrases: ['same GLB', 'real spin', 'buy once', 'reuse anywhere'],
    subtitle:
      'What you preview is the same GLB you publish—never a fake render pass. Marketplace lists real models with spin previews; buy once, reuse in campaigns, Ardya, or Studio without re-modeling from scratch.',
    bullets: [
      'PBR models you can inspect before purchase',
      'Consistent pipeline with Studio + WebAR publish',
      'Fewer one-off commissions for the same prop',
    ],
    quote:
      'Our listings are built for reuse: marketplace → studio tweaks → AR link, without a second modeling tax.',
    secondaryCta: { to: '/marketplace', label: 'Browse Marketplace' },
  },
  {
    badges: ['Innovation · Link-native AR', 'Zero app-store detour'],
    kicker: '03 · Field-ready AR',
    heroLead: 'Open a link,',
    heroAccentPhrases: ['on location', 'in context', 'no install', 'live review'],
    subtitle:
      'Stakeholders skip the app store—one URL places the asset where it lives: warehouse, set, or street. WebAR is the review screen; VisiARise keeps the loop as fast as your chat thread.',
    bullets: [
      'Device camera as the review screen',
      'Works for drones, products, and large props',
      'Tight loop with your existing approvals chat',
    ],
    quote:
      'Innovation is distribution: if AR is a link, approvals move as fast as your chat thread.',
    secondaryCta: { to: '/try-ar', label: 'Open Try AR' },
  },
  {
    badges: ['Innovation · Discovery + checkout', 'You own the cart'],
    kicker: '04 · Retail & try-on',
    heroLead: 'Try in AR,',
    heroAccentPhrases: ['your checkout', 'less returns', 'true scale', 'fewer boxes'],
    subtitle:
      'Shoppers preview scale and silhouette in AR; Amazon, Flipkart, or your own storefront still gets the sale—we don’t lock the cart. Publish try-for-free links and cut rush shipping on uncertain buys.',
    bullets: [
      'Optional discovery feed for qualified listings',
      '3D-accurate preview vs one-off photo comps',
      'Digital-first samples → less rush shipping',
    ],
    quote:
      'We’re not replacing your retail stack—we add a spatial layer so fewer boxes move before the buyer is sure.',
    secondaryCta: { to: '/#free-tryon', label: 'Retail & discovery' },
  },
];

export function buildTryArUrl(modelPath: string, name = 'VisiARise preview') {
  const q = new URLSearchParams({ model: modelPath, name });
  const qs = q.toString();
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/try-ar?${qs}`;
  }
  return `/try-ar?${qs}`;
}
