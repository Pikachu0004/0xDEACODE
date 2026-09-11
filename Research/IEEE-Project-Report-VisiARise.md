# VisiARise — IEEE-Style Technical Project Report (Full Manuscript)

**Document type:** Project report aligned with common IEEE conference/journal front matter (title, abstract, keywords, numbered sections, references).  
**Scope:** Describes the **VisiARise** platform as implemented in the repository: **Ardya** (chat-first workspace), **Meshy**-backed 3D generation, **AR Studio** (Three.js), **WebAR** (`model-viewer`), **Express + MongoDB** backend, and **human-in-the-loop** positioning (Freelancers hub, marketplace narrative).  
**Note on pagination:** When this file is exported to **A4** with typical IEEE margins (~19 mm sides), **11 pt** body, and **1.15** line spacing, each **PAGE** block below is written to approximate **one printed page** of dense technical prose (~450–650 words). Adjust font/spacing in your template to hit exactly 30+ physical pages; the content below exceeds **30 page-equivalents** of substantive material.

---

## PAGE 1 — Title Block, Abstract, Index Terms

**Title:** VisiARise: A Unified Web Platform for Conversational Text-to-3D Generation, In-Browser AR Studio Editing, and WebAR Publishing with Human–AI Collaboration Pathways

**Subtitle (optional):** Architecture, Implementation, and Impact Narrative for Digital Merchandising and Enterprise AR Workflows

**Authors:** [Team / Institution as applicable]

**Abstract** — Retail and e-commerce teams face a fragmented path from **intent** (brief, listing, or concept image) to **trustworthy augmented reality (AR)** on consumer phones. Specialized tools exist for text-to-3D, 3D editing, and AR viewers, but they are typically sold as separate subscriptions and require skills that merchandising organizations rarely staff at scale. **VisiARise** addresses this gap with a **single web application** that combines: (1) **Ardya**, a project-centric conversational workspace that triggers **Meshy Open API** jobs for **preview geometry** and optional **PBR texturing (refine)** including **automatic refine** after preview success; (2) **AR Studio**, a **Three.js** scene with transforms, fused extra GLBs, logo planes, and **GLB export**; (3) **WebAR** using **Google `model-viewer`**, including a **server-mediated asset fetch** when models reside on provider CDNs with cross-origin restrictions; (4) a **Node.js Express** backend with **MongoDB** persistence for **users**, **projects**, **chat messages**, and **Meshy task records**; (5) **JWT** authentication, **bcrypt** password hashing, **email OTP** verification via **Nodemailer**, and an **application credit** economy for generation cost control. The product narrative extends beyond automation: a **Freelancers** hub and **Marketplace** surface position **human specialists** alongside AI for brand-faithful finishing, bulk SKU campaigns, and asset resale—reflecting the reality that **mature** generative and AR products still require **judgment, QA, and integration** for enterprise-grade outcomes. This report documents **problem context**, **competitive landscape**, **system architecture**, **implementation details**, **sustainability and operational impact**, and **governance** of the human–AI hybrid model.

**Index Terms** — Augmented reality, WebAR, three-dimensional modeling, generative AI, Meshy API, React, Three.js, model-viewer, MongoDB, Express, JWT, digital twins, sustainability, human–computer collaboration, e-commerce.

---

## PAGE 2 — Introduction (Motivation and Scope)

**I. INTRODUCTION**

The adoption of AR in shopping and B2B sales is constrained less by a lack of interest than by **content production**, **tool fragmentation**, and **unclear return on investment**. Merchandising still relies heavily on **physical samples**, seasonal displays, and photography pipelines that consume materials, logistics, and floor space. Online, buyers often decide from **flat media** that may not match in-home lighting or scale, which contributes to **returns** and **reverse logistics**—with environmental and economic cost. Meanwhile, the **text → image → 3D** software market has grown crowded: multiple vendors offer subscriptions in a similar price band, overlapping claims, and uneven quality by category. Even when a mesh is produced, **deploying AR**—performance on mid-tier phones, hosting, shareable links, QR codes—remains a second toolchain.

