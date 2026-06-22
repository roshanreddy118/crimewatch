'use client';

import { useState } from 'react';

interface SearchFilterProps {
  onSearch: (query: string, filters: { status?: string }) => void;
  isLoading?: boolean;
}

const STATUSES: { value: string; label: string }[] = [
  { value: 'breaking', label: 'Breaking — just happened' },
  { value: 'ongoing',  label: 'Ongoing — trial / investigation in progress' },
  { value: 'resolved', label: 'Resolved — verdict or closure reached' },
];

export function SearchFilter({ onSearch, isLoading }: SearchFilterProps) {
  const [query, setQuery]   = useState('');
  const [status, setStatus] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, { status: status || undefined });
  };

  const reset = () => {
    setQuery(''); setStatus('');
    onSearch('', {});
  };

  const hasFilters = query || status;

  return (
    <form onSubmit={submit} style={{ marginBottom: '1.25rem' }}>
      <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}>

          {/* Keyword search */}
          <div>
            <label htmlFor="q" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Search stories
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none', display: 'flex' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input id="q" type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Person, location, topic…" className="input" style={{ paddingLeft: '2rem' }} />
            </div>
          </div>

          {/* Story status */}
          <div>
            <label htmlFor="status" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Story status
            </label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)}
              className="input input-select">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ flex: 1 }}>
              {isLoading
                ? <><span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Searching…</>
                : <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search
                  </>
              }
            </button>
            {hasFilters && (
              <button type="button" onClick={reset} className="btn btn-ghost" title="Clear filters">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
