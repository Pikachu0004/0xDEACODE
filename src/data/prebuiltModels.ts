export interface PrebuiltModelItem {
  id: string;
  name: string;
  keywords: string[];
  modelUrl: string;
  thumbnailUrl: string;
  category: string;
  price: number;
  creator: string;
  rating: number;
  sales: number;
  description: string;
}

export const PREBUILT_MODELS: PrebuiltModelItem[] = [
  {
    id: 'm-duck',
    name: 'Yellow Rubber Duck — AR Classic',
    keywords: [
      'duck',
      'rubber duck',
      'yellow duck',
      'toy duck',
      'bath duck',
      'ducks',
    ],
    modelUrl: '/models/duck.glb',
    thumbnailUrl: '/models/duck_thumb.png',
    category: 'models',
    price: 19,
    creator: 'Khronos Open 3D',
    rating: 4.9,
    sales: 420,
    description:
      'The universal benchmark yellow rubber duck 3D asset. Optimized for instant loading, tabletop AR testing, bathtub physics, and driving controls.',
  },
  {
    id: 'm-lambo',
    name: 'Sports Car — Huracán-class',
    keywords: [
      'car',
      'sports car',
      'lamborghini',
      'lambo',
      'huracan',
      'vehicle',
      'supercar',
      'race car',
      'auto',
    ],
    modelUrl: '/models/lamborghini_basic_pbr.glb',
    thumbnailUrl: '/Lamborgini_image.png',
    category: 'vehicles',
    price: 129,
    creator: 'VisiARise Labs',
    rating: 4.8,
    sales: 67,
    description:
      'Showroom-grade supercar vehicle mesh with metallic paint, realistic PBR materials, and interactive 4-way motion drive controls in AR.',
  },
  {
    id: 'm-toycar',
    name: 'Diecast Toy Car — Vintage PBR',
    keywords: [
      'toy car',
      'toycar',
      'vintage car',
      'diecast car',
      'mini car',
    ],
    modelUrl: '/models/toy_car.glb',
    thumbnailUrl: '/models/toy_car_thumb.png',
    category: 'vehicles',
    price: 29,
    creator: 'Khronos Open 3D',
    rating: 4.75,
    sales: 85,
    description:
      'Detailed vintage diecast toy car with metal flake paint and realistic wheel assemblies for tabletop AR and room exploration.',
  },
  {
    id: 'm-shoes',
    name: 'Designer Sneakers — Streetwear PBR',
    keywords: [
      'shoes',
      'shoe',
      'sneaker',
      'sneakers',
      'footwear',
      'kicks',
      'nike',
      'trainers',
    ],
    modelUrl: '/models/shoes_basic_pbr.glb',
    thumbnailUrl: '/Shoes.png',
    category: 'models',
    price: 34,
    creator: 'VisiARise Labs',
    rating: 4.7,
    sales: 118,
    description:
      'High-detail footwear model with baked PBR materials — ideal for virtual try-on, retail display, and product AR.',
  },
  {
    id: 'm-iron',
    name: 'Armored Hero Suit',
    keywords: [
      'ironman',
      'iron man',
      'hero',
      'superhero',
      'armor',
      'suit',
      'avenger',
    ],
    modelUrl: '/models/ironman_basic_pbr.glb',
    thumbnailUrl: '/ironMan .png',
    category: 'models',
    price: 79,
    creator: 'VisiARise Labs',
    rating: 4.85,
    sales: 91,
    description:
      'Full superhero armored suit with reflective gold and crimson PBR metallic materials — great for character-scale AR.',
  },
  {
    id: 'm-drone',
    name: 'Sci‑Fi Combat Drone',
    keywords: [
      'drone',
      'scifi drone',
      'quadcopter',
      'robot drone',
      'uav',
    ],
    modelUrl: '/scifi_drone.glb',
    thumbnailUrl: '/drone-generated.png',
    category: 'models',
    price: 45,
    creator: 'VisiARise Labs',
    rating: 4.75,
    sales: 156,
    description:
      'Stylized futuristic surveillance combat drone with glowing emissive thrusters and dual antennae.',
  },
  {
    id: 'm-avatar',
    name: 'Human Avatar — Studio PBR',
    keywords: [
      'avatar',
      'human',
      'person',
      'bust',
      'character',
      'kishan',
    ],
    modelUrl: '/Human_Avatar_Kishan_Nishad_model.glb',
    thumbnailUrl: '/Human_Avatar_Kishan_Nishad_img.png',
    category: 'models',
    price: 89,
    creator: 'VisiARise Labs',
    rating: 4.9,
    sales: 42,
    description:
      'Photorealistic human avatar: clean topology, PBR materials, ready for virtual meetings and WebAR.',
  },
];

/**
 * Searches the prebuilt 3D catalog for an instant match based on user text input.
 * Matches keywords as whole words or substrings for high accuracy.
 */
export function matchPrebuiltModel(userInput: string): PrebuiltModelItem | null {
  if (!userInput) return null;
  const cleaned = userInput.toLowerCase().trim();

  // 1. Exact match check
  for (const item of PREBUILT_MODELS) {
    for (const kw of item.keywords) {
      if (cleaned === kw) return item;
    }
  }

  // 2. Word boundary / phrase match check
  for (const item of PREBUILT_MODELS) {
    for (const kw of item.keywords) {
      // Check if keyword appears as distinct token or substring
      const regex = new RegExp(`(^|\\s|[,.!?])${kw.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}($|\\s|[,.!?])`, 'i');
      if (regex.test(cleaned)) {
        return item;
      }
    }
  }

  // 3. Substring check for short input (e.g. user typed "car" or "duck")
  if (cleaned.length <= 40) {
    for (const item of PREBUILT_MODELS) {
      for (const kw of item.keywords) {
        if (cleaned.includes(kw) || kw.includes(cleaned)) {
          return item;
        }
      }
    }
  }

  return null;
}