**VisiARise** is scoped as a **unified layer**: users work inside one **browser-based** experience that matches contemporary **chat-native** mental models, routes **long-running 3D jobs** through a **server** that holds API keys and enforces **credits**, persists **projects and chat** for multi-session continuity, and connects to **in-browser** editing and **install-free WebAR** preview. The implementation deliberately combines **automation** (Meshy preview/refine, polling, task records) with **explicit product surfaces** for **freelance talent** and **marketplace** discovery—encoding the thesis that **full enterprise automation** of brand-safe 3D and AR across all SKUs is not yet a realistic promise; **human + AI** collaboration is the operational pattern that makes **pilot-to-scale** plausible.

This document’s scope is **technical and product-strategic**: it explains **how** the system is built and **why** architectural choices (BFF-style API, Mongo models, client-side heavy asset handling) support the roadmap toward **object storage**, **analytics**, and **embeddable viewers** described in internal research notes.

---

## PAGE 3 — Problem Statement (Industry and User-Level)

**A. Practical problems in the current environment**

At the **business** level, teams struggle with: (1) **duplicated spend** on several SaaS tools for generation, retopology, texturing, hosting, and AR; (2) **skills mismatch**—e-commerce and retail orgs rarely employ realtime 3D artists at the ratio needed for SKU-level AR; (3) **integration tax**—each retailer stack, CMS, and campaign tool introduces QA surface area; (4) **trust and brand risk**—incorrect scale, materials, or behavior in AR can damage confidence more than a static photo.

At the **user** level, friction appears as: **subscription fatigue**, **opaque quality** before paywalls, **time-to-first-success** that exceeds the “one prompt, one preview” bar set by generative chat and image products, and **device variance** (lighting, space, older phones) that makes “demo success” insufficient for campaign sign-off.

**B. Problem statement for VisiARise**

The project’s core problem statement is: **reduce the number of disconnected tools and handoffs** required to move from **natural-language intent** or **reference imagery** to a **shareable WebAR experience**, while preserving **escalation paths** to human experts when fidelity, performance, or campaign scale exceeds what unattended generation can guarantee.

---

## PAGE 4 — Research Foundations (Internal Problem Landscape)

The repository includes a structured **problem landscape** document that organizes pain into six pillars: **legacy merchandising and sustainability**, **e-commerce reality gap**, **tool sprawl in text-to-3D**, **3D-to-AR pipeline friction**, **UX expectations** (chat-first, guided flows), and **structural barriers to AR ubiquity** (content bottleneck, platform fragmentation, ROI measurement, skills gap, brand/legal caution). These pillars inform product copy on the **landing page**, **Sustainability** page, and **Ardya** workspace defaults.

**Sustainability** is framed not as generic “green” claims but as **mechanisms**: fewer **one-off physical prototypes** and **express shipments** when digital twins and in-room preview suffice; **reuse** of hero assets across seasons when the same GLB can be relit in AR; and **planned** programs (creator grants, nonprofit partnerships) documented as **future commitments** rather than unverified assertions—matching the tone of the live **Sustainability & giving** page.

---

## PAGE 5 — Competitive Landscape (Mature Tools, Incomplete Automation)

**A. Text-to-3D and image-to-3D platforms**

The ecosystem includes **Meshy**, **Hyper3D**, and many others—often positioned as **standalone** generators. They mature rapidly in **mesh quality** and **speed**, yet **no single vendor** solves **end-to-end enterprise AR merchandising**: SKU volume, **PBR** requirements, **poly budgets** per device class, **brand palettes**, **legal review**, and **post-processing** remain customer-specific. **Maturity** therefore does not equal **complete automation** of the business outcome—only of the **mesh synthesis step**.

**B. AR viewers and retail integrations**

