'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock, CheckCircle2, Trophy, BarChart2, Activity, MapPin, Layers } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { Roadmap } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function ProgressPage() {
  const { profile: authProfile } = useAuth();
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | undefined>(undefined);

  // Fetch list of roadmaps for selection
  const { data: roadmaps = [] } = useQuery<Roadmap[]>({
    queryKey: ['roadmaps'],
    queryFn: () => api.getRoadmaps(),
  });

  const activeId = selectedRoadmapId || (roadmaps.length > 0 ? (roadmaps[0].id || (roadmaps[0] as any)._id) : undefined);

  // Fetch progress summary for selected roadmap
  const { data: progress, isLoading } = useQuery({
    queryKey: ['progress', activeId],
    queryFn: () => api.getProgress(activeId)
  });

  if (isLoading || !progress) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  const safeProgress = {
    activeRoadmapTitle: progress.activeRoadmapTitle || 'Selected Roadmap',
    totalLearningHours: progress.totalLearningHours ?? 0,
    currentStreakDays: progress.currentStreakDays ?? 0,
    completedMilestonesCount: progress.completedMilestonesCount ?? 0,
    totalMilestones: progress.totalMilestones ?? 0,
    overallPercentage: progress.overallPercentage ?? 0,
    roadmapCompletionPercentage: progress.roadmapCompletionPercentage ?? progress.overallPercentage ?? 0,
    learningPathCompletionPercentage: progress.learningPathCompletionPercentage ?? 0,
    skillGrowthPercentage: progress.skillGrowthPercentage ?? 0,
    baselineSkillsCount: progress.baselineSkillsCount ?? 1,
    currentSkillsCount: (Array.isArray(authProfile?.skills) && authProfile.skills.length > 0)
      ? authProfile.skills.length
      : (progress.currentSkillsCount ?? progress.acquiredSkillsCount ?? 0),
    acquiredSkillsCount: progress.acquiredSkillsCount ?? 0,
    skillsGainedCount: progress.skillsGainedCount ?? progress.acquiredSkillsCount ?? 0,
    completedCoursesCount: progress.completedCoursesCount ?? 0,
    completedProjectsCount: progress.completedProjectsCount ?? 0,
    completedAssessmentsCount: progress.completedAssessmentsCount ?? 0,
    completedLearningPathItemsCount: progress.completedLearningPathItemsCount ?? 0,
    phaseBreakdown: Array.isArray(progress.phaseBreakdown) ? progress.phaseBreakdown : [],
    recentActivity: Array.isArray(progress.recentActivity) ? progress.recentActivity : []
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Your Learning Progress</h1>
            <p className="text-slate-500 text-sm mt-0.5">Comprehensive progress measuring Roadmap Milestones, Adaptive Learning Path, and Skill Growth since starting your journey.</p>
          </div>
        </div>

        {/* Holistic Progress Breakdown Card */}
        <Card className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold backdrop-blur-sm">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Multi-Dimensional Progress Engine
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Holistic Journey Progress: {safeProgress.overallPercentage}%
              </h2>
              <p className="text-xs text-indigo-200/90 leading-relaxed max-w-2xl">
                Synthesizing Roadmap Milestones (40%), Adaptive Learning Path Execution (30%), and Skill Acquisition Delta (30%) compared to your baseline when you created your profile.
              </p>
            </div>
            <div className="text-center bg-white/10 p-4 rounded-xl border border-white/20 shrink-0 min-w-[140px]">
              <div className="text-3xl font-black text-amber-400">{safeProgress.overallPercentage}%</div>
              <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Holistic Growth</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/10 p-4 rounded-xl border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-400" /> 1. Roadmap Progress
                </span>
                <span className="text-xs font-black text-white">{safeProgress.roadmapCompletionPercentage}%</span>
              </div>
              <Progress value={safeProgress.roadmapCompletionPercentage} className="h-2 bg-indigo-950/60" />
              <p className="text-[11px] text-indigo-200/80">
                {safeProgress.completedMilestonesCount} of {safeProgress.totalMilestones || '—'} roadmap milestones completed
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-xl border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 2. Learning Path
                </span>
                <span className="text-xs font-black text-white">{safeProgress.learningPathCompletionPercentage}%</span>
              </div>
              <Progress value={safeProgress.learningPathCompletionPercentage} className="h-2 bg-indigo-950/60" />
              <p className="text-[11px] text-indigo-200/80">
                {safeProgress.completedCoursesCount} Courses • {safeProgress.completedProjectsCount} Projects • {safeProgress.completedAssessmentsCount} Certs
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-xl border border-white/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400" /> 3. Skill Acquisition
                </span>
                <span className="text-xs font-black text-white">{safeProgress.skillGrowthPercentage}%</span>
              </div>
              <Progress value={safeProgress.skillGrowthPercentage} className="h-2 bg-indigo-950/60" />
              <p className="text-[11px] text-indigo-200/80">
                {safeProgress.baselineSkillsCount} Baseline Skills → {safeProgress.currentSkillsCount} Current Skills (+{safeProgress.skillsGainedCount} Acquired)
              </p>
            </div>
          </div>
        </Card>

        {/* Roadmap Selector Tabs */}
        {roadmaps.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Filter Progress By Roadmap</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
              {roadmaps.map((rm) => {
                const rId = rm.id || (rm as any)._id;
                const isSelected = rId === activeId;
                return (
                  <button
                    key={rId}
                    onClick={() => setSelectedRoadmapId(rId)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{rm.careerTitle || 'Roadmap'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border-slate-200 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Learning</p>
              <h3 className="text-2xl font-black text-slate-900">{safeProgress.totalLearningHours} hrs</h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Streak</p>
              <h3 className="text-2xl font-black text-slate-900">{safeProgress.currentStreakDays} Days</h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Milestones</p>
              <h3 className="text-2xl font-black text-slate-900">
                {safeProgress.completedMilestonesCount}
                {safeProgress.totalMilestones ? ` / ${safeProgress.totalMilestones}` : ' Done'}
              </h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Skills Acquired</p>
              <h3 className="text-2xl font-black text-slate-900">{safeProgress.acquiredSkillsCount} Skills</h3>
            </div>
          </Card>
        </div>

        {/* Selected Roadmap Progress Breakdown Chart */}
        <Card className="p-6 bg-white border-slate-200 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg">{safeProgress.activeRoadmapTitle} Progress Chart</h2>
                <p className="text-xs text-slate-500">Milestone completion breakdown for the selected roadmap.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={safeProgress.overallPercentage === 100 ? 'success' : 'ai'} className="text-xs font-extrabold px-3 py-1">
                Overall: {safeProgress.overallPercentage}%
              </Badge>
            </div>
          </div>

          {/* Overall Roadmap Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Overall Roadmap Completion</span>
              <span>{safeProgress.overallPercentage}% ({safeProgress.completedMilestonesCount} / {safeProgress.totalMilestones} Milestones)</span>
            </div>
            <Progress value={safeProgress.overallPercentage} barColor={safeProgress.overallPercentage === 100 ? 'bg-emerald-600' : 'bg-indigo-600'} size="md" />
          </div>

          {/* Phase Progress Chart Grid */}
          {safeProgress.phaseBreakdown.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" /> Phase Completion Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {safeProgress.phaseBreakdown.map((phase) => (
                  <div key={phase.phaseId} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{phase.title}</span>
                      <Badge
                        variant={phase.status === 'completed' ? 'success' : phase.status === 'in_progress' ? 'warning' : 'outline'}
                        className="text-[10px] font-bold"
                      >
                        {phase.completionPercentage}% ({phase.completedMilestones}/{phase.totalMilestones})
                      </Badge>
                    </div>
                    <Progress
                      value={phase.completionPercentage}
                      barColor={phase.status === 'completed' ? 'bg-emerald-500' : phase.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Real-Time Recent Activity Log */}
        <Card className="p-6 bg-white border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">Real-Time Learning Activity Feed</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Live Socket Updates Active</span>
          </div>

          <div className="space-y-3">
            {safeProgress.recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No activity recorded for this roadmap yet. Start or complete a milestone to see your live feed here.
              </p>
            ) : (
              safeProgress.recentActivity.map((act) => {
                const isCompleted = act.type === 'Completed' || act.status === 'completed';
                const isInProgress = act.type === 'In Progress' || act.status === 'in_progress';

                return (
                  <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Badge variant={isCompleted ? 'success' : isInProgress ? 'warning' : 'info'}>
                        {act.type}
                      </Badge>
                      <span className="font-semibold text-slate-900">{act.title}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{act.timestamp}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
