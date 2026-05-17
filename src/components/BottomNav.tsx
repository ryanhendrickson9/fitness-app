'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  const isTrack = pathname === '/' || pathname.startsWith('/session');

  return (
    <nav
      className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-surface border-t border-surface-container-highest z-50"
      style={{ boxShadow: '0px -10px 30px rgba(99,102,241,0.05)' }}
    >
      <Link
        href="/"
        className={`flex flex-col items-center justify-center rounded-xl p-2 px-4 transition-colors ${
          isTrack ? 'text-primary font-bold' : 'text-on-surface-variant'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: isTrack ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}
        >
          fitness_center
        </span>
        <span className="text-label-sm">Track</span>
      </Link>
      <Link
        href="/history"
        className={`flex flex-col items-center justify-center rounded-xl p-2 px-4 transition-colors ${
          pathname === '/history' ? 'text-primary font-bold' : 'text-on-surface-variant'
        }`}
      >
        <span className="material-symbols-outlined">history</span>
        <span className="text-label-sm">History</span>
      </Link>
    </nav>
  );
}