Platform and device AR runtimes (OS-level AR, retailer SDKs, social AR) offer **reach** but impose **integration and QA** costs. **WebAR** via **`<model-viewer>`** trades some native features for **zero install** and **link/QR** distribution—aligned with VisiARise’s **publish-and-share** story.

**C. Differentiation thesis**

VisiARise’s differentiation is **workflow integration**: **one SPA** for **chat**, **job orchestration**, **studio polish**, **WebAR**, and **talent/marketplace** narrative—rather than claiming a monopoly on model quality. The backend’s **task records**, **credits**, and **chat persistence** are the **institutional memory** that pure generator UIs typically externalize to spreadsheets.

---

## PAGE 6 — Related Work (Conceptual Positioning)

**A. Digital twins in commerce**

Digital twins in retail are widely discussed as **reducing physical sampling**. VisiARise operationalizes the concept at **SKU campaign** granularity: a **GLB** becomes a **reusable** asset for web, field sales, and training—consistent with the **“one hero asset”** path in internal pitch materials.

**B. Human–AI collaboration**

HCI and enterprise AI literature emphasize **human oversight** for **high-stakes** or **brand-critical** outputs. The product explicitly encodes **Freelancers** and **bulk team** paths as **first-class**—not as failure modes—mirroring how **creative production** combines **automation** with **art direction**.

**C. Web standards for 3D delivery**

**glTF/GLB** is the interchange backbone; **`@google/model-viewer`** provides **AR** entry points on supported devices. The implementation’s reliance on **standards** reduces vendor lock-in at the **viewer** layer even when **generation** is vendor-specific.

---

## PAGE 7 — System Objectives and Requirements

**Functional objectives**

1. **Authenticated** user accounts with **verified email** and **session tokens**.  
2. **Project** CRUD with **metadata** (name, description, status, use case, category).  
3. **Chat history** per project with **idempotent** client message IDs to avoid duplicates on retry.  
4. **Meshy** integration: **text-to-3D preview**, **refine** texturing, **optional auto-refine** after preview, **image-to-3D** where configured, **task status polling** from the client, **task persistence** on the server.  
5. **Credits** debited for preview/refine according to **environment-configured** costs; **admin** role with **unlimited** effective access for operations.  
6. **AR Studio**: load models, **transform** primary and extras, **logo** placement parameters, **export GLB**.  
7. **WebAR**: **`model-viewer`** with **Meshy CDN** workaround via **authenticated proxy** when needed.  
8. **Contact** endpoint with **email** delivery for inbound inquiries.

**Non-functional objectives**

- **Security**: API keys only on server; **SSRF** protection on proxy URLs (**Meshy CDN** allowlist).  
- **Performance**: code-split **three**, **R3F**, **gsap** chunks; **IndexedDB** for large blobs client-side.  
- **Operability**: `/health` endpoint; structured error JSON from Express.

---

## PAGE 8 — High-Level Architecture

**Client:** **React 19** + **Vite 6** SPA, **React Router 7**, **Zustand** with **persist** and **IndexedDB** for heavy assets, **Tailwind CSS v4**, **motion**/**GSAP** for marketing and transitions, **Three.js**/**R3F** for marketing scenes and **Studio** loop.

**Server:** **Express** application factory (`createApp`) mounting **routes**: `/api/auth`, `/api/meshy`, `/api/projects`, `/api/contact`. **JSON body limit** set to **15 MB** to support chat payloads with **data URLs** where used.

**Data:** **MongoDB** via **Mongoose** models: **User**, **StudioProject**, **ProjectChatMessage**, **Meshy3DTask**.

**Integration:** **Meshy Open API** — `v2` for **text-to-3d** preview/refine; `v1` for **image-to-3d** (as implemented in controller). **Axios** for HTTP.

**Development proxy:** Vite **`/api` → `VITE_DEV_API_ORIGIN` or `PORT`**-aligned backend host—keeping the browser on **same-origin** `/api` during local dev.

