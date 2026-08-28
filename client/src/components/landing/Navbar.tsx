'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user } = useAuth();
  const onboardingHref = user ? '/onboarding' : '/register';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <Logo href="/" size="md" />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</Link>
          <Link href="#career-discovery" className="hover:text-indigo-600 transition-colors">Career Discovery</Link>
          <Link href="#skill-gap" className="hover:text-indigo-600 transition-colors">Skill Gap AI</Link>
          <Link href="#roadmap" className="hover:text-indigo-600 transition-colors">Roadmaps</Link>
          <Link href="#assistant" className="hover:text-indigo-600 transition-colors">AI Mentor</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href={onboardingHref}>
            <Button variant="primary" size="sm" className="gap-1.5">
              Find My Path <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

