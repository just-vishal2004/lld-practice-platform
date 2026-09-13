import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'LLD Practice Platform',
  description: 'Practice Low-Level Design problems and get explainable feedback.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="top-nav">
          <div className="top-nav-inner">
            <Link href="/problems" className="brand">
              <span className="brand-mark">▦</span> LLD Practice
            </Link>
            <div className="nav-links">
              <Link href="/problems">Problems</Link>
              <Link href="/history">History</Link>
            </div>
          </div>
        </nav>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