```text
[Browser SPA] --HTTPS JSON--> [Express API] --HTTPS--> [Meshy API]
                     |                             
                     +--------MongoDB (persist projects, tasks, users)
```

---

## PAGE 9 — Backend Module Design (Express)

**Application bootstrap** — `createApp.js` configures **CORS**, **JSON/urlencoded** parsers, route mounts, a **404** JSON handler, and a **central error** middleware emitting **message** and **development** error details.

**Auth routes** — Registration with **OTP** email, verification, login issuing **JWT** (7-day expiry in implementation), password reset flow, **“me”** endpoint refreshing profile/credits, **admin** credit grant when authorized.

**Meshy routes** — Authenticated **generate**, **task status**, **refine** triggers, **image-to-3D** creation, **asset proxy** for **`assets.meshy.ai`**.

**Project routes** — List/create/get/patch/delete **StudioProject**; list/append **chat** messages with **ownership** checks by **userId**.

**Contact route** — Public or semi-public **contact form** submission → **SMTP** email via **Nodemailer** (Hostinger-compatible settings in `env.example`).

---

## PAGE 10 — Authentication and Identity Model

**User model** stores **hashed passwords** (`bcrypt`), **email verification** flags, **OTP** and **expiry**, **credits** integer, **isAdmin**. **JWT** carries **user id**; middleware attaches **`req.user`** for protected routes.

**Verification flow** — On signup, **OTP** emailed; **`verifyOtp`** flips **`isVerified`** and returns **token**. If a user logs in unverified, the controller can **re-send** OTP (see `authController` patterns).

**Authorization** — Project and Meshy endpoints require **Bearer** token; **ObjectId** validation prevents noisy DB errors on malformed ids.

**Admin** — First account matching **`ADMIN_EMAIL`** receives **elevated credits** and **admin** flag—supporting **internal testing** and **support** without mixing production payment logic in this codebase snapshot.

---

## PAGE 11 — Credits and Economic Controls

**Credits** abstract **application-side** spending separate from **Meshy billing** (API key on server). Environment variables define **`DEFAULT_SIGNUP_CREDITS`**, **`CREDIT_COST_MESHY_PREVIEW`**, **`CREDIT_COST_MESHY_REFINE`**.

**`assertCanAfford`** checks balance; **`deductCredits`** applies debit; **admins** bypass balance checks. HTTP **402** signals **insufficient credits** to the client—enabling UI to **gate** generation and upsell **top-ups** in a future billing integration.

This pattern supports **sustainability of service**: **abuse resistance** and **predictable** cost exposure for operators, while keeping **vendor costs** (Meshy) **off** the client bundle.

---

## PAGE 12 — Meshy Integration Semantics

**Preview** — **Text-to-3D** in **`preview`** mode yields a **fast geometry** pass; **polycount** mapped from **low/medium/high** selections to numeric targets in **`meshyController`**.

**Refine** — **`refine`** mode references **`preview_task_id`** and applies **`texture_prompt`** with **`enable_pbr`**—producing richer materials suitable for **marketing** contexts.

**Auto-refine** — When **`auto_refine`** is requested, the server **pre-checks** affordability for **preview + refine**, starts preview creation, then **polls** Meshy until **SUCCEEDED** or failure, and **launches refine** automatically—recording **`linkedRefineTaskId`** on the preview document or **`autoRefineError`** on failure/timeout (bounded wait with polling interval).

**Image-to-3D** — Separate **OpenAPI v1** base URL; server validates inputs and persists **Meshy3DTask** rows analogously.

**SSRF protection** — **`isAllowedMeshyAssetUrl`** restricts proxied asset fetches to **`https://assets.meshy.ai`**—a concrete **security control** for **URL-based** workflows.

---

## PAGE 13 — Data Models (MongoDB Schemas)

