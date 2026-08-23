'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  LayoutDashboard,
  Sparkles,
  MapPin,
  BarChart2,
  Bot,
  User,
  LogOut,
  Menu,
  X,
  Target,
  Layers
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recommendations', label: 'Explore Careers', icon: Compass },
  { href: '/roadmap', label: 'My Roadmap', icon: MapPin },
  { href: '/learning-path', label: 'Learning Path', icon: Layers },
  { href: '/skill-gap', label: 'Skill Gap', icon: Target },
  { href: '/progress', label: 'Progress', icon: BarChart2 },
  { href: '/assistant', label: 'AI Assistant', icon: Bot },
  { href: '/profile', label: 'Profile', icon: User }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, refreshAuth } = useAuth();
  const userInitials = getInitials(user?.name);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const handleLogout = async () => {
    await api.logout();
    await refreshAuth();
    router.push('/login');
  };


  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <Compass className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">PATHFINDER</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              Career Command Center
              <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                AI Active
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/assistant">
              <Button size="sm" variant="ai" className="gap-1.5 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" /> CareerPath AI
              </Button>
            </Link>
            <Link href="/profile" title={user?.name || 'User Profile'} className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white border border-indigo-700 flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
                {userInitials}
              </div>
              <span className="hidden md:inline-block text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                {user?.name || 'Profile'}
              </span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1 animate-in slide-in-from-top-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4 text-indigo-600" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
