'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Sparkles, ArrowRight, CheckCircle2, Play, Compass, Flame, Target, AlertCircle, Zap, Radio } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MatchScore } from '@/components/ui/match-score';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

export default function DashboardPage() {
  const { user: authUser, profile: authProfile } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardData(),
    refetchOnWindowFocus: true,
  });

  // Real-time Socket.IO Live Synchronization
  useEffect(() => {
    if (!socket) return;

    const handleLiveProgressUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setLiveNotification('⚡ Dashboard updated in real time!');
      setTimeout(() => setLiveNotification(null), 4000);
    };

    socket.on('progress:updated', handleLiveProgressUpdate);
    socket.on('progress:summary-updated', handleLiveProgressUpdate);
    socket.on('progress:milestone-completed', handleLiveProgressUpdate);
    socket.on('progress:skill-acquired', handleLiveProgressUpdate);

    return () => {
      socket.off('progress:updated', handleLiveProgressUpdate);
      socket.off('progress:summary-updated', handleLiveProgressUpdate);
      socket.off('progress:milestone-completed', handleLiveProgressUpdate);
      socket.off('progress:skill-acquired', handleLiveProgressUpdate);
    };
  }, [socket, queryClient]);

  if (isLoading || !dashboard) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  // Defensive normalization — handle any backend response shape variation & sync with live profile
  const safeDashboard = {
    user: {
      name: authUser?.name || dashboard.user?.name || 'Learner',
      email: authUser?.email || dashboard.user?.email || ''
    },
    activeGoal: {
      title: authProfile?.targetCareerGoal || (authProfile as any)?.targetCareer || dashboard.activeGoal?.title || 'Target Career',
      matchScore: dashboard.activeGoal?.matchScore ?? 0,
      estimatedMonths: dashboard.activeGoal?.estimatedMonths ?? 6
    },

    currentProgress: {
      overallCompletionPercent: dashboard.currentProgress?.overallCompletionPercent ?? dashboard.progress?.overallPercentage ?? (dashboard.roadmap as any)?.overallCompletionPercent ?? 0,
      completedMilestones: dashboard.currentProgress?.completedMilestones ?? dashboard.progress?.completedMilestones ?? 0,
      totalMilestones: dashboard.currentProgress?.totalMilestones ?? dashboard.progress?.totalMilestones ?? 0,
      streakDays: dashboard.currentProgress?.streakDays ?? dashboard.progress?.currentStreakDays ?? 0
    },
    currentPhase: {
      phaseNumber: dashboard.currentPhase?.phaseNumber ?? 1,
      title: dashboard.currentPhase?.title || 'Getting Started',
      progressPercent: dashboard.currentPhase?.progressPercent ?? 0
    },
    nextAction: {
      title: dashboard.nextAction?.title || 'Continue your roadmap',
      phaseTitle: dashboard.nextAction?.phaseTitle || '',
      estimatedMinutes: dashboard.nextAction?.estimatedMinutes ?? 30,
      resourceType: dashboard.nextAction?.resourceType || 'Resource'
    },
    skillGapSummary: {
      strong: dashboard.skillGapSummary?.strong ?? dashboard.skillGap?.summary?.strongCount ?? (Array.isArray(dashboard.skillGap?.details) ? dashboard.skillGap.details.filter((d: any) => d.category === 'strong').length : 0),
      needsWork: dashboard.skillGapSummary?.needsWork ?? dashboard.skillGap?.summary?.needsWorkCount ?? (Array.isArray(dashboard.skillGap?.details) ? dashboard.skillGap.details.filter((d: any) => d.category === 'needsWork').length : 0),
      missing: dashboard.skillGapSummary?.missing ?? dashboard.skillGap?.summary?.missingCount ?? (Array.isArray(dashboard.skillGap?.details) ? dashboard.skillGap.details.filter((d: any) => d.category === 'missing').length : 0)
    },
    recommendedResources: Array.isArray(dashboard.recommendedResources) ? dashboard.recommendedResources : []
  };

  const totalSkillsCount = Math.max(
    1,
    safeDashboard.skillGapSummary.strong +
      safeDashboard.skillGapSummary.needsWork +
      safeDashboard.skillGapSummary.missing
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Good evening, {safeDashboard.user.name.split(' ')[0]} 👋
              </h1>
              {isConnected && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Sync Active</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              You're on track to become an <strong className="text-indigo-600">{safeDashboard.activeGoal.title}</strong>.
            </p>
          </div>
          <Link href="/roadmap">
            <Button variant="ai" size="md" className="gap-2 font-bold shadow-glow-indigo">
              Continue Roadmap <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Real-time Live Notification Banner */}
        {liveNotification && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-extrabold flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{liveNotification}</span>
            </div>
            <button onClick={() => setLiveNotification(null)} className="opacity-70 hover:opacity-100 px-2 py-0.5 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Goal */}
          <Card className="p-5 flex items-center gap-4 bg-white border-slate-200">
            <MatchScore score={safeDashboard.activeGoal.matchScore} size="sm" showLabel={false} />
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Career Goal</p>
              <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{safeDashboard.activeGoal.title}</h3>
              <p className="text-[11px] text-emerald-600 font-bold">{safeDashboard.activeGoal.matchScore}% AI Fit</p>
            </div>
          </Card>

          {/* Overall Progress */}
          <Card className="p-5 flex items-center gap-4 bg-white border-slate-200">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Overall Progress</p>
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 mt-0.5">
                <span>{safeDashboard.currentProgress.overallCompletionPercent}%</span>
                {safeDashboard.currentProgress.totalMilestones > 0 && (
                  <span className="text-[11px] font-bold text-slate-500">
                    {safeDashboard.currentProgress.completedMilestones}/{safeDashboard.currentProgress.totalMilestones}
                  </span>
                )}
              </div>
              <Progress value={safeDashboard.currentProgress.overallCompletionPercent} size="sm" className="mt-1" />
            </div>
          </Card>

          {/* Current Streak */}
          <Card className="p-5 flex items-center gap-4 bg-white border-slate-200">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Streak</p>
              <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{safeDashboard.currentProgress.streakDays} Days</h3>
              <p className="text-[11px] text-amber-600 font-bold">Daily practice active</p>
            </div>
          </Card>
        </div>

        {/* Immediate Next Action Banner */}
        <Card className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border-none relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-800/80 px-3 py-1 text-xs font-bold text-indigo-200">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Next Immediate Action</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{safeDashboard.nextAction.title}</h2>
              <p className="text-xs text-indigo-200">
                {safeDashboard.nextAction.phaseTitle} • Estimated: {safeDashboard.nextAction.estimatedMinutes} mins ({safeDashboard.nextAction.resourceType})
              </p>
            </div>
            <Link href="/roadmap">
              <Button variant="secondary" size="lg" className="font-bold gap-2 text-slate-900 shadow-md">
                <Play className="h-4 w-4 fill-current" /> Complete Task
              </Button>
            </Link>
          </div>
        </Card>

        {/* Main Grid: Recommended Resources & Skill Gap Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recommended Resources (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Recommended For You</h3>
              <Link href="/roadmap" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {safeDashboard.recommendedResources.map((res) => (
                <Card key={res.id} className="p-5 space-y-3 hover:border-indigo-300 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <Badge variant={res.type === 'Course' ? 'primary' : res.type === 'Project' ? 'success' : 'info'}>
                      {res.type}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-semibold">{res.duration}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{res.title}</h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-indigo-600 font-semibold">{res.tag}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Skill Gap Status (1 col) */}
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Skill Gap Overview</h3>
            <Card className="p-6 space-y-4 bg-white border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Strong Skills
                  </span>
                  <span>{safeDashboard.skillGapSummary.strong} Competencies</span>
                </div>
                <Progress value={(safeDashboard.skillGapSummary.strong / totalSkillsCount) * 100} barColor="bg-emerald-500" size="sm" />

                <div className="flex items-center justify-between text-xs font-bold pt-2">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-500" /> Needs Improvement
                  </span>
                  <span>{safeDashboard.skillGapSummary.needsWork} Skills</span>
                </div>
                <Progress value={(safeDashboard.skillGapSummary.needsWork / totalSkillsCount) * 100} barColor="bg-amber-500" size="sm" />

                <div className="flex items-center justify-between text-xs font-bold pt-2">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-slate-400" /> Missing Competencies
                  </span>
                  <span>{safeDashboard.skillGapSummary.missing} Skills</span>
                </div>
                <Progress value={(safeDashboard.skillGapSummary.missing / totalSkillsCount) * 100} barColor="bg-slate-300" size="sm" />
              </div>

              <div className="pt-2">
                <Link href={`/skill-gap?targetCareer=${encodeURIComponent(safeDashboard.activeGoal.title)}`}>
                  <Button variant="primary" size="sm" className="w-full text-xs font-bold gap-1.5 shadow-2xs">
                    Explore Skill Gap Details <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