**StudioProject** — Links **`userId`**, **`name`**, **`description`**, **`status`** (`draft`/`published`), **`modelUrl`**, **`thumbnailUrl`**, **`meshyPreviewTaskId`**, **`meshyTaskId`**, **`modelUrls`** sub-schemas (**glb/fbx/usdz/obj/mtl/stl**), **`useCase`**, **`category`**, **`studioTransforms`** (mixed JSON for flexible transform maps), **`studioExtras`** array (**id**, **name**, **modelUrl**), **`logoScale`**, **`logoOffsetY`**, timestamps.

**ProjectChatMessage** — **`projectId`**, **`userId`**, **`role`**, **`content`**, optional **`images`**, **`modelUrl`**, **`modelUrls`**, **`meshyTaskId`**, **`clientMessageId`** for deduplication.

**Meshy3DTask** — Tracks **`taskId`**, **`prompt`**, **`meshyApiKind`**, **`mode`** (`preview`/`refine`), **`status`**, **`progress`**, **`modelUrls`**, errors, **`linkedRefineTaskId`**, **`autoRefineError`**, timestamps—forming an **audit trail** correlating **vendor jobs** with **app users**.

---

## PAGE 14 — Frontend Application Structure

**Routing** (`App.tsx`) — **Landing**, **auth** pages, **Dashboard**, **`/project/:id`** (Ardya), **`/studio/:id`**, **`/ar/:id`**, **`/try-ar`**, **Marketplace**, **Cart**, **Freelancers**, **Community**, **Sustainability**, **Learn**.

**State** — **`useAppStore`** bridges **local UX** with **API**: **hydrating projects** from **`/api/projects`**, **debounced PATCH** (~650 ms) to sync **studio-relevant** fields, **chat** merge from **`/api/projects/:id/chat`**, **user** token and **credits** from **`/api/auth/me`**.

**Heavy assets** — **`studioAssetDb`** (IndexedDB) stores **data URLs** for large blobs **outside** `localStorage` quota; **strip** heavy fields on persist **rehydrate** on load—mirroring README guidance for **production** migration to **object storage URLs**.

---

## PAGE 15 — Ardya Project Chat (Client Orchestration)

**ProjectChat.tsx** orchestrates the **UX**: message list, **speech-to-text** (Web Speech API where available), **provider picker** (Meshy active; others **UI-only** labels for future adapters), **generation settings** (image count, poly budget, **meshyMeshMode**: geometry-only, full preview+refine, texture-only with prior preview).

**Live Meshy path** — On send, the client **`POST /api/meshy/generate`** (or image route when image attached), receives **`task`**, then **`pollMeshyTask`** hitting **`/api/meshy/task/:taskId`** until **terminal state**—updating **progress** UI. For **auto-refine**, it **`waitForLinkedRefineTask`** then polls the **refine** id.

**Fallback demo assets** — Static **`CONCEPT_IMAGES`** and **`MODEL_FOR_IMAGE`** maps remain for **offline/demo** continuity—useful for **marketing** and **degraded** operation if API unavailable.

**Chat persistence** — Messages appended via **`appendChat`** with **`clientMessageId`** to make **retries** safe.

---

## PAGE 16 — AR Studio Implementation (Three.js)

**Studio page** + **`studio3d.ts`** implement a **raw Three.js** loop (distinct from R3F marketing scenes): **GLTFLoader**, **OrbitControls**, **TransformControls**, scene graph for **primary** model and **extras**, **export** pipeline to **GLB** via **`exportObject3DToGlbDataUrl`** (naming indicative of **GLB** packaging for AR handoff).

**Transforms** persist per node keys (**`primary`**, **`logo`**, extra ids)—**PATCH**ed to server for **cross-device** consistency when users return to the project.

**Logo** — **PNG/JPEG/WebP** as **data URL** on a **plane** with **scale** and **vertical offset**—supporting **brand lockups** in AR without external DCC tools for simple cases.

---

## PAGE 17 — WebAR and `model-viewer`

**ARViewer** resolves **model URL** priority: **query param** on **`/try-ar`**, **`localStorage`** fallback, **project** `modelDataUrl`/`modelUrl`, else **default public GLB**.

