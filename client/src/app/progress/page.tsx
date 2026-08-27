'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Flame, Clock, CheckCircle2, Trophy, BarChart2, Activity, MapPin, Layers, Trash2, Loader2, AlertCircle, Radio, Sparkles, RefreshCw, Zap, BookOpen, ArrowRight, FolderGit2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { Roadmap } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const { profile: authProfile } = useAuth();
  const { socket, isConnected } = useSocket();
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | undefined>(undefined);
  const [confirmDeleteRoadmap, setConfirmDeleteRoadmap] = useState<{ id: string; title: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Live Socket.IO real-time progress event listener
  useEffect(() => {
    if (!socket) return;

    const handleSocketProgressEvent = (eventName: string, data: any) => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      let message = '⚡ Live progress synchronized across roadmap, learning path & profile!';
      if (eventName === 'progress:skill-acquired') {
        const skills = Array.isArray(data?.acquiredSkills) ? data.acquiredSkills.join(', ') : 'New Skill';
        message = `🏆 Skill Acquired: ${skills}! Profile skill matrix updated live.`;
      } else if (eventName === 'progress:milestone-completed') {
        message = `🎉 Milestone Completed! Roadmap & learning path updated in real time.`;
      }

      setLiveToast(message);
      setTimeout(() => setLiveToast(null), 5000);
    };

    const events = [
      'progress:updated',
      'progress:milestone-completed',
      'progress:milestone-started',
      'progress:phase-completed',
      'progress:summary-updated',
      'progress:skill-acquired',
    ];

    events.forEach((evt) => {
      socket.on(evt, (data) => handleSocketProgressEvent(evt, data));
    });

    return () => {
      events.forEach((evt) => {
        socket.off(evt);
      });
    };
  }, [socket, queryClient]);

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

  // Delete / Remove Career Progress Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoadmap(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });

      const remaining = roadmaps.filter((r) => (r.id || (r as any)._id) !== deletedId);
      if (remaining.length > 0) {
        const nextId = remaining[0].id || (remaining[0] as any)._id;
        setSelectedRoadmapId(nextId);
      } else {
        setSelectedRoadmapId(undefined);
      }
      setConfirmDeleteRoadmap(null);
      setNotification({ type: 'success', message: 'Career progress removed successfully.' });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.message || 'Failed to remove career progress.' });
    }
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

  const cCount = progress.completedCoursesCount ?? 0;
  const pCount = progress.completedProjectsCount ?? 0;
  const aCount = progress.completedAssessmentsCount ?? 0;
  const completedItemSum = cCount + pCount + aCount;

  const safeProgress = {
    activeRoadmapTitle: progress.activeRoadmapTitle || 'Selected Roadmap',
    totalLearningHours: progress.totalLearningHours ?? 0,
    currentStreakDays: progress.currentStreakDays ?? 0,
    completedMilestonesCount: progress.completedMilestonesCount ?? 0,
    totalMilestones: progress.totalMilestones ?? 0,
    overallPercentage: progress.overallPercentage ?? 0,
    roadmapCompletionPercentage: progress.roadmapCompletionPercentage ?? progress.overallPercentage ?? 0,
    learningPathCompletionPercentage: (
      (progress.learningPathCompletionPercentage && progress.learningPathCompletionPercentage > 0)
        ? progress.learningPathCompletionPercentage
        : (progress.roadmapCompletionPercentage === 100 || (progress.completedMilestonesCount > 0 && progress.completedMilestonesCount >= (progress.totalMilestones || 1)))
          ? 100
          : completedItemSum > 0
            ? Math.min(100, Math.round((completedItemSum / Math.max(1, progress.totalMilestones || 4)) * 100))
            : 0
    ),
    skillGrowthPercentage: progress.skillGrowthPercentage ?? 0,
    baselineSkillsCount: progress.baselineSkillsCount ?? 1,
    currentSkillsCount: (Array.isArray(authProfile?.skills) && authProfile.skills.length > 0)
      ? authProfile.skills.length
      : (progress.currentSkillsCount ?? progress.acquiredSkillsCount ?? 0),
    acquiredSkillsCount: progress.acquiredSkillsCount ?? 0,
    skillsGainedCount: progress.skillsGainedCount ?? progress.acquiredSkillsCount ?? 0,
    completedCoursesCount: cCount,
    completedProjectsCount: pCount,
    completedAssessmentsCount: aCount,
    completedLearningPathItemsCount: progress.completedLearningPathItemsCount ?? completedItemSum,
    phaseBreakdown: Array.isArray(progress.phaseBreakdown) ? progress.phaseBreakdown : [],
    recentActivity: Array.isArray(progress.recentActivity) ? progress.recentActivity : []
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Your Learning Progress</h1>
              {isConnected && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] shadow-2xs">
                  <Radio className="h-3 w-3 text-emerald-500 animate-pulse" /> Real-Time Live Sync Active
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Comprehensive progress measuring Roadmap Milestones (40%), Adaptive Learning Path Execution (30%), and Profile Skill Growth (30%) in real time.
            </p>
          </div>
        </div>

        {/* Live Socket Update Banner */}
        {liveToast && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500/30 text-white flex items-center justify-between text-xs font-bold shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 animate-bounce shrink-0" />
              <span>{liveToast}</span>
            </div>
            <button onClick={() => setLiveToast(null)} className="text-indigo-300 hover:text-white px-2 py-0.5">
              ✕
            </button>
          </div>
        )}

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
                Track real-time completion metrics for your active target career roadmap and milestones.
              </p>
            </div>
            <div className="text-center bg-white/10 p-4 rounded-xl border border-white/20 shrink-0 min-w-[140px]">
              <div className="text-3xl font-black text-amber-400">{safeProgress.overallPercentage}%</div>
              <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider font-extrabold">Roadmap Completion</div>
            </div>
          </div>

          <div className="pt-2">
            <div className="bg-white/10 p-4.5 rounded-xl border border-white/15 space-y-2 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-400" /> Roadmap Milestone Execution
                </span>
                <span className="text-xs font-black text-white">{safeProgress.roadmapCompletionPercentage}%</span>
              </div>
              <Progress value={safeProgress.roadmapCompletionPercentage} className="h-2.5 bg-indigo-950/60" barColor="bg-gradient-to-r from-indigo-400 to-emerald-400" />
              <p className="text-[11px] text-indigo-200/80 font-medium">
                {safeProgress.completedMilestonesCount} of {safeProgress.totalMilestones || '—'} roadmap milestones completed
              </p>
            </div>
          </div>
        </Card>

        {/* Floating Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 px-2 py-1">
              ✕
            </button>
          </div>
        )}

        {/* Careers In Progress Selector & Management */}
        {roadmaps.length > 0 && (
          <Card className="p-5 bg-white border-slate-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-600" /> Careers In Progress
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a career to filter progress metrics, or remove a career pathway to reset its recorded progress.
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-xs font-extrabold">
                {roadmaps.length} Career{roadmaps.length > 1 ? 's' : ''} Tracked
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {roadmaps.map((rm) => {
                const rId = rm.id || (rm as any)._id;
                const isSelected = rId === activeId;
                const title = rm.careerTitle || 'Roadmap';

                return (
                  <div
                    key={rId}
                    className={`inline-flex items-center rounded-xl overflow-hidden transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300/50'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedRoadmapId(rId)}
                      className="px-3.5 py-2 text-xs font-extrabold flex items-center gap-2 focus:outline-none"
                    >
                      <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                      <span>{title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteRoadmap({ id: rId, title });
                      }}
                      className={`px-2.5 py-2 text-xs transition-colors border-l ${
                        isSelected
                          ? 'border-indigo-500 text-indigo-200 hover:text-white hover:bg-indigo-700'
                          : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={`Remove progress for ${title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="p-5 bg-white border-slate-200 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Total Learning</p>
              <h3 className="text-xl font-black text-slate-900 truncate">{safeProgress.totalLearningHours} hrs</h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Active Streak</p>
              <h3 className="text-xl font-black text-slate-900 truncate">{safeProgress.currentStreakDays} Days</h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Milestones</p>
              <h3 className="text-xl font-black text-slate-900 truncate">
                {safeProgress.completedMilestonesCount}
                {safeProgress.totalMilestones ? ` / ${safeProgress.totalMilestones}` : ' Done'}
              </h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-indigo-200 bg-indigo-50/30 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider truncate">Learning Path</p>
              <h3 className="text-xl font-black text-slate-900 truncate">{safeProgress.learningPathCompletionPercentage}%</h3>
            </div>
          </Card>

          <Card className="p-5 bg-white border-slate-200 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate">Skills Acquired</p>
              <h3 className="text-xl font-black text-slate-900 truncate">{safeProgress.acquiredSkillsCount} Skills</h3>
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

        {/* Delete Confirmation Modal */}
        {confirmDeleteRoadmap && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <Card className="max-w-md w-full p-6 bg-white rounded-2xl shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Remove Career Progress</h3>
                  <p className="text-xs text-slate-500">Confirm deletion of roadmap and tracking metrics</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove all recorded progress for <strong className="text-slate-900">{confirmDeleteRoadmap.title}</strong>? This will permanently delete the roadmap and reset its progress tracking.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDeleteRoadmap(null)}
                  disabled={deleteMutation.isPending}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => deleteMutation.mutate(confirmDeleteRoadmap.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" /> Remove Progress
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
