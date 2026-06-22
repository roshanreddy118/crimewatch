'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timeline } from '@/components/Timeline';
import { CrimeCase, CaseUpdate } from '@/types';
import { formatDistanceToNow, format, differenceInHours } from 'date-fns';
import Link from 'next/link';

/** Strip HTML tags from stored text (handles any dirty data already in DB) */
function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

interface StoryData extends CrimeCase { updates?: CaseUpdate[]; }

const statusConfig: Record<string, { label: string; cls: string; description: string }> = {
  breaking: { label: 'Breaking', cls: 'badge-breaking', description: 'This story just broke — arrests, raids, or charges were recently reported.'    },
  ongoing:  { label: 'Ongoing',  cls: 'badge-ongoing',  description: 'Trial, investigation, or proceedings are actively in progress.'                 },
  resolved: { label: 'Resolved', cls: 'badge-resolved', description: 'This story has reached a conclusion — verdict, acquittal, or settlement.'       },
};

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', marginBottom: '0.2rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--fg)', fontWeight: 500 }}>{value || '—'}</p>
    </div>
  );
}

export default function StoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [story, setStory]         = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    params.then
      ? params.then(({ id }: { id: string }) => fetchStory(id))          // Next 15
      : fetchStory((params as unknown as { id: string }).id);             // Next 14
  }, []);

  const fetchStory = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (!res.ok) throw new Error('Story not found');
      const data = await res.json();
      setStory(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Loading skeleton ── */
  if (isLoading) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div className="skeleton" style={{ height: 16, width: 130, marginBottom: '2rem', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 32, width: '70%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: '2rem' }} />
      <div className="card" style={{ padding: '1.5rem' }}>
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 14, width: `${w}%`, marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );

  /* ── Error ── */
  if (error || !story) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <BackLink />
      <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}>
        <p style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem' }}>{error || 'Story not found'}</p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>← Back to feed</button>
      </div>
    </div>
  );

  const cfg = statusConfig[story.status] ?? statusConfig.unknown;
  const isRecent = differenceInHours(new Date(), new Date(story.publishedAt)) < 48;
  const updateCount = story.updates?.length ?? 0;
  const keyPeople = [story.parties?.defendant, story.parties?.plaintiff, story.parties?.prosecutor].filter(Boolean);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>

      <BackLink />

      {/* ── Story header ── */}
      <div style={{ marginBottom: '1.5rem' }}>

        {/* Source + status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-subtle)' }}>
            {story.sourcesFeed}
          </span>
          <span style={{ color: 'var(--fg-subtle)', fontSize: '0.75rem' }}>·</span>
          {isRecent && <span className="badge-new">Updated today</span>}
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.35, marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
          {story.title}
        </h1>

        {/* Status description + timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', margin: 0 }}>{cfg.description}</p>
          <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)' }}>
              Published <strong style={{ color: 'var(--fg-muted)' }}>{format(new Date(story.publishedAt), 'MMM d, yyyy')}</strong>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)' }}>
              Updated <strong style={{ color: updateCount > 0 ? 'var(--accent)' : 'var(--fg-muted)' }}>
                {formatDistanceToNow(new Date(story.updatedAt), { addSuffix: true })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Latest summary ── */}
      {story.description && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem', borderLeft: '3px solid var(--accent)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '0.5rem' }}>
            Latest summary
          </p>
          <p style={{ fontSize: '0.95rem', color: 'var(--fg)', lineHeight: 1.7, margin: 0 }}>
            {clean(story.description)}
          </p>
        </div>
      )}

      {/* ── Story metadata ── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: keyPeople.length > 0 || (story.charges && story.charges.length > 0) ? '1rem' : 0 }}>
          <MetaItem label="Category" value={story.caseType} />
          <MetaItem label="Published" value={format(new Date(story.publishedAt), 'MMM d, yyyy')} />
          <MetaItem label="News updates" value={`${updateCount} update${updateCount !== 1 ? 's' : ''}`} />
          {story.sourceUrl && (
            <MetaItem label="Original article" value={
              <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                Read source ↗
              </a>
            } />
          )}
        </div>

        {/* Key people */}
        {keyPeople.length > 0 && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', marginBottom: '0.65rem' }}>
              Key people
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {story.parties?.defendant && (
                <div style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Defendant</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--fg)' }}>{story.parties.defendant}</span>
                </div>
              )}
              {story.parties?.plaintiff && (
                <div style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plaintiff</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--fg)' }}>{story.parties.plaintiff}</span>
                </div>
              )}
              {story.parties?.prosecutor && (
                <div style={{ padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prosecutor</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--fg)' }}>{story.parties.prosecutor}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Charges → rephrased as allegations / context */}
        {story.charges && story.charges.length > 0 && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)', marginBottom: '0.65rem' }}>
              Allegations / charges ({story.charges.length})
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {story.charges.map((c, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--fg)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" style={{ marginTop: 3, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── News timeline ── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
            News timeline
          </h2>
          {updateCount > 0 && (
            <span className="update-pill">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {updateCount} update{updateCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Timeline updates={story.updates || []} />
      </div>

    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--fg-muted)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 500 }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      Back to feed
    </Link>
  );
}