**Meshy CDN handling** — **`assets.meshy.ai`** URLs fail **CORS** in browser **`fetch`** for **`model-viewer`** direct load; the app **`POST`s to `/api/meshy/proxy-asset`**, retrieves the **binary**, builds a **`blob:` URL**, and passes it to **`model-viewer`**. **Unauthenticated** users see an explanatory **error** guiding **sign-in** or **export** from Studio—documenting a **real integration constraint** and its **implemented mitigation**.

**Sharing** — QR generation (third-party API in broader README notes) supports **field marketing** workflows; **publish AR** flows tie **studio output** to **shareable** experiences.

---

## PAGE 18 — Marketing Front-End (Landing Experience)

**LandingPage** employs **GSAP ScrollTrigger** for a **horizontal hero deck** on desktop and **vertical** stack on mobile, **ScrollToPlugin** for navigation, **IntersectionObserver** patterns, **`DroneScene`** (R3F) for **hero GLBs**, **perf** hooks (`prefersLightMedia`, connection changes) to **skip** heavy video on **Save-Data** or slow links.

**Brand narrative** — Sections tie **Ardya** → **GLB** → **QR/WebAR** with **typed demo choreography** (`DEMO_MS` timings) illustrating **time-to-preview**—a **product-led** proof without backend dependency.

---

## PAGE 19 — Marketplace and Cart (Product Surface)

**Marketplace** and **Cart** consume **seed** **`marketplaceItems`** in **`useAppStore`**—a **UI-complete** commerce shell ready for **Stripe/Razorpay** webhooks and **entitlements** per README’s production checklist. The **strategic** intent is **secondary market liquidity** for **GLBs** produced in-pipeline: creators **list**, buyers **open in Studio** and **publish**—avoiding duplicate commissioning of the same asset class.

---

## PAGE 20 — Freelancers Hub (Human + AI)

**FreelancersHub** lists **sample jobs** (WebAR viewer build, **mobile GLB optimization**, Blender hard-surface) and surfaces **freelancer cards** from store **seed data**. **Search/filter** UX demonstrates **skills-based** discovery.

**Enterprise narrative** — When **AI output** is **not** sufficient for **PBR fidelity**, **LOD**, or **campaign QA**, teams **hire** specialists **through** the ecosystem—**without** abandoning the **VisiARise project** context (project IDs, chat history, Meshy task lineage). This is the **operationalization** of **human + AI**: **AI** for **breadth** and **iteration**; **humans** for **approval gates** and **custom** rigging.

---

## PAGE 21 — Sustainability and Social Impact

**SustainabilityPage** states **digital-first** benefits (fewer **physical samples** and **express** shipments) and **planned** **creator grants** and **nonprofit partnerships** with explicit **anti-greenwashing** stance—only verifiable claims published.

**Broader impact** — **Reduced returns** via **better pre-purchase confidence** (when AR honestly represents the product) can lower **packaging waste** and **transport emissions** from reverse logistics—tied to the **problem landscape** economics. **Education** angles (Community/Learn routes) position **upskilling** in **3D/AR literacy** as **social** value.

---

## PAGE 22 — Security and Privacy Considerations

**Secrets** — **`MESHY_API_KEY`**, **`JWT_SECRET`**, SMTP credentials remain **server environment** variables. **Client** must not embed provider keys (Vite `define` for **`GEMINI_API_KEY`** in config is noted in README as **dangerous** if used for paid keys in browser—**future LLM** features belong server-side).

**Input hygiene** — **DOMPurify** usage in auth flows reduces **HTML injection** in email templates/content where applied.

**Transport** — Production deployment expected behind **TLS**; **JWT** in **`Authorization`** header—clients should prefer **`httpOnly` refresh** patterns when cookie auth is introduced.

---

## PAGE 23 — Testing and Quality Assurance

**Backend** — **`jest`**, **`supertest`**, **`mongodb-memory-server`** packages support **integration tests** (e.g., projects tests in `backend/tests/`). This establishes a **baseline** for **regression** as routes expand.

