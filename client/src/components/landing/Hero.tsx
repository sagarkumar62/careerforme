'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle2, Zap, Brain, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MatchScore } from '@/components/ui/match-score';
import { useAuth } from '@/context/AuthContext';

export function Hero() {
  const { user } = useAuth();
  const onboardingHref = user ? '/onboarding' : '/register';

  return (
    <section className="relative overflow-hidden bg-grid-pattern pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            <span>Your Personal AI Career Navigator</span>
            <span className="h-1 w-1 rounded-full bg-indigo-400" />
            <span className="text-slate-500 font-normal">Next-Gen SaaS</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Find the career path that's <span className="gradient-text">built for you</span>.
          </h1>

          {/* Supporting Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            AI-powered career discovery and personalized learning roadmaps based on your skills, interests, goals, and weekly progress.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href={onboardingHref}>
              <Button size="lg" variant="ai" className="w-full sm:w-auto shadow-glow-indigo text-base font-semibold px-8 py-3.5">
                Find My Career Path <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/recommendations">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold px-7 py-3.5">
                Explore Careers
              </Button>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex items-center justify-center gap-6 pt-3 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><Brain className="h-4 w-4 text-indigo-600" /> Adaptive AI Analysis</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-emerald-600" /> Real-time Skill Gap Engine</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-indigo-600" /> Zero Guesswork</span>
          </div>
        </div>

        {/* Hero Interactive Card Preview */}
        <div className="mt-14 max-w-5xl mx-auto">
          <Card className="p-6 sm:p-8 bg-white/95 backdrop-blur-xl border-slate-200/90 shadow-xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10" />

            {/* Top Bar Preview Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <MatchScore score={87} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xl text-slate-900">AI Engineer Path</h3>
                    <Badge variant="success">87% Alignment</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Recommended based on React, Node.js & Machine Learning interest</p>
                </div>
              </div>
              <Badge variant="ai" className="gap-1 py-1.5 px-3">
                <Sparkles className="h-3.5 w-3.5" /> Adaptive Roadmap Ready
              </Badge>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Box 1: Why it matches */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Why It Matches</h4>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Strong JavaScript & React foundation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Existing backend API knowledge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Matches 12 hrs/week goal</span>
                  </li>
                </ul>
              </div>

              {/* Box 2: Skill Gaps */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Skill Gaps</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="warning">Python (Advanced)</Badge>
                  <Badge variant="warning">Applied Statistics</Badge>
                  <Badge variant="info">PyTorch</Badge>
                  <Badge variant="info">Vector DBs & RAG</Badge>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">3 missing skills targeted in your roadmap</p>
              </div>

              {/* Box 3: Roadmap Progress */}
              <div className="space-y-3 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Roadmap Preview</h4>
                  <span className="text-xs font-bold text-indigo-600">Phase 2 of 5</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-700 font-semibold">
                    <span>Math & Statistics for AI</span>
                    <span className="text-emerald-600">75% Complete</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[75%] rounded-full" />
                  </div>
                  <p className="text-[11px] text-slate-600 pt-1 font-medium">Next Action: Linear Regression Basics</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
