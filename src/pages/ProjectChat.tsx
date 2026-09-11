import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, apiChatToMessage, ChatMessage, ProjectUseCase } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  Sparkles,
  ArrowLeft,
  Box,
  RefreshCw,
  Check,
  ChevronRight,
  Download,
  Share2,
  Edit3,
  User,
  Users,
  Bot,
  Loader2,
  SlidersHorizontal,
  Paperclip,
  X,
} from 'lucide-react';
import { ArdyaWordmark } from '../components/ArdyaWordmark';
import { MeshyFormatDownloadLinks } from '../components/MeshyFormatDownloadLinks';
import MeshyModelViewer from '../components/MeshyModelViewer';
import PostModelFlow, { type PostFlowStep } from '../components/PostModelFlow';
import { ProjectChatCreditsDialog } from '../components/projectchat/ProjectChatCreditsDialog';
import { ProjectChatHireDialog } from '../components/projectchat/ProjectChatHireDialog';
import {
  apiFetch,
  type ChatListResponse,
} from '../lib/api';
import { isMongoObjectId } from '../lib/mongoId';
import { compactModelUrls } from '../lib/meshyModel';
import { createTripoImageTask, createTripoTextTask, pollTripoTask, type TripoTaskPayload } from '../lib/tripo';
import { fetchGlbArrayBufferForPublish, glbArrayBufferToDataUrl } from '../lib/fetchGlbForPublish';
import { submitWebArPublish } from '../lib/submitWebArPublish';
import { StudioPublishDialog, type StudioPublishOptions } from '../components/studio/StudioPublishDialog';

const CONCEPT_IMAGES = [
  '/Human_Avatar_Kishan_Nishad_img.png',
  '/Lamborgini_image.png',
] as const;

const MODEL_FOR_IMAGE: Record<string, string> = {
  '/Human_Avatar_Kishan_Nishad_img.png': '/Human_Avatar_Kishan_Nishad_model.glb',
  '/Lamborgini_image.png': '/models/lamborghini_basic_pbr.glb',
};

const SUGGESTED_PROMPTS = [
  'Product hero: white sneakers on neutral studio — AR try-on for ecommerce',
  'Showroom car config: lime sports car — place in driveway via WebAR',
  'Corporate avatar: professional bust for virtual meetings & AR name card',
  'Retail display: compact robot mascot — sustainability, no physical sample run',
];

function startSpeechRecognition(
  onText: (t: string) => void,
  onErr: (msg: string) => void
) {
  const W = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) {
    onErr('Speech recognition needs Chrome or Edge (desktop), or allow the mic permission.');
    return;
  }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => {
    const t = e.results[0]?.[0]?.transcript?.trim();
    if (t) onText(t);
  };
  rec.onerror = (e: { error: string }) => {
    console.warn(e);
    onErr(e.error === 'not-allowed' ? 'Microphone blocked — allow mic in the browser bar.' : e.error);
  };
  rec.start();
}