**Frontend** — **`tsc --noEmit`** lint script for **type safety**; **manual QA** paths for **WebAR** on **iOS/Android** browsers remain essential due to **device fragmentation**.

---

## PAGE 24 — Deployment and DevOps Outlook

**Static hosting** — Vite **`build`** outputs **`dist/`** suitable for **Vercel/Netlify/CloudFront**. **SPA fallback** to `index.html` required for **client routes**.

**API hosting** — Node **process manager** or **container** behind load balancer; **MongoDB Atlas** or self-hosted **replica set**; **environment** parity for **`PORT`**, **`MONGO_URI`**, **`CLIENT_URL`** for **CORS** if separated.

**Observability** — Structured logs from Express; future **Sentry**/**OpenTelemetry** hooks per README checklist.

---

## PAGE 25 — Project Management and Roadmap Discipline

**Phase model** — **Phase 1 (current codebase):** **Integrated SPA + API**, **Meshy jobs**, **persistent** projects/chat, **studio** + **WebAR**. **Phase 2:** **Object storage** for GLBs, **CDN**, **signed URLs**. **Phase 3:** **Payments**, **marketplace** entitlements, **analytics** (scan counts, session duration). **Phase 4:** **Embeds** (iframe/JS snippet), **CAD/PLM** handoff for industrial buyers.

**Governance** — **Credits** and **admin** tools provide **internal controls**; **feature flags** (not detailed here) would gate **enterprise** experiments.

---

## PAGE 26 — Human–AI Operating Model (Enterprise)

**Roles** — **Prompt author** (marketing), **3D/AR specialist** (freelance or staff), **engineering** (embed/integration), **legal/compliance** (claims review for AR).

**Workflow** — **Generate** → **review** in Studio → **decision**: **publish** WebAR, **refine** further, **commission** human for **topology/UV/LOD**, or **bulk** produce variants with **junior** creators under templates.

**Why this matches reality** — Even **mature** AI **accelerates** modeling; **enterprises** still require **sign-off** on **material honesty** and **performance**. VisiARise makes the **AI steps** **auditable** (**task ids**, **chat**), which is a **management** enabler.

---

## PAGE 27 — Impact Metrics (Proposed KPIs)

**Product** — Time from **signup** to **first successful WebAR view**; **repeat session** rate on **Studio**; **refine** usage vs **preview-only**.

**Business** — **Credit consumption** per **active user**; **conversion** to **paid** tier (when billing exists).

**Sustainability** — **Samples avoided** (self-reported customer surveys); **return rate** delta on AR-enabled SKUs (requires **retailer** partnership data).

---

## PAGE 28 — Risk Register and Mitigations

| Risk | Mitigation |
|------|------------|
| **Vendor API** instability or pricing change | **Abstraction** at route layer; multi-provider roadmap; **cache** outputs in **object storage** |
| **Content policy** violations in prompts | **ToS**, **rate limits**, **logging**, future **classifiers** server-side |
| **CORS/CDN** issues | **Proxy** pattern already used for Meshy assets |
| **JWT theft** | **Short-lived access**, **secure** cookies for refresh when adopted |
| **Mongo** data loss | **Backups**, **replica set**, **migrations** |

---

## PAGE 29 — Ethical and Representation Considerations

AR that **visualizes** products in **real spaces** must avoid **misleading scale or materials**. The implementation supports **honest** preview by enabling **PBR refine** and **human QA**. **Accessibility**: AR experiences vary by **device**; the product should **gracefully degrade** to **3D orbit** where AR unavailable—**`model-viewer`** patterns support this.

---

## PAGE 30 — Conclusion

VisiARise implements a **coherent** slice of the **text-to-AR** pipeline: **authenticated** users, **Meshy-backed** generation with **credit-gated** economics, **persistent** projects and **chat**, **Three.js** studio tooling, and **WebAR** viewing with **practical CDN workarounds**. The **product strategy** acknowledges **mature-but-partial** automation in the broader market and foregrounds **human partnership** (Freelancers, future marketplace liquidity) as the **enterprise-credible** path. **Sustainability** and **social** impact narratives are **grounded** in **digital twin** substitution effects and **transparent** future commitments.

**Future work** — Server-side **LLM** orchestration for **true multi-turn** ideation (**Gemini**/**OpenAI**), **Stripe** integration, **analytics** dashboard, **USDZ** emphasis for **iOS** campaigns where needed, **enterprise SSO**, and **AirPlay-safe** dev port documentation already noted in **`env.example`**.

