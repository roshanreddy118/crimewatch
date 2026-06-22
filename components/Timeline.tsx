'use client';

import { CaseUpdate } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';

function clean(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

interface TimelineProps { updates: CaseUpdate[]; }

export function Timeline({ updates }: TimelineProps) {
  if (updates.length === 0) {
    return (
      <div style={{
        padding: '2rem 1.5rem',
        background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-strong)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--fg)', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              No updates yet
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', lineHeight: 1.6, margin: 0 }}>
              When new articles from any RSS feed are identified as related to this story,
              they automatically appear here in chronological order — building a complete
              thread from the first report through to resolution.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {updates.map((update, i) => (
        <div key={update.id} style={{ display: 'flex', gap: '1rem' }}>

          {/* ── Rail ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 12 }}>
            <div className="timeline-dot" />
            {i < updates.length - 1 && <div className="timeline-line" />}
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, paddingBottom: i < updates.length - 1 ? '1.25rem' : 0 }}>
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem',
            }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--fg)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                {clean(update.updateText)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)', fontWeight: 500 }}>
                  {format(new Date(update.updateDate || update.createdAt), 'MMM dd, yyyy')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>·</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>
                  {formatDistanceToNow(new Date(update.updateDate || update.createdAt), { addSuffix: true })}
                </span>
                {update.sourceUrl && (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>·</span>
                    <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                      Source ↗
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
