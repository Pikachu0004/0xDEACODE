import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearAllStudioAssets, loadProjectHeavyAssets, persistProjectHeavyAssets } from '../lib/studioAssetDb';
import {
  apiFetch,
  type ApiChatMessage,
  type ApiProject,
  type MeResponse,
  type ModelUrlsPayload,
  type ProjectsListResponse,
} from '../lib/api';
import { isMongoObjectId } from '../lib/mongoId';

export interface User {
  id: string;
  email: string;
  name: string;
  token?: string | null;
  isAdmin?: boolean;
  credits?: number | null;
  isVerified?: boolean;
}

export type ProjectUseCase = 'game' | 'company' | 'freelance' | 'business' | 'product' | '';

/** Additional GLB layer fused into AR Studio (same scene, export & AR publish merge). */
export interface StudioExtraModel {
  id: string;
  name: string;
  modelUrl?: string;
  modelDataUrl?: string;
}

export type StudioNodeTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

/** Preview motion on a scene object (editor + optional persist). */
export type StudioRigConfig = {
  enabled: boolean;
  mode: 'none' | 'rotate' | 'bob';
  /** Rad/s for rotate, rad/s phase for bob */
  speed: number;
  /** Meters for bob amplitude */
  amplitude: number;
};

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: 'draft' | 'published';
  /** `null` clears the field on the next server PATCH (see `projectToRemotePatch`). */
  modelUrl?: string | null;
  /** Inlined user upload (persists across refresh; blob: URLs do not). */
  modelDataUrl?: string | null;
  thumbnailUrl?: string | null;
  /** How you use ARdya — shapes defaults in the workspace */
  useCase?: ProjectUseCase;
  /** Free-form tag e.g. footwear, automotive */
  category?: string;
  /** Extra imported models in the studio scene */
  studioExtras?: StudioExtraModel[];
  /** Latest Tripo task id for the primary model. */
  tripoTaskId?: string | null;
  /** Meshy export URLs (glb, fbx, usdz, …) for downloads in Studio / chat. */
  modelUrls?: ModelUrlsPayload | null;
  /** PNG/JPEG/WebP as data URL — shown as a plane “sticker” in scene */
  logoDataUrl?: string;
  logoScale?: number;
  logoOffsetY?: number;
  /** Persisted transforms keyed as `primary`, `logo`, or extra model `id` */
  studioTransforms?: Record<string, StudioNodeTransform>;
  /** Optional motion rigs for hierarchy nodes (local + sync when API supports). */
  studioRigs?: Record<string, StudioRigConfig>;
  /** When true, hosted GLB is readable without auth (public link / QR). */
  arSharePublic?: boolean;
  arPageTitle?: string;
  arPageTagline?: string;
  arCtaLabel?: string;
  arAccentHex?: string;
}

/** Strip stale blob: URLs from persisted projects (they 404 after the tab/session ends). */
function sanitizeProjectBlobUrls(project: Project): Project {
  const p = { ...project };
  const dead = (u?: string) => !!u && u.startsWith('blob:');
  if (dead(p.modelUrl)) delete p.modelUrl;
  if (dead(p.modelDataUrl)) delete p.modelDataUrl;
  if (p.studioExtras?.length) {
    p.studioExtras = p.studioExtras.map((ex) => {
      const e = { ...ex };
      if (dead(e.modelUrl)) delete e.modelUrl;
      if (dead(e.modelDataUrl)) delete e.modelDataUrl;
      return e;
    });
  }
  return p;
}

/** Drop large data URLs from the object written to localStorage (blobs live in IndexedDB). */
function stripHeavyFromProjectForPersist(p: Project): Project {
  return {
    ...p,
    modelDataUrl: undefined,
    logoDataUrl: undefined,
    studioExtras: p.studioExtras?.map((e) => ({ ...e, modelDataUrl: undefined })),
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  modelUrl?: string;
  modelUrls?: ModelUrlsPayload;
  tripoTaskId?: string;
}

const remotePatchTimers = new Map<string, ReturnType<typeof setTimeout>>();
const REMOTE_PROJECT_KEYS = new Set([
  'name',
  'description',
  'status',
  'modelUrl',
  'thumbnailUrl',
  'tripoTaskId',
  'modelUrls',
  'useCase',
  'category',
  'studioTransforms',
  'studioRigs',
  'studioExtras',
  'logoScale',
  'logoOffsetY',
  'arSharePublic',
  'arPageTitle',
  'arPageTagline',
  'arCtaLabel',
  'arAccentHex',
]);

function projectToRemotePatch(merged: Project): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of REMOTE_PROJECT_KEYS) {
    const v = merged[k as keyof Project];
    if (v === null) {
      o[k] = null;
      continue;
    }
    if (v !== undefined) o[k] = v;
  }
  return o;
}

