'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-emerald-400">Semantic Movie Discovery</span>
            <span className="text-xs uppercase tracking-wider text-slate-400">System</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link
              href="/"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              Search
            </Link>
            <Link
              href="/movies"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/movies') || pathname.startsWith('/movies/')
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              All Movies
            </Link>
            <Link
              href="/find-similar"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/find-similar')
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              Find Similar
            </Link>
            <Link
              href="/admin"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/admin')
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

