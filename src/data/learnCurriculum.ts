/** Deep, sectioned curriculum — ~8 sections per track with external resources. */

export type LearnResource = { label: string; href: string };
export type LearnSection = {
  id: string;
  title: string;
  paragraphs: string[];
  resources: LearnResource[];
};
export type LearnTopic = {
  id: string;
  title: string;
  blurb: string;
  sections: LearnSection[];
};

function sec(
  id: string,
  title: string,
  paragraphs: string[],
  resources: LearnResource[]
): LearnSection {
  return { id, title, paragraphs, resources };
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: 'web-ar',
    title: 'Web AR',
    blurb:
      'Browser-based augmented reality using WebXR, model-viewer, and glTF — no app store required for many flows.',
    sections: [
      sec(
        'web-ar-1',
        'What is Web AR and why it matters',
        [
          'Web AR delivers camera-based augmentation inside a web page: users follow a link or scan a QR code, grant camera permission, and place 3D content in their environment. Distribution is URL-native, which removes the classic “install an app” barrier for reviews, retail try-ons, and field sales.',
          'Technically, implementations split into two families: **WebXR** device APIs for immersive sessions, and **scene-viewer / AR Quick Look** bridges on mobile that launch system viewers from a `<model-viewer>` tag or USDZ link. Your VisiARise pipeline exports **glTF/GLB**, which maps cleanly to these viewers.',
          'Performance and fidelity depend on polygon budgets, texture resolution, lighting, and how you stream assets. For production, target **Draco** or meshopt-compressed glTF when possible, cap texture sizes (e.g. 2K for hero assets), and test on mid-range Android devices.',
          'Accessibility and privacy: always explain why the camera is used, avoid recording video without consent, and provide a non-AR fallback (spinning 3D preview) when WebXR is unavailable.',
        ],
        [
          { label: 'WebXR Device API — MDN', href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API' },
          { label: 'model-viewer (Google)', href: 'https://modelviewer.dev/' },
          { label: 'Khronos glTF', href: 'https://www.khronos.org/gltf/' },
        ]
      ),
      sec(
        'web-ar-2',
        'glTF, GLB, and material choices',
        [
          '**glTF** is a transmission format: JSON + binary buffers; **GLB** is the single-file binary bundle. For Web AR you almost always ship **GLB** for simpler hosting and caching.',
          'Use **PBR metallic-roughness** workflows: base color, metallic, roughness, normal maps, and occlusion packed where possible. Avoid exotic shader graphs that do not export to glTF unless you bake results.',
          'Animations: glTF supports skeletal and morph targets. Keep joint counts reasonable for mobile skinning. Test with `THREE.SkinnedMesh` or model-viewer’s animation mixer.',
          'Scale: real-world units in meters help AR placement feel believable. Center meshes sensibly and verify bounding boxes before publishing.',
        ],
        [
          { label: 'glTF 2.0 spec', href: 'https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html' },
          { label: 'glTF Viewer (Khronos)', href: 'https://github.khronos.org/glTF-Sample-Viewer-Release/' },
        ]
      ),
      sec(
        'web-ar-3',
        'WebXR hit-testing and anchors',
        [
          'WebXR **hit-test** sources cast rays into real-world understanding so you can attach virtual objects to floors and tables. You request a session with `hit-test` enabled, create transient hit-test sources each frame, and place anchors when confidence is high.',
          '**Anchors** persist poses across frames; use them once placement stabilizes to reduce drift. Combine with dom-overlay for lightweight UI.',
          'Lighting estimation (`XRWebGLLightingEstimation`) helps match virtual shading to the room, improving realism for product visualization.',
          'Fallback: if WebXR is unsupported, degrade to 3D-only preview and instruct users to try Chrome/Android or Vision Pro Safari where applicable.',
        ],
        [
          { label: 'WebXR Hit Testing Explainer', href: 'https://github.com/immersive-web/hit-test/blob/master/hit-testing-explainer.md' },
          { label: 'Immersive Web CG', href: 'https://immersiveweb.dev/' },
        ]
      ),
      sec(
        'web-ar-4',
        'model-viewer integration patterns',
        [
          '`<model-viewer>` abstracts AR entry: attributes like `ar`, `ar-modes="webxr scene-viewer quick-look"`, and `camera-controls` cover common flows. Slot a custom AR button for branding.',
          'Host GLBs on HTTPS origins with correct **CORS** headers. For Meshy or third-party CDNs, proxy through your backend if CORS blocks the browser (VisiARise already does this for Meshy assets).',
          'Use `environment-image` and `skybox-image` sparingly; prefer neutral HDRIs for product accuracy.',
          'QA checklist: iOS Quick Look USDZ path (if you generate USDZ), Android Scene Viewer, desktop orbit-only path.',
        ],
        [
          { label: 'model-viewer docs', href: 'https://modelviewer.dev/docs/' },
        ]
      ),
      sec(
        'web-ar-5',
        'Performance on mobile browsers',
        [
          'Cap **pixel ratio** (e.g. 1–1.5) for WebGL layers. Reduce overdraw: single material variants, merged meshes where possible.',
          'Use **instancing** for repeated props. Avoid per-frame geometry allocation. Profile with Chrome Performance panel on a real phone.',
          'Network: cache GLB with `Cache-Control`, use HTTP/2, consider **progressive** loading with a low-res placeholder.',
          'Thermal throttling: long AR sessions heat devices — offer pause/stop controls.',
        ],
        [
          { label: 'Web.dev — Performance', href: 'https://web.dev/performance/' },
        ]
      ),
      sec(
        'web-ar-6',
        'Security, HTTPS, and permissions',
        [
          'Secure contexts (**HTTPS** or localhost) are mandatory for camera and WebXR. Mixed content will silently break AR features.',
          'Explain permission prompts in your UX copy. Handle denial gracefully with static renders.',
          'Sanitize any user-generated URLs before fetching assets; prefer allow-listed CDNs.',
          'Content Security Policy: allow `blob:` only when necessary for downloads; restrict `connect-src` to your API origins.',
        ],
        [
          { label: 'MDN — Secure contexts', href: 'https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts' },
        ]
      ),
      sec(
        'web-ar-7',
        'Analytics and conversion',
        [
          'Track AR entry rate vs. 3D-only views. Measure time-to-first-placement and session length.',
          'For commerce, correlate AR usage with cart adds (privacy-preserving). A/B test QR placements on packaging.',
          'Log WebXR availability to understand audience device capabilities.',
          'Document failure modes (unsupported browser, low memory) for support teams.',
        ],
        [
          { label: 'Web Analytics Academy', href: 'https://analytics.google.com/analytics/academy/' },
        ]
      ),
      sec(
        'web-ar-8',
        'Roadmap: WebGPU & persistent AR',
        [
          'WebGPU unlocks higher-fidelity materials and compute shaders in the browser; pair with WebXR for next-gen showcases.',
          'Persistent AR (sessions that remember anchors across visits) is evolving — watch proposals in the Immersive Web WG.',
          'Cloud anchors (Google/Apple) require native SDKs today; hybrid apps bridge web content into native shells when needed.',
          'Stay current: follow **Immersive Web Weekly** and Khronos glTF extensions for transmission compression.',
        ],
        [
          { label: 'Immersive Web Weekly', href: 'https://immersivewebweekly.com/' },
          { label: 'WebGPU', href: 'https://www.w3.org/TR/webgpu/' },
        ]
      ),
    ],
  },
  {
    id: 'arcore',
    title: 'ARCore (Google)',
    blurb:
      'Google’s platform for motion tracking, environmental understanding, and light estimation on Android — also surfaces in Scene Viewer for Web.',
    sections: [
      sec(
        'arcore-1',
        'Core concepts: motion tracking & understanding',
        [
          'ARCore fuses **visual-inertial odometry**: the device camera observes feature points while IMU provides motion priors. This yields 6-DoF camera pose in real time.',
          '**Plane detection** finds horizontal and vertical surfaces; **depth** APIs (where supported) improve occlusion.',
          'Environmental **HDR lighting probes** help match virtual objects to the scene.',
          'Not all devices support every ARCore feature — consult the supported devices list before shipping.',
        ],
        [
          { label: 'ARCore overview', href: 'https://developers.google.com/ar' },
          { label: 'Fundamentals', href: 'https://developers.google.com/ar/develop/fundamentals' },
        ]
      ),
      sec(
        'arcore-2',
        'Scene Viewer & Web integration',
        [
          'From the web, a compliant glTF link can open **Scene Viewer**, leveraging ARCore on supported Android devices.',
          'Intent URLs and `<model-viewer>` abstract much of this — ensure your GLB is optimized and hosted with HTTPS.',
          'Test on Pixel and popular Samsung devices; watch GPU driver variance.',
          'For native apps, use **ARCore SDK** with Unity, Unreal, or Android Java/Kotlin.',
        ],
        [
          { label: 'Scene Viewer', href: 'https://developers.google.com/ar/develop/java/scene-viewer' },
        ]
      ),
      sec(
        'arcore-3',
        'Anchors, Cloud Anchors, Geospatial',
        [
          'Local anchors attach content to tracked geometry. **Cloud Anchors** enable multi-user or persistent sessions by storing feature maps in Google’s servers.',
          '**Geospatial API** anchors content to real-world latitude/longitude using Street View–derived data — powerful for outdoor navigation experiences.',
          'Each API has quotas and privacy implications; disclose location usage to users.',
          'Handle tracking loss: fade content, re-localize, or prompt the user to rescan.',
        ],
        [
          { label: 'Cloud Anchors', href: 'https://developers.google.com/ar/develop/java/cloud-anchors' },
          { label: 'Geospatial API', href: 'https://developers.google.com/ar/geospatial' },
        ]
      ),
      sec(
        'arcore-4',
        'Depth, occlusion, and realism',
        [
          'Where **Raw Depth API** is available, use depth textures to occlude virtual objects behind real geometry.',
          'Without depth, approximate ground contact and avoid intersecting furniture in ways that break immersion.',
          'Combine depth with screen-space effects carefully — mobile GPUs are limited.',
          'Validate on devices with and without depth sensors.',
        ],
        [
          { label: 'Depth API', href: 'https://developers.google.com/ar/develop/java/depth/overview' },
        ]
      ),
      sec(
        'arcore-5',
        'Performance tuning on Android',
        [
          'Target 30fps or 60fps consistently; thermal throttling will reduce clocks — simplify shaders when hot.',
          'Batch draw calls; prefer texture atlases; compress textures with ASTC/ETC2.',
          'Profile with Android GPU Inspector and ARCore diagnostics.',
          'Minimize camera resolution if your pipeline allows — balance tracking quality vs. GPU load.',
        ],
        [
          { label: 'Android GPU Inspector', href: 'https://developer.android.com/agi' },
        ]
      ),
      sec(
        'arcore-6',
        'Testing matrix',
        [
          'Maintain a **device lab**: low/mid/high Android tiers. Test varying lighting (office, outdoor, night).',
          'Validate tracking recovery after motion blur or fast rotation.',
          'Use recorded AR sessions where possible for regression tests.',
          'Automate smoke tests for app startup and permission flows.',
        ],
        [
          { label: 'Supported devices', href: 'https://developers.google.com/ar/devices' },
        ]
      ),
      sec(
        'arcore-7',
        'Privacy & data minimization',
        [
          'Camera frames may be sensitive; process on-device when possible. For Cloud Anchors, understand what metadata leaves the device.',
          'Provide clear settings to delete stored anchors and session data.',
          'Comply with regional privacy laws for location and analytics.',
          'Document data flows for enterprise deployments.',
        ],
        [
          { label: 'Google AR data safety', href: 'https://developers.google.com/ar/develop/privacy' },
        ]
      ),
      sec(
        'arcore-8',
        'Where ARCore meets your VisiARise stack',
        [
          'Your **GLB exports** from Ardya/Studio should open in Scene Viewer: verify scale, orientation, and materials.',
          'When you need native features (persistent anchors, Geospatial), wrap web experiences in a thin Android client or use Unity with glTF import.',
          'Keep parity between WebXR and ARCore paths so marketing and sales teams can demo on both iOS and Android.',
          'Follow ARCore release notes quarterly — breaking changes are rare but feature availability expands.',
        ],
        [
          { label: 'ARCore release notes', href: 'https://developers.google.com/ar/release-notes' },
        ]
      ),
    ],
  },
  {
    id: 'ar-tools',
    title: 'AR tools & platforms',
    blurb: 'A tour of authoring tools, SDKs, and viewers beyond any single vendor.',
    sections: [
      sec('tools-1', 'Engines: Unity & Unreal', ['Unity **AR Foundation** abstracts ARCore, ARKit, and some WebXR workflows behind a common API. Unreal’s **ARBlueprint** suits high-fidelity cinematic AR.', 'Pick Unity for broad mobile support and asset store ecosystem; Unreal for film-quality lighting on capable hardware.', 'Export glTF from DCC tools or use native packaging for store apps.', 'VisiARise focuses on glTF for web — engines are complementary when you need native features.'], [{ label: 'AR Foundation', href: 'https://unity.com/features/arfoundation' }, { label: 'Unreal AR', href: 'https://docs.unrealengine.com/en-US/AR/' }]),
      sec('tools-2', '8th Wall, Zapworks, Spline', ['Web AR platforms provide hosting, templates, and SLAM stacks as a service — evaluate pricing, data residency, and export options.', 'Spline exports interactive 3D for web; useful for lightweight hero assets.', 'No-code tools speed prototypes but may lock you in — keep source glTF offline.', 'Compare WebXR support vs. proprietary players.'], [{ label: '8th Wall', href: 'https://www.8thwall.com/' }, { label: 'Spline', href: 'https://spline.design/' }]),
      sec('tools-3', 'Niantic Lightship & VPS', ['Outdoor AR often needs **visual positioning** against a pre-mapped mesh. Lightship offers VPS for real-world AR games and tours.', 'Requires good connectivity and clear mapping coverage in your region.', 'Use where GPS alone is insufficient.', 'Check licensing for commercial use.'], [{ label: 'Lightship', href: 'https://lightship.dev/' }]),
      sec('tools-4', 'ARKit parity (cross-read)', ['Even on an ARCore page, teams ship iOS — read Apple’s **ARKit** docs for material/lighting parity.', 'USDZ is the iOS counterpart to glTF for Quick Look; some pipelines convert glTF→USDZ.', 'Test Face AR separately — different privacy profile.', 'Keep feature flags per platform.'], [{ label: 'ARKit', href: 'https://developer.apple.com/augmented-reality/' }]),
      sec('tools-5', 'CI & asset pipelines', ['Automate glTF validation with **glTF-Validator**, Draco compression, and size budgets in CI.', 'Fail builds when textures exceed limits or extensions are forbidden.', 'Version assets with semver; tag builds with asset hashes.', 'Mirror CDN deploys with cache busting.'], [{ label: 'glTF Validator', href: 'https://github.khronos.org/glTF-Validator/' }]),
      sec('tools-6', 'Analytics & QA SDKs', ['Integrate crash and performance SDKs (Firebase, Sentry) with AR breadcrumbs: session start, tracking loss, AR entry.', 'Log device model and ARCore/ARKit versions.', 'Use remote config to toggle heavy features.', 'Respect user opt-out.'], [{ label: 'Firebase', href: 'https://firebase.google.com/' }]),
      sec('tools-7', 'Accessibility in AR tooling', ['Support screen readers for non-AR fallbacks; large touch targets for placement UI.', 'Offer audio descriptions where appropriate.', 'Avoid color-only cues for critical actions.', 'Document motion-reduced alternatives.'], [{ label: 'W3C XR Accessibility', href: 'https://www.w3.org/WAI/GL/wiki/XR_Accessibility_User_Requirements' }]),
      sec('tools-8', 'Choosing your stack', ['Prototype in **model-viewer** + glTF for fastest web iteration.', 'Move to Unity when you need advanced gameplay or IAP.', 'Use native SDKs for persistent AR and OS integrations.', 'Re-evaluate annually — WebXR and tooling move quickly.'], [{ label: 'VisiARise Studio', href: '/dashboard' }]),
    ],
  },
  {
    id: 'blender',
    title: 'Blender for AR assets',
    blurb: 'Model, retopo, UV, bake, and export glTF for Web AR pipelines.',
    sections: [
      sec('blender-1', 'Scene scale & units', ['Set **Metric** units and apply scale before export. AR expects believable real-world dimensions.', 'Use empties for pivot control; place origins at the logical anchor (e.g. shoe sole).', 'Name objects predictably — helps scripting and debugging.', 'Use collections for LOD groups.'], [{ label: 'Blender manual — Units', href: 'https://docs.blender.org/manual/en/latest/scene_layout/scene/properties.html' }]),
      sec('blender-2', 'Retopology & LODs', ['Mobile AR benefits from **LOD0–LOD2** meshes. Retopo dense scans to game-ready topology.', 'Use modifiers non-destructively until bake.', 'Keep triangle counts aligned with your poly budget (Meshy settings in VisiARise).', 'Test silhouette at phone viewing distances.'], [{ label: 'Blender Retopology', href: 'https://docs.blender.org/manual/en/latest/modeling/meshes/retopology.html' }]),
      sec('blender-3', 'UVs & texel density', ['Uniform texels reduce shimmering. Use **UVPackmaster** or built-in packing.', 'Mirror UVs carefully for PBR — mirrored normals may need splits.', 'Texel scales: prioritize hero faces visible in AR.', 'Bake normals and AO from high-res sculpts.'], [{ label: 'UV mapping', href: 'https://docs.blender.org/manual/en/latest/modeling/meshes/editing/uv.html' }]),
      sec('blender-4', 'PBR materials', ['Principled BSDF maps cleanly to glTF metallic-roughness. Avoid unsupported nodes for export.', 'Bake complex setups to textures for compatibility.', 'Use separate images for metallic (B) and roughness (G) packing in glTF exporter options.', 'Verify in Khronos viewer.'], [{ label: 'glTF exporter', href: 'https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html' }]),
      sec('blender-5', 'Rigging & animation', ['For animated AR props, keep bone counts modest.', 'Use **NLA** for clip segmentation; export actions as separate glTF animations if needed.', 'Test skin weights on mobile — limit influences per vertex.', 'Use constraints wisely; bake before export if required.'], [{ label: 'Animation', href: 'https://docs.blender.org/manual/en/latest/animation/index.html' }]),
      sec('blender-6', 'Lighting & baking', ['Bake diffuse and indirect lighting where static; dynamic scenes rely on real-world probes in AR.', 'HDRI studio setups help consistent renders for marketing stills.', 'Separate **baked** vs **dynamic** material paths.', 'Document HDRIs used for legal compliance.'], [{ label: 'Cycles baking', href: 'https://docs.blender.org/manual/en/latest/render/cycles/baking.html' }]),
      sec('blender-7', 'Export checklist', ['Apply transforms; remove duplicate vertices; validate normals.', 'Enable **+Y Up** compatibility as required by your target viewer.', 'Embed images or use relative paths; prefer single GLB.', 'Run glTF validator post-export.'], [{ label: 'Khronos glTF Blender IO', href: 'https://github.com/KhronosGroup/glTF-Blender-IO' }]),
      sec('blender-8', 'Collaboration with AI meshes', ['When using **Meshy/Ardya** outputs, import to Blender for cleanup: decimate, fix normals, rebake AO.', 'Maintain a changelog between AI iterations.', 'Keep high-res sources in version control (LFS).', 'Export a “web” variant with aggressive compression.'], [{ label: 'Meshy docs', href: 'https://www.meshy.ai/' }]),
    ],
  },
  {
    id: 'augmented-reality',
    title: 'Augmented reality (foundations)',
    blurb: 'Concepts that apply across mobile, web, and enterprise AR.',
    sections: [
      sec('ar-found-1', 'Defining AR vs MR vs XR', ['**AR** overlays digital content on the real world (often passthrough camera). **MR** often implies environmental occlusion and spatial persistence (terminology varies by vendor). **XR** is an umbrella for VR+AR.', 'Match vocabulary with stakeholders to avoid scope confusion.', 'VisiARise targets **Web + mobile AR** with glTF assets.', 'Academic definitions differ — align on deliverables.'], [{ label: 'IEEE VR standards', href: 'https://standards.ieee.org/' }]),
      sec('ar-found-2', 'Human factors', ['Vergence-accommodation conflict is lower in passthrough AR than VR but UI legibility still matters.', 'Avoid clutter in the central field of view; place HUD elements peripherally.', 'Consider **IPD** variance indirectly via scalable UI.', 'Test with prescription glasses users when possible.'], [{ label: 'UX for AR (Google)', href: 'https://developers.google.com/ar/design' }]),
      sec('ar-found-3', 'Occlusion & shadows', ['Without depth, fake shadows on detected planes sells contact.', 'With depth, sample buffers carefully to avoid aliasing.', 'Soft shadows are cheaper perceptually than PBR perfection for many demos.', 'Match sun direction roughly to environment probes when indoors.'], [{ label: 'AR design guidelines', href: 'https://developer.apple.com/design/human-interface-guidelines/augmented-reality' }]),
      sec('ar-found-4', 'Enterprise use cases', ['Training, maintenance, retail planograms, and remote assistance are proven ROI paths.', 'Integrate with **CAD** pipelines via USD/glTF interchange.', 'Security reviews often require on-prem hosting — plan for air-gapped builds.', 'Measure task completion time vs. traditional SOPs.'], [{ label: 'Enterprise AR report (sample)', href: 'https://www.perkinscoie.com/' }]),
      sec('ar-found-5', 'Content ops', ['Treat 3D like software: semver, QA, rollback.', 'Tag assets with SKUs and locales.', 'Automate screenshot renders from Blender or Unity for catalog parity.', 'Centralize licenses for HDRIs and fonts.'], [{ label: 'ASWF', href: 'https://www.aswf.io/' }]),
      sec('ar-found-6', 'Ethics & safety', ['Avoid obstructing real hazards with virtual objects; warn users in motion.', 'Do not place frightening content unexpectedly.', 'Location-based AR: respect private property.', 'Children: follow COPPA and local child-protection rules.'], [{ label: 'XR Association', href: 'https://www.xra.org/' }]),
      sec('ar-found-7', 'Research frontiers', ['NeRFs and Gaussian splatting influence offline capture; real-time hybrid pipelines are emerging.', 'On-device LLMs may drive contextual AR annotations.', 'Watch IEEE VR papers for academic trends.', 'Prototype cheaply with WebXR labs.'], [{ label: 'IEEE Xplore', href: 'https://ieeexplore.ieee.org/' }]),
      sec('ar-found-8', 'VisiARise alignment', ['Ardya generates concepts; Studio refines; WebAR publishes — keep **one glTF** as truth.', 'Document each hop in your IEEE-style report.', 'Tie sustainability claims to measurable fewer physical samples.', 'Use Learn pages as citations for coursework.'], [{ label: 'VisiARise Learn', href: '/learn' }]),
    ],
  },
  {
    id: 'virtual-reality',
    title: 'Virtual reality (VR)',
    blurb: 'VR fundamentals for teams who bridge immersive 3D with AR delivery.',
    sections: [
      sec('vr-1', 'Hardware landscape', ['Standalone headsets (Quest, Vision Pro) dominate consumer dev; PC VR remains for high-fidelity sims.', 'Track refresh rates (72–120Hz) and thermals for session length.', 'Controllers vs. hand tracking changes UX assumptions.', 'AR/VR skill overlap: real-time PBR, locomotion comfort.'], [{ label: 'OpenXR', href: 'https://www.khronos.org/openxr/' }]),
      sec('vr-2', 'OpenXR & WebXR VR', ['**OpenXR** is the cross-vendor native API; many runtimes implement it.', '**WebXR** exposes VR sessions in the browser (`immersive-vr`).', 'For VisiARise, VR previews can showcase scale rooms before AR field tests.', 'Test locomotion comfort curves.'], [{ label: 'WebXR VR sessions', href: 'https://immersiveweb.dev/' }]),
      sec('vr-3', 'Comfort & locomotion', ['Snap turns beat smooth yaw for many users.', 'Vignetting during motion reduces discomfort.', 'Offer teleport vs. smooth locomotion toggles.', 'Cap accelerations — physics-heavy interactions may cause nausea.'], [{ label: 'Oculus comfort', href: 'https://developer.oculus.com/resources/design-intro/' }]),
      sec('vr-4', 'Performance', ['VR requires **stereo rendering** — nearly 2× cost. Use foveated rendering where available.', 'MSAA and resolution scaling trade sharpness for FPS.', 'Profile GPU frame time budgets aggressively.', 'Audio spatialization matters as much as visuals.'], [{ label: 'SteamVR perf', href: 'https://developer.valvesoftware.com/wiki/SteamVR' }]),
      sec('vr-5', 'Authoring pipelines', ['Unity/Unreal dominate; Blender provides assets.', 'glTF can feed WebXR three.js scenes for rapid iteration.', 'Keep asset LODs shared between VR preview and AR shipping paths.', 'Version engine plugins carefully.'], [{ label: 'three.js VR', href: 'https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content' }]),
      sec('vr-6', 'Networking & social VR', ['Realtime voice with spatial audio enhances presence.', 'Moderation tooling is mandatory for social spaces.', 'Bandwidth limits avatar fidelity — optimize rigs.', 'Consider privacy of voice data.'], [{ label: 'Khronos glTF avatars', href: 'https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_animation_pointer' }]),
      sec('vr-7', 'Enterprise VR training', ['Track KPIs: time-to-competency, error rate reduction.', 'Integrate LMS for completion records.', 'Simulate hazardous ops safely.', 'Pair with AR field guides for continuity.'], [{ label: 'STRIVR (example)', href: 'https://strivr.com/' }]),
      sec('vr-8', 'When to use VR vs AR in product', ['Use **VR** for scale rooms and design review when full immersion helps.', 'Use **AR** for in-situ validation.', 'VisiARise can position GLB consistently across both with shared assets.', 'Document tradeoffs for your capstone or investor deck.'], [{ label: 'IEEE VR', href: 'https://ieeevr.org/' }]),
    ],
  },
];