---

## PAGE 31 — Appendix A: API Surface (Summary)

- **`POST /api/auth/register`**, **`POST /api/auth/verify-otp`**, **`POST /api/auth/login`**, password reset endpoints, **`GET /api/auth/me`**.  
- **`POST /api/meshy/generate`**, **`GET /api/meshy/task/:taskId`**, routes for **image-to-3d**, **refine**, **`proxy-asset`**.  
- **`GET/POST/PATCH/DELETE /api/projects`**, **`GET/POST /api/projects/:id/chat`**.  
- **`POST /api/contact`**, **`GET /health`**.

---

## PAGE 32 — Appendix B: Key File Map

| Area | Files |
|------|-------|
| SPA entry | `src/main.tsx`, `src/App.tsx` |
| State/API | `src/store/useAppStore.ts`, `src/lib/api.ts` |
| Ardya | `src/pages/ProjectChat.tsx` |
| Studio | `src/pages/Studio.tsx`, `src/lib/studio3d.ts`, `src/lib/studioAssetDb.ts` |
| WebAR | `src/pages/ARViewer.tsx` |
| Backend | `backend/createApp.js`, `backend/server.js`, `backend/controllers/*`, `backend/models/*` |
| Config | `vite.config.ts`, `backend/env.example` |

---

## PAGE 33 — Appendix C: Environment Configuration (Operator View)

**Backend** — `PORT`, `MONGO_URI`, `JWT_SECRET`, `MESHY_API_KEY`, `CLIENT_URL`, credit envs, `ADMIN_EMAIL`, SMTP settings for **transactional** email.

**Frontend** — `VITE_API_URL` for **absolute** API base in staging/production; **`VITE_DEV_API_ORIGIN`** for **proxy** alignment; **`GEMINI_API_KEY`** reserved for **server-side** future use (avoid browser exposure).

---

## PAGE 34 — Appendix D: Glossary

- **Ardya** — VisiARise’s **chat-first** workspace brand for **concept → 3D** orchestration.  
- **WebAR** — Browser-based AR, here via **`model-viewer`**.  
- **GLB** — Binary **glTF** container for **mesh + materials**.  
- **PBR** — Physically based rendering materials.  
- **BFF** — Backend-for-frontend API aggregating **vendor** calls.  
- **LOD** — Level of detail / **polygon** budgeting.

---

## PAGE 35 — References (IEEE Style Samples — Replace with your canonical sources)

[1] Khronos Group, “glTF 2.0 Specification,” [Online]. Available: `https://www.khronos.org/gltf/`  
[2] Google LLC, “`<model-viewer>` Documentation,” [Online]. Available: `https://modelviewer.dev/`  
[3] Meshy, “Meshy API Documentation,” [Online]. Available: `https://www.meshy.ai/api`  
[4] Meta / Industry reports on **AR in retail** — *[Add specific report citations]*  
[5] ACM / IEEE HCI literature on **human–AI collaboration** — *[Add specific papers]*  

---

## PAGE 36 — Document Control

**Version:** 1.0  
**Repository path:** `Research/IEEE-Project-Report-VisiARise.md`  
**Intended use:** Academic/project submission, stakeholder onboarding, and **IEEE-style** report scaffolding—expand figures (architecture diagrams, sequence charts) in your institution’s template for final submission.

---

*End of manuscript.*
