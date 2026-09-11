import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, ExternalLink, GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';
import { LEARN_TOPICS } from '../data/learnCurriculum';

export default function LearnPage() {
  const [topicIdx, setTopicIdx] = useState(0);
  const [sectionIdx, setSectionIdx] = useState(0);

  const topic = LEARN_TOPICS[topicIdx];
  const section = topic?.sections[sectionIdx];

  useEffect(() => {
    setSectionIdx(0);
  }, [topicIdx]);

  const progress = useMemo(() => {
    if (!topic) return 0;
    return ((sectionIdx + 1) / topic.sections.length) * 100;
  }, [topic, sectionIdx]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      <Navbar />
      <div className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-[1400px] mx-auto">
        <div className="mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 mb-4">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400/90" />
            VisiARise Learn · Documentation-style
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-white mb-3">
            Real-time tutorials & resources
          </h1>
          <p className="text-white/50 max-w-2xl text-sm sm:text-base leading-relaxed">
            Topic-based tracks with eight in-depth sections each: concepts, tooling, links to official docs, and
            practical notes aligned with WebAR and VisiARise. Bookmark this page for coursework and capstone citations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0\\,1fr)] gap-8 lg:gap-12">
          <aside className="space-y-2 lg:sticky lg:top-28 self-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 mb-2">Topics</p>
            {LEARN_TOPICS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopicIdx(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  i === topicIdx
                    ? 'bg-white/[0.08] border-white/20 text-white shadow-lg shadow-black/40'
                    : 'bg-white/[0.02] border-white/[0.06] text-white/55 hover:border-white/15 hover:text-white/85'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <BookOpen className="w-4 h-4 shrink-0 opacity-70" />
                  {t.title}
                </span>
                <span className="block text-[11px] text-white/35 mt-1 line-clamp-2">{t.blurb}</span>
              </button>
            ))}
            <div className="pt-6 px-2 border-t border-white/[0.06] mt-4">
              <Link
                to="/community"
                className="text-xs text-emerald-400/90 hover:underline inline-flex items-center gap-1"
              >
                Community hub
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            {topic && section ? (
              <>
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] overflow-hidden mb-6">
                  <div className="h-1 bg-white/[0.06]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500/80 to-teal-400/80 transition-[width] duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="p-5 sm:p-8 border-b border-white/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 mb-2">
                      {topic.title} · Section {sectionIdx + 1} / {topic.sections.length}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
                      {section.title}
                    </h2>
                    <p className="text-sm text-white/45 mt-3 max-w-3xl">{topic.blurb}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {topic.sections.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSectionIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                        i === sectionIdx
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.04] border-white/10 text-white/45 hover:border-white/25'
                      }`}
                    >
                      {i + 1}. {s.title.length > 32 ? `${s.title.slice(0, 30)}…` : s.title}
                    </button>
                  ))}
                </div>

                <article className="prose prose-invert prose-sm sm:prose-base max-w-none">
                  <div className="space-y-5 text-white/78 leading-relaxed text-[15px] sm:text-base">
                    {section.paragraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {p.split('**').map((chunk, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="text-white/95 font-semibold">
                              {chunk}
                            </strong>
                          ) : (
                            <span key={j}>{chunk}</span>
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </article>

                <div className="mt-10 p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Official & further reading</h3>
                  <ul className="space-y-2">
                    {section.resources.map((r) => (
                      <li key={r.href}>
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-emerald-400/95 hover:text-emerald-300 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap justify-between gap-4 mt-10 pt-8 border-t border-white/[0.06]">
                  <button
                    type="button"
                    disabled={sectionIdx <= 0}
                    onClick={() => setSectionIdx((s) => Math.max(0, s - 1))}
                    className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/5 disabled:opacity-30"
                  >
                    ← Previous section
                  </button>
                  <button
                    type="button"
                    disabled={sectionIdx >= topic.sections.length - 1}
                    onClick={() => setSectionIdx((s) => Math.min(topic.sections.length - 1, s + 1))}
                    className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30"
                  >
                    Next section →
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
