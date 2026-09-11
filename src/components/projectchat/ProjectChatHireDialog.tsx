import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Users, Search, Mail, ExternalLink } from 'lucide-react';
import type { Freelancer, Project } from '../../store/useAppStore';

type Props = {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string;
  freelancers: Freelancer[];
};

export function ProjectChatHireDialog({
  open,
  onClose,
  projects,
  currentProjectId,
  freelancers,
}: Props) {
  const [q, setQ] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);

  useEffect(() => {
    if (open) setSelectedProjectId(currentProjectId);
  }, [open, currentProjectId]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return freelancers.filter(
      (f) =>
        f.name.toLowerCase().includes(s) ||
        f.skills.some((k) => k.toLowerCase().includes(s))
    );
  }, [freelancers, q]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!open) return null;

  const mailtoHire = () => {
    const sub = encodeURIComponent('VisiARise — 3D / AR design request');
    const body = encodeURIComponent(
      `Hi,\n\nI’m using ARdya LLM and want help with a model.\n\nProject: ${selectedProject?.name || '—'} (id: ${selectedProjectId})\n\nPlease reply with availability and next steps.\n`
    );
    window.open(`mailto:hello@visiarise.com?subject=${sub}&body=${body}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d12] p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-brand-primary mb-1">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Hire help</span>
            </div>
            <h2 className="text-lg font-bold">3D designers · stay in your flow</h2>
            <p className="text-[11px] text-white/45 mt-1">
              Search profiles, pick which project this is for, then email us — you&apos;ll return to this chat when you
              close.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4 shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/35">Project context</label>
          <select
            value={projects.some((p) => p.id === selectedProjectId) ? selectedProjectId : currentProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
          >
            {projects.length === 0 ? (
              <option value={currentProjectId}>Current project</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Untitled'}
                </option>
              ))
            )}
          </select>
          <p className="text-[10px] text-white/35">
            Selling or polishing this asset? Mention it in the email — we&apos;ll tie it to this project name.
          </p>
        </div>

        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search skills or name…"
            className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-4">
          {filtered.length === 0 ? (
            <p className="text-xs text-white/40 py-4 text-center">No matches — try another keyword.</p>
          ) : (
            filtered.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="text-[10px] text-white/40">{f.skills.join(' · ')}</p>
                  <p className="text-[10px] text-brand-primary/90 mt-0.5">${f.hourlyRate}/hr</p>
                </div>
                <button
                  type="button"
                  onClick={mailtoHire}
                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-brand-primary/15 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/25"
                >
                  Request
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={mailtoHire}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-black text-xs font-bold uppercase tracking-widest"
          >
            <Mail className="w-4 h-4" />
            Email VisiARise
          </button>
          <Link
            to="/freelancers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-xs font-bold uppercase tracking-widest text-white/80 hover:bg-white/5"
          >
            <ExternalLink className="w-4 h-4" />
            Full directory
          </Link>
        </div>
      </div>
    </div>
  );
}
