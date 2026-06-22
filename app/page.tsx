'use client';

import { useState, useEffect } from 'react';
import { CaseCard } from '@/components/CaseCard';
import { SearchFilter } from '@/components/SearchFilter';
import { CrimeCase } from '@/types';

function StatCard({ label, value, color, icon, sub }: {
  label: string; value: number; color: string; icon: React.ReactNode; sub?: string;
}) {
  return (
    <div className="stat-card" style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>
          {label}
        </span>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </span>
      </div>
      <p style={{ fontSize: '1.9rem', fontWeight: 800, color, lineHeight: 1, marginBottom: sub ? '0.3rem' : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="skeleton" style={{ height: 18, width: '65%' }} />
        <div className="skeleton" style={{ height: 18, width: 72, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ height: 13, width: '90%', marginBottom: 5 }} />
      <div className="skeleton" style={{ height: 13, width: '75%', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton" style={{ height: 20, width: 68, borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 20, width: 80, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [stories, setStories] = useState<CrimeCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async (query = '', filters?: { status?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (filters?.status) params.append('status', filters.status);
      const res = await fetch(`/api/cases?${params}`);
      if (!res.ok) throw new Error('Failed to load stories');
      const data = await res.json();
      setStories(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const counts = {
    total:    stories.length,
    breaking: stories.filter(s => s.status === 'breaking').length,
    ongoing:  stories.filter(s => s.status === 'ongoing').length,
    resolved: stories.filter(s => s.status === 'resolved').length,
  };

  // Sort: breaking first, then ongoing, then resolved
  const statusOrder = { breaking: 0, ongoing: 1, resolved: 2 };
  const sorted = [...stories].sort((a, b) =>
    (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.03em', margin: 0 }}>
            News Feed
          </h1>
          {counts.developing > 0 && (
            <span className="badge-new">{counts.developing} live</span>
          )}
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', margin: 0 }}>
          Follow breaking legal stories from first report to resolution — all in one place.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Following" value={counts.total} color="#3b82f6" sub="stories tracked"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>}
        />
        <StatCard label="Breaking" value={counts.breaking} color="#ef4444" sub="just happened"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
        />
        <StatCard label="Ongoing" value={counts.ongoing} color="#f59e0b" sub="trial / investigation"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard label="Resolved" value={counts.resolved} color="#22c55e" sub="verdict or closure reached"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
      </div>

      {/* ── Search & filters ── */}
      <SearchFilter onSearch={(q, f) => fetchStories(q, f)} isLoading={isLoading} />

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
            fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.15rem', fontSize: '0.9rem' }}>{error}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              Check your database connection and make sure the RSS feeds have been initialised.
            </p>
            <button className="btn btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.3rem 0.85rem' }}
              onClick={() => fetchStories()}>
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Results count ── */}
      {!isLoading && !error && stories.length > 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--fg-subtle)', marginBottom: '1rem' }}>
          {stories.length} stor{stories.length !== 1 ? 'ies' : 'y'} — sorted by activity
        </p>
      )}

      {/* ── Skeleton loading ── */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Stories grid ── */}
      {!isLoading && sorted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {sorted.map(s => <CaseCard key={s.id} caseData={s} />)}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && stories.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'var(--surface)', border: '1px dashed var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent-soft)', margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
            </svg>
          </div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--fg)', fontSize: '1rem' }}>No stories yet</h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', maxWidth: 340, margin: '0 auto 1.25rem' }}>
            Once your RSS feeds are set up and the aggregator runs, stories will appear here and update automatically as new articles come in.
          </p>
          <button className="btn btn-primary" onClick={() => fetchStories()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            Refresh feed
          </button>
        </div>
      )}

    </div>
  );
}
