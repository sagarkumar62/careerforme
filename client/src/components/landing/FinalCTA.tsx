'use client';

import Link from 'next/link';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export function FinalCTA() {
  const { user } = useAuth();
  const onboardingHref = user ? '/onboarding' : '/register';

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-800/60 px-3.5 py-1.5 text-xs font-semibold text-indigo-200 border border-indigo-700/60">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Start Your Career Journey Today</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Ready to discover your ideal career path?
        </h2>

        <p className="text-indigo-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Join thousands of learners using AI to bridge skill gaps, build personalized roadmaps, and achieve their career goals faster.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={onboardingHref}>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base font-bold px-8 py-3.5">
              Find My Career Path <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold px-7 py-3.5 text-white border-indigo-700 bg-indigo-900/40 hover:bg-indigo-900/80">
              Create Free Account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