export default function ProjectChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    projects,
    freelancers,
    chatHistory,
    addChatMessage,
    updateProject,
    user,
    setCredits,
    refreshUser,
    replaceChatHistory,
  } = useAppStore();
  const project = projects.find((p) => p.id === id);

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  /** Staged reference image for Tripo image-to-3D (data URL). */
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [meshyProgress, setMeshyProgress] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState('Tripo AI');
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [categoryTag, setCategoryTag] = useState('');
  const [gen, setGen] = useState({
    imageCount: 2, // 1–4
    modelCount: 1,
    poly: 'medium' as 'low' | 'medium' | 'high',
  });

  const [postFlowStep, setPostFlowStep] = useState<PostFlowStep | null>(null);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const [arPublishOpen, setArPublishOpen] = useState(false);
  const [arPublishBusy, setArPublishBusy] = useState(false);
  const [arPublishSource, setArPublishSource] = useState<{
    modelUrl: string;
    modelUrls?: ChatMessage['modelUrls'];
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessages = chatHistory[id || ''] || [];

  const providers = [
    { name: 'Tripo AI', icon: Sparkles, desc: 'AI-generated 3D models from text or images' },
    { name: 'Hyper3D', icon: Box, desc: 'Fastest text-to-3D generation' },
    { name: 'SAM 3D', icon: Bot, desc: 'Segment Anything for 3D' },
    { name: 'Telles AI', icon: RefreshCw, desc: 'Microsoft Research 3D engine' },
  ];

  useEffect(() => {
    if (!project) return;
    setProjectName(project.name);
    setCategoryTag(project.category || '');
  }, [project]);

  useEffect(() => {
    if (!project) return;
    if (!project.useCase) setOnboardingOpen(true);
  }, [project]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    const pid = id;
    if (!pid || !user?.token || !isMongoObjectId(pid)) return;
    let cancelled = false;
    (async () => {
      try {
        const { messages } = await apiFetch<ChatListResponse>(`/api/projects/${pid}/chat`, {
          token: user.token,
        });
        if (!cancelled) replaceChatHistory(pid, messages.map(apiChatToMessage));
      } catch (e) {
        console.warn('[VisiARise] load chat failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.token, replaceChatHistory]);

  if (!project) return <div className="p-10">Project not found.</div>;

  const openPostModelFlow = (modelUrl: string) => {
    if (!id) return;
    const p = useAppStore.getState().projects.find((x) => x.id === id);
    try {
      sessionStorage.setItem(
        `visiarise-listing-${id}`,
        JSON.stringify({
          name: p?.name || 'My model',
          description: p?.description || '',
          modelUrl,
          thumb: p?.thumbnailUrl || '',
        })
      );
    } catch {
      /* ignore */
    }
    setPostFlowStep('feedback');
  };

  const openArPublishFromLlm = (msg: ChatMessage) => {
    if (!msg.modelUrl || !id) return;
    if (!user?.token) {
      addChatMessage(id, {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: 'Sign in with a verified account to publish WebAR.',
      });
      return;
    }
    setArPublishSource({ modelUrl: msg.modelUrl, modelUrls: msg.modelUrls });
    setArPublishOpen(true);
  };

  const confirmArPublishFromChat = async (opts: StudioPublishOptions) => {
    if (!id || !user?.token || !arPublishSource) return;
    setArPublishBusy(true);
    try {
      const buffer = await fetchGlbArrayBufferForPublish({
        modelUrl: arPublishSource.modelUrl,
        modelUrls: arPublishSource.modelUrls ?? undefined,
        modelDataUrl: project.modelDataUrl,
        token: user.token,
      });
      await submitWebArPublish(id, buffer, opts, user.token);
      const dataUrl = glbArrayBufferToDataUrl(buffer);
      updateProject(id, {
        modelDataUrl: dataUrl,
        modelUrl: undefined,
        status: 'published',
        arSharePublic: opts.arSharePublic,
        arPageTitle: opts.arPageTitle,
        arPageTagline: opts.arPageTagline,
        arCtaLabel: opts.arCtaLabel,
        arAccentHex: opts.arAccentHex,
      });
      setArPublishOpen(false);
      setArPublishSource(null);
      navigate(`/ar/${id}`);
    } catch (err) {
      console.error(err);
      addChatMessage(id, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Could not publish WebAR: ${(err as Error).message}. Try again or use AR Studio to export.`,
      });
    } finally {
      setArPublishBusy(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const currentInput = input.trim();
    const tripoLabel = selectedProvider === 'Tripo AI' ? 'Tripo · 3D model' : '';

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: tripoLabel
        ? `[${tripoLabel} · ${gen.poly} poly] ${currentInput}`
        : `[${gen.poly} poly · ${gen.imageCount} images · ${gen.modelCount} model(s)] ${currentInput}`,
    };
    addChatMessage(id!, userMessage);
    setInput('');
    setIsGenerating(true);

    const useTripo = selectedProvider === 'Tripo AI';

    if (useTripo) {
      try {
        setMeshyProgress(0);


        const taskId = await createTripoTextTask(currentInput, gen.poly);
        const finalTask: TripoTaskPayload = await pollTripoTask(taskId, currentInput, {
          onProgress: (n) => setMeshyProgress(n),
        });

        const finalGlb = finalTask.modelUrls?.glb;
        if (!finalGlb) {
          throw new Error('Tripo finished but did not return a GLB URL.');
        }

        const urls = compactModelUrls(finalTask.modelUrls);

        const aiMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content:
            `Tripo: model ready for “${currentInput.slice(0, 72)}${currentInput.length > 72 ? '...' : ''}”. Open in AR Studio or publish to WebAR.`,
          modelUrl: finalGlb,
          modelUrls: urls,
          tripoTaskId: finalTask.taskId,
        };
        addChatMessage(id!, aiMessage);

        updateProject(id!, {
          modelUrl: finalGlb,
          modelDataUrl: undefined,
          thumbnailUrl: finalTask.thumbnailUrl || project?.thumbnailUrl,
          tripoTaskId: finalTask.taskId,
          modelUrls: urls,
          status: 'draft',
        });
        openPostModelFlow(finalGlb);
      } catch (err) {
        const msg = (err as Error).message || 'Tripo request failed';
        addChatMessage(id!, {
          id: Math.random().toString(36).substr(2, 9),
          role: 'assistant',
          content: `Tripo error: ${msg}`,
        });
      } finally {
        setIsGenerating(false);
        setMeshyProgress(0);
      }
      return;
    }

    const imgs = CONCEPT_IMAGES.slice(0, Math.min(4, Math.max(1, gen.imageCount)));

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `ARdya · ${selectedProvider}: concept batch for “${currentInput.slice(0, 80)}…”. Pick one to build a GLB (${gen.poly} poly target).`,
        images: [...imgs],
      };
      addChatMessage(id!, aiMessage);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSelectImage = (img: string) => {
    setIsGenerating3D(true);

    setTimeout(() => {
      const modelUrl = MODEL_FOR_IMAGE[img] || '/Human_Avatar_Kishan_Nishad_model.glb';
      setIsGenerating3D(false);

      const aiMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `ARdya: your GLB is ready (${gen.poly} poly target). Open in AR Studio or publish.`,
        modelUrl: modelUrl,
      };
      addChatMessage(id!, aiMessage);

      updateProject(id!, {
        modelUrl: modelUrl,
        modelDataUrl: undefined,
        thumbnailUrl: img,
        status: 'draft',
      });
      openPostModelFlow(modelUrl);
    }, 3000);
  };

  /** Tripo image-to-3D using the staged browser data URL. */
  const handleGenerateFromImage = async () => {
    if (!stagedImage || selectedProvider !== 'Tripo AI') return;

    setIsGenerating(true);
    setMeshyProgress(0);
    try {
      const taskId = await createTripoImageTask(stagedImage, gen.poly);
      addChatMessage(id!, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'user',
        content: `[Tripo · image → 3D · ${gen.poly} poly]`,
      });
      const finalTask = await pollTripoTask(taskId, '[image-to-3d]', {
        onProgress: (n) => setMeshyProgress(n),
      });
      const finalGlb = finalTask.modelUrls?.glb;
      if (!finalGlb) {
        throw new Error('Tripo finished but no GLB URL was returned yet.');
      }
      void refreshUser();
      const urls = compactModelUrls(finalTask.modelUrls);
      addChatMessage(id!, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content:
          'Tripo: 3D model from your image is ready. Open in AR Studio or publish to WebAR.',
        modelUrl: finalGlb,
        modelUrls: urls,
        tripoTaskId: finalTask.taskId,
      });
      updateProject(id!, {
        modelUrl: finalGlb,
        modelDataUrl: undefined,
        thumbnailUrl: finalTask.thumbnailUrl || project?.thumbnailUrl,
        tripoTaskId: finalTask.taskId,
        modelUrls: urls,
        status: 'draft',
      });
      openPostModelFlow(finalGlb);
      setStagedImage(null);
    } catch (err) {
      addChatMessage(id!, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `Tripo error: ${(err as Error).message || 'Image-to-3D failed'}`,
      });
    } finally {
      setIsGenerating(false);
      setMeshyProgress(0);
    }
  };

  const saveProjectName = () => {
    const t = projectName.trim();
    if (!t) {
      setProjectName(project.name);
      return;
    }
    if (t !== project.name) updateProject(id!, { name: t });
  };

  const setUseCase = (uc: ProjectUseCase) => {
    const cat = categoryTag.trim();
    updateProject(id!, { useCase: uc, ...(cat ? { category: cat } : {}) });
    setOnboardingOpen(false);
  };

  const onMic = () => {
    startSpeechRecognition(
      (t) => setInput((prev) => (prev ? `${prev} ${t}` : t)),
      (err) => alert(err)
    );
  };

  return (
    <div className="h-screen flex bg-[#030014] text-white overflow-hidden relative">
      {postFlowStep ? (
        <PostModelFlow
          step={postFlowStep}
          onStep={setPostFlowStep}
          onClose={() => setPostFlowStep(null)}
          projectId={id!}
          onOpenMarketplaceList={() =>
            navigate(`/marketplace?list=1&project=${encodeURIComponent(id || '')}`)
          }
          onLiked={() => {}}
        />
      ) : null}
      <AnimatePresence>
        {onboardingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-lg w-full rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
            >
              <div className="mb-6">
                <ArdyaWordmark className="text-xl" />
                <span className="text-white/40 text-sm ml-2">by VisiARise</span>
              </div>
              <h2 className="text-xl font-bold mb-2">How will you use ARdya?</h2>
              <p className="text-sm text-white/50 mb-6">
                We&apos;ll tune defaults (categories, prompts). You can upload your own image or GLB next.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ['game', 'Game / realtime'],
                    ['company', 'Company / team'],
                    ['freelance', 'Freelance client'],
                    ['business', 'Business / brand'],
                    ['product', 'Physical product / SKU'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setUseCase(k)}
                    className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-left text-sm hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <input
                  value={categoryTag}
                  onChange={(e) => setCategoryTag(e.target.value)}
                  placeholder="Category tag (e.g. footwear, automotive)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cat = categoryTag.trim();
                    updateProject(id!, { useCase: 'business', ...(cat ? { category: cat } : {}) });
                    setOnboardingOpen(false);
                  }}
                  className="text-xs text-white/40 underline"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col shrink-0 hidden lg:flex relative z-10">
        <div className="p-6 border-b border-white/5">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Dashboard</span>
          </Link>
          <div className="flex items-start gap-2 group/side-name">
            <div className="min-w-0 flex-1">
              <label className="text-[9px] font-bold text-white/35 uppercase tracking-widest block mb-1">
                Project name
              </label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={saveProjectName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                placeholder="Name this project"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-2.5 py-2 text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30"
              />
            </div>
            <Edit3 className="w-3.5 h-3.5 text-white/25 group-hover/side-name:text-brand-primary shrink-0 mt-6" aria-hidden />
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-3">ARdya · Project</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4 px-2">
              Generated Models
            </h3>
            <div className="space-y-2">
              {project.modelUrl ? (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group hover:border-brand-primary/50 transition-all space-y-3">
                  <div className="aspect-square rounded-xl bg-black/40 overflow-hidden">
                    <img
                      src={project.thumbnailUrl || '/Human_Avatar_Kishan_Nishad_img.png'}
                      alt="Model"
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/60">Primary · GLB preview</span>
                    <a
                      href={project.modelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="p-1 rounded-lg hover:bg-white/10"
                      title="Download GLB"
                    >
                      <Download className="w-3 h-3 text-white/20 group-hover:text-brand-primary transition-colors" />
                    </a>
                  </div>
                  <MeshyFormatDownloadLinks urls={project.modelUrls} />
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                  <Box className="w-6 h-6 text-white/10 mb-2" />
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No models yet</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            type="button"
            onClick={() => setHireDialogOpen(true)}
            className="w-full py-3 rounded-xl border border-brand-primary/35 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            Hire a 3D designer
          </button>
          <button
            type="button"
            onClick={() => navigate(`/studio/${id}`)}
            className="w-full py-4 rounded-2xl bg-brand-primary text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
          >
            <Edit3 className="w-3 h-3" />
            Open AR Studio
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10 bg-black/20 backdrop-blur-sm min-w-0">
        <header className="min-h-16 flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors lg:hidden">
              <ArrowLeft className="w-5 h-5 text-white/40" />
            </Link>
            <div className="flex flex-col min-w-0 gap-1.5">
              <div className="flex items-center gap-2">
                <ArdyaWordmark />
                <span className="text-[10px] text-white/35 uppercase tracking-widest hidden sm:inline">LLM</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] pl-3 pr-2 py-2 focus-within:border-brand-primary/45 focus-within:ring-1 focus-within:ring-brand-primary/20 max-w-[min(100vw-8rem,22rem)]">
                <Edit3 className="w-4 h-4 text-brand-primary/80 shrink-0" aria-hidden />
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={saveProjectName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  placeholder="Tap to name your project"
                  aria-label="Project name"
                  className="min-w-0 flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white placeholder:text-white/35"
                />
              </div>
              <span className="text-[9px] text-white/30 hidden sm:block">Click the field, edit, then click outside or press Enter to save.</span>
            </div>
          </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setHireDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full border border-white/15 bg-white/5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/85 hover:border-brand-primary/40 hover:text-brand-primary transition-colors shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              Hire help
            </button>
            <button
              type="button"
              onClick={() => setCreditsDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full border border-white/15 bg-white/5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/85 hover:border-brand-primary/40 transition-colors shrink-0"
            >
              Buy credits
            </button>

            {user?.token ? (
              <button
                type="button"
                onClick={() => setCreditsDialogOpen(true)}
                className="text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-white/60 sm:inline"
              >
                Balance{' '}
                <span className="text-brand-primary/90">{user.isAdmin ? '∞' : user.credits ?? '—'}</span>
              </button>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProviderOpen(!isProviderOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-brand-primary/50 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgb(119_67_219_/_0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{selectedProvider}</span>
                <ChevronRight className={`w-3 h-3 text-white/20 transition-transform ${isProviderOpen ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {isProviderOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-2">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Select AI Engine</p>
                    </div>
                    {providers.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setSelectedProvider(p.name);
                          setIsProviderOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedProvider === p.name ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-white/5 text-white/60'}`}
                      >
                        <p.icon className="w-4 h-4" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-widest">{p.name}</p>
                          <p className="text-[9px] text-white/40">{p.desc}</p>
                        </div>
                        {selectedProvider === p.name && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white">
              <Share2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Live</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-12 py-10">
            <div className="flex gap-6">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <ArdyaWordmark className="text-[11px]" />
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-tight">Welcome to ARdya</h3>
                  <p className="text-sm leading-relaxed text-white/60 max-w-xl">
                    With <span className="text-white/80">Tripo AI</span>, you generate fully textured models directly from your text or images.
                    Other engines still use concept images from the gear menu (poly, image count). Rename your project in the
                    header field above. Need human polish?{' '}
                    <button
                      type="button"
                      onClick={() => setHireDialogOpen(true)}
                      className="text-brand-primary font-semibold hover:underline"
                    >
                      Hire a 3D designer
                    </button>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInput(p)}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-white/50 hover:text-white hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all text-left max-w-full"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {currentMessages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white/10 border border-white/10' : 'bg-white/10 border border-white/10'}`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white/60" />
                  ) : (
                    <ArdyaWordmark className="text-[10px]" />
                  )}
                </div>
                <div className={`space-y-6 max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`p-6 rounded-[2rem] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'bg-white/5 text-white/80 border border-white/5'}`}
                  >
                    {msg.content}
                  </div>

                  {msg.images && (
                    <div className="grid grid-cols-2 gap-4">
                      {msg.images.map((img, i) => (
                        <div
                          key={i}
                          className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-square bg-white/5 shadow-xl"
                        >
                          <img src={img} alt="Generated" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 translate-y-4 group-hover:translate-y-0">
                            <button
                              type="button"
                              onClick={() => handleSelectImage(img)}
                              className="w-full py-3 bg-brand-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                              <Box className="w-4 h-4" />
                              Generate 3D
                            </button>
                            <button
                              type="button"
                              className="w-full py-3 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Refine Concept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.modelUrl && (
                    <div className="rounded-[2.5rem] border border-white/10 bg-white/5 overflow-hidden shadow-2xl space-y-4 pb-4">
                      <div className="aspect-square relative group min-h-[280px]">
                        <MeshyModelViewer src={msg.modelUrl} token={user?.token} />
                        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/studio/${id}`)}
                            className="flex-1 min-w-[40%] py-3 rounded-2xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl"
                          >
                            <Edit3 className="w-4 h-4" />
                            AR Studio
                          </button>
                          <button
                            type="button"
                            onClick={() => openArPublishFromLlm(msg)}
                            className="flex-1 min-w-[40%] py-3 rounded-2xl bg-brand-primary text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl"
                          >
                            <Box className="w-4 h-4" />
                            Publish AR
                          </button>
                        </div>
                      </div>
                      <div className="px-6">
                        <MeshyFormatDownloadLinks urls={msg.modelUrls} compact />
                      </div>
                      <div className="px-6 pt-2 pb-1 flex flex-wrap gap-2 border-t border-white/5 mt-2">
                        <button
                          type="button"
                          onClick={() => setHireDialogOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary/15 border border-brand-primary/35 text-[11px] font-bold text-brand-primary hover:bg-brand-primary/25 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Model not right? Hire a 3D designer
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostFlowStep('feedback')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-[11px] font-bold text-white/75 hover:bg-white/10 transition-colors"
                        >
                          Rate result &amp; options
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {(isGenerating || isGenerating3D) && (
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <ArdyaWordmark className="text-[10px]" />
                </div>
                <div className="flex-1 p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-3 min-w-0">
                  <div className="flex items-center gap-4">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary shrink-0" strokeWidth={1.5} />
                    <span className="text-sm text-white/40 italic">
                      {isGenerating3D
                        ? `Building GLB (${gen.poly})…`
                        : isGenerating && selectedProvider === 'Tripo AI'
                          ? 'Meshy is generating your 3D model…'
                          : `${selectedProvider} is thinking…`}
                    </span>
                  </div>
                  {isGenerating && selectedProvider === 'Tripo AI' && meshyProgress > 0 ? (
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-teal-400 transition-all duration-300"
                        style={{ width: `${meshyProgress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto">
            {selectedProvider === 'Tripo AI' && stagedImage ? (
              <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <img
                  src={stagedImage}
                  alt="Staged for 3D"
                  className="w-full sm:w-40 h-40 object-cover rounded-xl border border-white/10 shrink-0"
                />
                <div className="flex-1 space-y-3 min-w-0">
                  <p className="text-xs text-white/50">
                    Image ready. Choose <span className="text-white/80">Model</span> (mesh) or{' '}
                    <span className="text-white/80">Textured</span> in the header, then generate.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateFromImage}
                      className="px-5 py-2.5 rounded-xl bg-brand-primary text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/90 disabled:opacity-50"
                    >
                      Generate 3D from image
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagedImage(null)}
                      className="px-5 py-2.5 rounded-xl border border-white/15 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f || !f.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') setStagedImage(reader.result);
                };
                reader.readAsDataURL(f);
              }}
            />
            <form onSubmit={handleSend} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 blur-2xl rounded-[3rem] opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
              <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-2 md:p-3 focus-within:border-brand-primary/50 transition-all backdrop-blur-md flex-wrap">
                <button
                  type="button"
                  onClick={onMic}
                  className="p-3 md:p-4 text-white/40 hover:text-brand-primary transition-colors rounded-full hover:bg-white/5 shrink-0"
                  title="Voice input (Chrome/Edge)"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your AR asset…"
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none py-3 md:py-4 text-sm placeholder:text-white/20"
                />
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`p-3 md:p-4 rounded-full transition-colors ${settingsOpen ? 'bg-brand-primary/20 text-brand-primary' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    title="Generation settings"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                  {settingsOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-[min(100vw-2rem\\,280px)] rounded-2xl border border-white/10 bg-[#0c0c0c] p-4 shadow-2xl z-50 text-left">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Output</span>
                        <button type="button" onClick={() => setSettingsOpen(false)} className="text-white/40">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <label className="block text-[10px] text-white/40 mb-1">Concept images</label>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        value={gen.imageCount}
                        onChange={(e) => setGen((g) => ({ ...g, imageCount: +e.target.value }))}
                        className="w-full mb-3 accent-brand-primary"
                      />
                      <div className="text-xs text-white/60 mb-3">{gen.imageCount} images</div>
                      <label className="block text-[10px] text-white/40 mb-1">3D models</label>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        value={gen.modelCount}
                        onChange={(e) => setGen((g) => ({ ...g, modelCount: +e.target.value }))}
                        className="w-full mb-3 accent-brand-primary"
                      />
                      <div className="text-xs text-white/60 mb-3">{gen.modelCount} model(s)</div>
                      <label className="block text-[10px] text-white/40 mb-2">Mesh detail</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setGen((g) => ({ ...g, poly: p }))}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${gen.poly === p ? 'border-brand-primary bg-brand-primary/15 text-brand-primary' : 'border-white/10 text-white/40'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-3 md:p-4 text-white/30 hover:text-brand-primary transition-colors rounded-full hover:bg-white/5 shrink-0"
                  title={
                    selectedProvider === 'Tripo AI'
                      ? 'Attach image for image-to-3D (preview above, then Generate)'
                      : 'Attach image'
                  }
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="p-3 md:p-4 bg-brand-primary text-black rounded-full hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-brand-primary/20 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            <p className="text-[9px] text-center text-white/25 mt-4 uppercase tracking-widest">
              ARdya · {selectedProvider} · {project.useCase ? `use case: ${project.useCase}` : ''}{' '}
              {project.category ? `• ${project.category}` : ''}
            </p>
          </div>
        </div>
      </main>

      {id ? (
        <ProjectChatHireDialog
          open={hireDialogOpen}
          onClose={() => setHireDialogOpen(false)}
          projects={projects}
          currentProjectId={id}
          freelancers={freelancers}
        />
      ) : null}
      <ProjectChatCreditsDialog
        open={creditsDialogOpen}
        onClose={() => setCreditsDialogOpen(false)}
        balance={user?.isAdmin ? null : user?.credits ?? null}
        isAdmin={!!user?.isAdmin}
        onDemoAddCredits={(amount) => {
          if (!user || user.isAdmin) return;
          const cur = typeof user.credits === 'number' ? user.credits : 0;
          setCredits(cur + amount);
        }}
      />

      <StudioPublishDialog
        open={arPublishOpen}
        busy={arPublishBusy}
        projectName={projectName.trim() || project.name}
        defaults={{
          arPageTitle: project.arPageTitle || project.name,
          arPageTagline: project.arPageTagline || project.description?.slice(0, 280) || '',
          arCtaLabel: project.arCtaLabel || 'View in your space',
          arAccentHex: project.arAccentHex || '#10b981',
          arSharePublic: project.arSharePublic !== false,
        }}
        onClose={() => !arPublishBusy && setArPublishOpen(false)}
        onConfirm={confirmArPublishFromChat}
      />
    </div>
  );
}