function scheduleRemoteProjectPatch(id: string, merged: Project, token: string) {
  const prev = remotePatchTimers.get(id);
  if (prev) clearTimeout(prev);
  remotePatchTimers.set(
    id,
    setTimeout(() => {
      remotePatchTimers.delete(id);
      const body = projectToRemotePatch(merged);
      if (Object.keys(body).length === 0) return;
      void apiFetch(`/api/projects/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      }).catch((e) => console.warn('[VisiARise] project sync failed', e));
    }, 650)
  );
}

export function apiProjectToProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt || new Date().toISOString(),
    status: p.status,
    modelUrl: p.modelUrl ?? undefined,
    thumbnailUrl: p.thumbnailUrl ?? undefined,
    tripoTaskId: p.tripoTaskId ?? undefined,
    modelUrls: p.modelUrls ?? undefined,
    useCase: (p.useCase || '') as ProjectUseCase,
    category: p.category,
    studioTransforms: p.studioTransforms as Record<string, StudioNodeTransform> | undefined,
    studioRigs: p.studioRigs as Record<string, StudioRigConfig> | undefined,
    studioExtras: p.studioExtras?.map((e) => ({
      id: e.id,
      name: e.name || 'Layer',
      modelUrl: e.modelUrl,
    })),
    logoScale: p.logoScale,
    logoOffsetY: p.logoOffsetY,
    arSharePublic: p.arSharePublic,
    arPageTitle: p.arPageTitle,
    arPageTagline: p.arPageTagline,
    arCtaLabel: p.arCtaLabel,
    arAccentHex: p.arAccentHex,
  };
}

function mergeStudioExtrasFromLocal(
  local?: StudioExtraModel[],
  server?: StudioExtraModel[]
): StudioExtraModel[] | undefined {
  if (!server?.length && !local?.length) return undefined;
  const map = new Map<string, StudioExtraModel>();
  for (const e of server || []) {
    map.set(e.id, { ...e });
  }
  for (const e of local || []) {
    const cur = map.get(e.id);
    if (cur) {
      map.set(e.id, {
        ...cur,
        name: e.name || cur.name,
        modelUrl: cur.modelUrl || e.modelUrl,
        modelDataUrl: e.modelDataUrl ?? cur.modelDataUrl,
      });
    } else {
      map.set(e.id, { ...e });
    }
  }
  return map.size ? Array.from(map.values()) : undefined;
}

/** Server list is authoritative for which Mongo-backed projects exist; keep local-only blobs and unsigned-in projects. */
function mergeServerProjectsWithLocal(serverList: Project[], localList: Project[]): Project[] {
  const mergedServer = serverList.map((sp) => {
    const local = localList.find((lp) => lp.id === sp.id);
    if (!local) return sp;
    return {
      ...sp,
      modelDataUrl: local.modelDataUrl ?? sp.modelDataUrl,
      logoDataUrl: local.logoDataUrl ?? sp.logoDataUrl,
      studioExtras: mergeStudioExtrasFromLocal(local.studioExtras, sp.studioExtras),
    };
  });
  const localOnly = localList.filter((p) => !isMongoObjectId(p.id));
  return [...mergedServer, ...localOnly];
}

export function apiChatToMessage(m: ApiChatMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    images: m.images,
    modelUrl: m.modelUrl,
    modelUrls: m.modelUrls,
    tripoTaskId: m.tripoTaskId,
  };
}

export interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  creator: string;
  thumbnailUrl: string;
  modelUrl: string;
  category: string;
  rating: number;
  sales: number;
  description: string;
}

export interface CartItem extends MarketplaceItem {
  quantity: number;
}

export interface Freelancer {
  id: string;
  name: string;
  skills: string[];
  hourlyRate: number;
  rating: number;
  avatar: string;
}

/** Single source of truth — also used when migrating old persisted catalogs */
export const DEFAULT_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 'm-avatar',
    name: 'Human Avatar — Studio PBR',
    price: 89,
    creator: 'VisiARise Labs',
    thumbnailUrl: '/Human_Avatar_Kishan_Nishad_img.png',
    modelUrl: '/Human_Avatar_Kishan_Nishad_model.glb',
    category: 'models',
    rating: 4.9,
    sales: 42,
    description:
      'Photorealistic human avatar: clean topology, PBR materials, ready for WebAR.',
  },
  {
    id: 'm-shoes',
    name: 'Designer Sneakers',
    price: 34,
    creator: 'VisiARise Labs',
    thumbnailUrl: '/Shoes.png',
    modelUrl: '/models/shoes_basic_pbr.glb',
    category: 'models',
    rating: 4.7,
    sales: 118,
    description: 'High-detail footwear model with baked PBR — ideal for product AR.',
  },
  {
    id: 'm-lambo',
    name: 'Sports Car — Huracán-class',
    price: 129,
    creator: 'VisiARise Labs',
    thumbnailUrl: '/Lamborgini_image.png',
    modelUrl: '/models/lamborghini_basic_pbr.glb',
    category: 'models',
    rating: 4.8,
    sales: 67,
    description: 'Showroom-grade vehicle mesh with realistic materials for AR placement.',
  },
  {
    id: 'm-iron',
    name: 'Armored Hero Suit',
    price: 79,
    creator: 'VisiARise Labs',
    thumbnailUrl: '/ironMan .png',
    modelUrl: '/models/ironman_basic_pbr.glb',
    category: 'models',
    rating: 4.85,
    sales: 91,
    description: 'Full hero suit with metallic PBR — great for character-scale AR.',
  },
  {
    id: 'm-drone',
    name: 'Sci‑Fi Drone',
    price: 45,
    creator: 'VisiARise Labs',
    thumbnailUrl: '/drone-generated.png',
    modelUrl: '/scifi_drone.glb',
    category: 'models',
    rating: 4.75,
    sales: 156,
    description:
      'Stylized sci‑fi drone from the public library — same GLB used in hero demos.',
  },
];

interface AppState {
  user: User | null;
  projects: Project[];
  marketplaceItems: MarketplaceItem[];
  freelancers: Freelancer[];
  currentProject: Project | null;
  chatHistory: Record<string, ChatMessage[]>;
  cart: CartItem[];
  onboardingCompleted: boolean;
  
  // Auth Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email'>>) => void;
  setCredits: (credits: number | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  
  // Project Actions
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  syncProjectsFromServer: () => Promise<void>;
  replaceChatHistory: (projectId: string, messages: ChatMessage[]) => void;

  // Chat Actions
  addChatMessage: (projectId: string, message: ChatMessage) => void;
  
  // Marketplace Actions
  addMarketplaceItem: (item: MarketplaceItem) => void;
  addToCart: (item: MarketplaceItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      projects: [],
      marketplaceItems: DEFAULT_MARKETPLACE_ITEMS,
      freelancers: [
        {
          id: '1',
          name: 'Alex Rivera',
          skills: ['3D Modeling', 'Texturing', 'Blender'],
          hourlyRate: 45,
          rating: 4.9,
          avatar: '/Human_Avatar_Kishan_Nishad_img.png',
        },
        {
          id: '2',
          name: 'Sarah Chen',
          skills: ['AR Development', 'Unity', 'A-Frame'],
          hourlyRate: 60,
          rating: 5.0,
          avatar: '/Lamborgini_image.png',
        },
      ],
      currentProject: null,
      chatHistory: {},
      cart: [],
      onboardingCompleted: false,

      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setCredits: (credits) =>
        set((state) => ({
          user: state.user ? { ...state.user, credits } : null,
        })),
      refreshUser: async () => {
        const token = useAppStore.getState().user?.token;
        if (!token) return;
        try {
          const me = await apiFetch<MeResponse>('/api/auth/me', { token });
          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  id: me._id,
                  name: me.name,
                  email: me.email,
                  isAdmin: me.isAdmin,
                  credits: me.credits,
                  isVerified: me.isVerified,
                }
              : null,
          }));
        } catch (e) {
          console.warn('[VisiARise] refreshUser failed', e);
        }
      },
      logout: () => {
        void clearAllStudioAssets();
        set({ user: null, projects: [], currentProject: null, chatHistory: {}, cart: [] });
      },
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      
      addProject: (project) =>
        set((state) => {
          queueMicrotask(() => void persistProjectHeavyAssets(project.id, project));
          return { projects: [project, ...state.projects] };
        }),
      updateProject: (id, updates) =>
        set((state) => {
          const projects = state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
          const merged = projects.find((p) => p.id === id);
          if (merged) queueMicrotask(() => void persistProjectHeavyAssets(id, merged));
          const token = state.user?.token;
          if (merged && token && isMongoObjectId(id)) {
            queueMicrotask(() => scheduleRemoteProjectPatch(id, merged, token));
          }
          const nextCurrent =
            state.currentProject?.id === id && merged ? merged : state.currentProject;
          return { projects, currentProject: nextCurrent };
        }),
      setCurrentProject: (project) => set({ currentProject: project }),
      removeProject: async (id) => {
        const token = useAppStore.getState().user?.token;
        if (token && isMongoObjectId(id)) {
          try {
            await apiFetch(`/api/projects/${id}`, { method: 'DELETE', token });
          } catch (e) {
            console.warn('[VisiARise] delete failed on server', e);
          }
        }
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        }));
      },

      syncProjectsFromServer: async () => {
        const token = useAppStore.getState().user?.token;
        if (!token) return;
        try {
          const { projects } = await apiFetch<ProjectsListResponse>('/api/projects', { token });
          const serverMapped = projects.map(apiProjectToProject);
          set((state) => ({
            projects: mergeServerProjectsWithLocal(serverMapped, state.projects),
          }));
          const { projects: next, updateProject } = useAppStore.getState();
          for (const p of next) {
            queueMicrotask(() => {
              void (async () => {
                try {
                  const heavy = await loadProjectHeavyAssets(p);
                  const has =
                    heavy.modelDataUrl ||
                    heavy.logoDataUrl ||
                    heavy.studioExtras?.some((e) => e.modelDataUrl);
                  if (has) updateProject(p.id, heavy);
                } catch (e) {
                  console.warn('[VisiARise] heavy hydrate after sync failed', e);
                }
              })();
            });
          }
        } catch (e) {
          console.warn('[VisiARise] syncProjectsFromServer failed', e);
        }
      },

      replaceChatHistory: (projectId, messages) =>
        set((state) => ({
          chatHistory: { ...state.chatHistory, [projectId]: messages },
        })),

      addChatMessage: (projectId, message) => {
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            [projectId]: [...(state.chatHistory[projectId] || []), message],
          },
        }));
        const token = useAppStore.getState().user?.token;
        if (token && isMongoObjectId(projectId)) {
          void apiFetch<{ message: ApiChatMessage }>(`/api/projects/${projectId}/chat`, {
            method: 'POST',
            token,
            body: JSON.stringify({
              role: message.role,
              content: message.content,
              images: message.images,
              modelUrl: message.modelUrl,
              modelUrls: message.modelUrls,
              tripoTaskId: message.tripoTaskId,
              clientMessageId: message.id,
            }),
          }).catch((e) => console.warn('[VisiARise] chat sync failed', e));
        }
      },
      
      addMarketplaceItem: (item) => set((state) => ({
        marketplaceItems: [item, ...state.marketplaceItems],
      })),

      addToCart: (item) => set((state) => {
        const existing = state.cart.find(c => c.id === item.id);
        if (existing) {
          return {
            cart: state.cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
          };
        }
        return { cart: [...state.cart, { ...item, quantity: 1 }] };
      }),
      removeFromCart: (id) => set((state) => ({
        cart: state.cart.filter(c => c.id !== id)
      })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      /** New key so users aren’t stuck with pre-catalog `marketplaceItems` from older builds */
      name: 'visiarise-storage-v5',
      partialize: (state) => ({
        user: state.user,
        projects: state.projects.map(stripHeavyFromProjectForPersist),
        marketplaceItems: state.marketplaceItems,
        freelancers: state.freelancers,
        currentProject: state.currentProject
          ? stripHeavyFromProjectForPersist(state.currentProject)
          : null,
        chatHistory: state.chatHistory,
        cart: state.cart,
        onboardingCompleted: state.onboardingCompleted,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppState>),
        };
        if (Array.isArray(merged.projects)) {
          merged.projects = merged.projects.map(sanitizeProjectBlobUrls);
        }
        return merged as AppState;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error('[VisiARise] persist rehydration error', error);
        /** Defer until `const useAppStore = create(...)` finishes — avoids TDZ / circular init. */
        queueMicrotask(() => {
          void (async () => {
            try {
              const { projects, updateProject } = useAppStore.getState();
              for (const p of projects) {
                const heavy = await loadProjectHeavyAssets(p);
                const has =
                  heavy.modelDataUrl ||
                  heavy.logoDataUrl ||
                  heavy.studioExtras?.some((e) => e.modelDataUrl);
                if (has) updateProject(p.id, heavy);
              }
            } catch (e) {
              console.warn('[VisiARise] IndexedDB asset hydrate failed', e);
            }
          })();
        });
      },
    }
  )
);
