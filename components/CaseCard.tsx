'use client';

import Link from 'next/link';
import { CrimeCase } from '@/types';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';

function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

interface CaseCardProps { caseData: CrimeCase; }

const statusConfig: Record<string, { label: string; cls: string; }> = {
  breaking: { label: 'Breaking',  cls: 'badge-breaking' },
  ongoing:  { label: 'Ongoing',   cls: 'badge-ongoing'  },
  resolved: { label: 'Resolved',  cls: 'badge-resolved' },
};

export function CaseCard({ caseData }: CaseCardProps) {
  const cfg = statusConfig[caseData.status] ?? statusConfig.unknown;

  // "New" badge: published within last 48h
  const isRecent = differenceInHours(new Date(), new Date(caseData.publishedAt)) < 48;

  // Only show "Updated" if updatedAt is meaningfully later than publishedAt
  // (i.e. a real timeline update was added, not just the initial ingestion)
  const hasRealUpdate = differenceInHours(
    new Date(caseData.updatedAt),
    new Date(caseData.publishedAt)
  ) > 1;

  return (
    <Link href={`/cases/${caseData.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <article className="card card-hover" style={{ padding: '1.1rem 1.25rem', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top: source + status ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {caseData.sourcesFeed || 'Unknown source'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            {isRecent && <span className="badge-new">New</span>}
            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
          </div>
        </div>

        {/* ── Headline ── */}
        <h3 style={{
          fontSize: '0.93rem', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.45,
          marginBottom: '0.5rem', flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {caseData.title}
        </h3>

        {/* ── Summary snippet ── */}
        {caseData.description && (
          <p style={{
            fontSize: '0.81rem', color: 'var(--fg-muted)', lineHeight: 1.55, marginBottom: '0.85rem',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {clean(caseData.description)}
          </p>
        )}

        {/* ── Tags ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
          {caseData.caseType && (
            <span className="chip chip-blue">{caseData.caseType}</span>
          )}
        </div>

        {/* ── Footer: published date + updated date ── */}
        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: '0.65rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
          marginTop: 'auto',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>
            {format(new Date(caseData.publishedAt), 'MMM d, yyyy')}
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: hasRealUpdate ? 'var(--accent)' : 'var(--fg-subtle)',
            fontWeight: hasRealUpdate ? 600 : 400,
          }}>
            {hasRealUpdate
              ? `Updated ${formatDistanceToNow(new Date(caseData.updatedAt), { addSuffix: true })}`
              : formatDistanceToNow(new Date(caseData.publishedAt), { addSuffix: true })
            }
          </span>
        </div>

      </article>
    </Link>
  );
}
