import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeToggle } from '@/components/ThemeToggle';

const inter = Inter({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CrimeWatch — Legal News Tracker',
  description: 'Follow breaking legal news and track each story from first report to resolution',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try{
              var t=localStorage.getItem('theme');
              var d=document.documentElement;
              if(t==='dark'){d.classList.add('dark');d.style.colorScheme='dark';}
              else{d.classList.add('light');d.style.colorScheme='light';}
            }catch(e){}
          })();
        `}} />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Navbar ── */}
        <nav className="navbar">
          <div style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                  <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
                </svg>
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                  CrimeWatch
                </span>
                <span style={{
                  display: 'inline-block', marginLeft: 6,
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--accent)',
                  background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4,
                }}>
                  News
                </span>
              </div>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center' }}>
              <a href="/" className="nav-link">Feed</a>
              <a href="/" className="nav-link">Following</a>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        {/* ── Page content ── */}
        <main style={{ flex: 1 }}>{children}</main>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '1.25rem 1.5rem',
          marginTop: 'auto',
        }}>
          <div style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>
              © {new Date().getFullYear()} CrimeWatch — Legal news tracker
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>
              Stories aggregated from public legal RSS feeds
            </span>
          </div>
        </footer>

      </body>
    </html>
  );
}
