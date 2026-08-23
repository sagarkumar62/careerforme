'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  api,
  LearningPathResponse,
  LearningPathMilestone,
  LearningPathCourseItem,
  LearningPathProjectItem,
  LearningPathAssessmentItem
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  BookOpen,
  FolderGit2,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Layers,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lock,
  Star,
  Check,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';

const POPULAR_GOALS = [
  'AI Engineer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Cybersecurity Analyst',
];

export default function LearningPathPage() {
  const { profile } = useAuth();
  const [goal, setGoal] = useState<string>(
    profile?.targetCareerGoal || (profile as any)?.targetCareer || 'AI Engineer'
  );
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [assessmentScores, setAssessmentScores] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Active mutation trackers
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

  React.useEffect(() => {
    const targetGoal = profile?.targetCareerGoal || (profile as any)?.targetCareer || 'AI Engineer';
    setGoal(targetGoal);
    if (!learningPath && !generateMutation.isPending && !generationError) {
      generateMutation.mutate(targetGoal);
    }
  }, [profile]);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const handleExpandAllMilestones = () => {
    if (!learningPath?.milestones) return;
    const allExpanded: Record<string, boolean> = {};
    learningPath.milestones.forEach((m) => {
      allExpanded[m.milestone_id] = true;
    });
    setExpandedMilestones(allExpanded);
  };

  const handleCollapseAllMilestones = () => {
    setExpandedMilestones({});
  };

  // Generate Learning Path Mutation
  const generateMutation = useMutation({
    mutationFn: (targetGoal: string) => api.generateLearningPath(targetGoal, []),
    onSuccess: (data) => {
      setGenerationError(null);
      setLearningPath(data);

      if (data.milestones && data.milestones.length > 0) {
        const activeMilestone =
          data.milestones.find((m) => m.status === 'in_progress') ||
          data.milestones.find((m) => m.milestone_id === data.progress?.current_milestone) ||
          data.milestones.find((m) => m.title === data.progress?.current_milestone) ||
          data.milestones.find((m) => m.status !== 'completed') ||
          data.milestones[0];

        const activeId = activeMilestone?.milestone_id || 'milestone-1';

        setExpandedMilestones((prev) => {
          if (Object.keys(prev).length > 0) {
            return { ...prev, [activeId]: true };
          }
          return { [activeId]: true };
        });
      }
      showNotification('success', `Adaptive Learning Path synchronized for "${data.goal}"!`);
    },
    onError: (error: any) => {
      const errMsg = error?.message || 'Failed to generate learning path. Please try again.';
      setGenerationError(errMsg);
      showNotification('error', errMsg);
    },
  });

  // Complete Course Mutation
  const completeCourseMutation = useMutation({
    mutationFn: (courseId: string) => {
      setActiveCourseId(courseId);
      return api.completeCourse(courseId);
    },
    onSuccess: (res, courseId) => {
      showNotification('success', `Course "${courseId}" completed! Learner state synchronized.`);
      if (learningPath?.goal) {
        generateMutation.mutate(learningPath.goal);
      }
    },
    onError: (err: any, courseId) => {
      showNotification('error', `Failed to complete course "${courseId}": ${err?.message || 'Server error'}`);
    },
    onSettled: () => {
      setActiveCourseId(null);
    },
  });

  // Complete Project Mutation
  const completeProjectMutation = useMutation({
    mutationFn: (projectId: string) => {
      setActiveProjectId(projectId);
      return api.completeProject(projectId);
    },
    onSuccess: (res, projectId) => {
      showNotification('success', `Project "${projectId}" completed! Skills updated.`);
      if (learningPath?.goal) {
        generateMutation.mutate(learningPath.goal);
      }
    },
    onError: (err: any, projectId) => {
      showNotification('error', `Failed to complete project "${projectId}": ${err?.message || 'Server error'}`);
    },
    onSettled: () => {
      setActiveProjectId(null);
    },
  });

  // Submit Assessment Mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: ({ assessmentId, score }: { assessmentId: string; score: number }) => {
      setActiveAssessmentId(assessmentId);
      return api.submitAssessment(assessmentId, score, { completed_at: new Date().toISOString() });
    },
    onSuccess: (res: any, variables) => {
      const isPassed = res?.data?.passed ?? res?.data?.assessment_result?.passed ?? variables.score >= 70;
      if (isPassed) {
        showNotification(
          'success',
          `🎉 Assessment "${variables.assessmentId}" passed with score ${variables.score}%!`
        );
      } else {
        showNotification(
          'info',
          `Assessment "${variables.assessmentId}" submitted with score ${variables.score}%. (Score 70%+ required to pass).`
        );
      }
      if (learningPath?.goal) {
        generateMutation.mutate(learningPath.goal);
      }
    },
    onError: (err: any, variables) => {
      showNotification(
        'error',
        `Failed to submit assessment "${variables.assessmentId}": ${err?.message || 'Server error'}`
      );
    },
    onSettled: () => {
      setActiveAssessmentId(null);
    },
  });

  const handleGenerate = (targetGoal?: string) => {
    const selectedGoal = targetGoal || customGoalInput.trim() || goal;
    if (!selectedGoal || generateMutation.isPending) return;
    setGoal(selectedGoal);
    generateMutation.mutate(selectedGoal);
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) => ({ ...prev, [milestoneId]: !prev[milestoneId] }));
  };

  const isPathEmpty =
    learningPath !== null &&
    (!learningPath.milestones || learningPath.milestones.length === 0);

  const nextCourseId = learningPath?.progress?.next_course_id;

  return (
    <AppLayout>
      <div className="space-y-8 pb-12">
        {/* Header & Goal Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Adaptive Learning Path (F.9.2)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Personalized Learning Path
            </h1>
            <p className="text-indigo-200/90 text-sm leading-relaxed">
              FastAPI recommendation algorithms calculate your optimal course sequence, projects, and assessments, synchronized live with your MongoDB profile.
            </p>
          </div>

          <div className="flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
              <input
                type="text"
                value={customGoalInput}
                onChange={(e) => setCustomGoalInput(e.target.value)}
                placeholder={goal || 'Enter career goal...'}
                disabled={generateMutation.isPending}
                className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-indigo-300/70 focus:outline-none disabled:opacity-50"
              />
              <Button
                size="sm"
                onClick={() => handleGenerate()}
                disabled={generateMutation.isPending}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shrink-0 shadow-md disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Generate <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GOALS.slice(0, 4).map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenerate(g)}
                  disabled={generateMutation.isPending}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                    goal === g
                      ? 'bg-white text-indigo-900 font-bold shadow-xs'
                      : 'bg-white/10 text-indigo-200 hover:bg-white/20'
                  } disabled:opacity-50`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <Zap className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 px-2 py-1">
              ✕
            </button>
          </div>
        )}

        {/* Generation Error Banner with Retry Action */}
        {generationError && (
          <Card className="p-6 border-rose-200 bg-rose-50/70 text-rose-900 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-rose-900">Learning Path Generation Error</h3>
                  <p className="text-xs text-rose-700 mt-0.5">{generationError}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleGenerate(goal)}
                disabled={generateMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 gap-1.5 shadow-sm"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" /> Retry Generation
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Initial Prompt State */}
        {!learningPath && !generateMutation.isPending && !generationError && (
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Ready to Generate Your Path?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click <strong>"Generate"</strong> above to trigger the adaptive engine. FastAPI will analyze your current skills and build a topological course graph.
              </p>
              <Button onClick={() => handleGenerate()} className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs">
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Generate Path for "{goal}"
              </Button>
            </div>
          </Card>
        )}

        {/* Initial Skeleton Loading State */}
        {generateMutation.isPending && !learningPath && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 border-slate-200 bg-slate-100 h-28" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 border-slate-200 bg-slate-100 h-24" />
              ))}
            </div>
          </div>
        )}

        {/* Empty / Completed / No Recommendations Path State */}
        {isPathEmpty && !generateMutation.isPending && (
          learningPath?.status === 'no_recommendations' ? (
            <Card className="p-12 text-center border-amber-200 bg-amber-50/40">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">No Recommendations Resolved</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {learningPath.reason || `No skill gaps or course recommendations were mapped for "${learningPath?.goal || goal}".`}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  {POPULAR_GOALS.filter((g) => g !== goal).slice(0, 3).map((g) => (
                    <Button
                      key={g}
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(g)}
                      className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      Try "{g}"
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center border-emerald-200 bg-emerald-50/40">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Trophy className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Your Learning Path is Complete!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {learningPath?.reason || `You have acquired all target skills for "${learningPath?.goal || goal}". Select another career goal above to continue your adaptive learning journey.`}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  {POPULAR_GOALS.filter((g) => g !== goal).slice(0, 2).map((g) => (
                    <Button
                      key={g}
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(g)}
                      className="text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                    >
                      Start "{g}"
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )
        )}

        {/* Path Dashboard Overview & Milestones */}
        {learningPath && !isPathEmpty && (
          <div className="space-y-8 relative">
            {/* Loading Indicator Overlay for Refresh */}
            {generateMutation.isPending && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-start justify-center pt-24">
                <div className="bg-indigo-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-300" /> Recalculating Adaptive Path...
                </div>
              </div>
            )}

            {/* Next Action Prioritization Banner */}
            {nextCourseId && (
              <Card className="p-5 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">
                        Recommended Next Action
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{nextCourseId}</h3>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={activeCourseId === nextCourseId || completeCourseMutation.isPending}
                  onClick={() => completeCourseMutation.mutate(nextCourseId)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-sm"
                >
                  {activeCourseId === nextCourseId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      Complete Next Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </Card>
            )}



            {/* Progress Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Courses</span>
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {learningPath.progress?.completed_courses || 0} / {learningPath.total_courses || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Completed courses</span>
              </Card>

              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Milestones</span>
                  <Layers className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {learningPath.progress?.completed_milestones || 0} / {learningPath.total_milestones || 0}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Completed milestones</span>
              </Card>

              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Next Recommended</span>
                  <Target className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {learningPath.progress?.next_course_id || 'Path Complete!'}
                </div>
                <span className="text-[11px] text-indigo-600 font-medium">Optimal next step</span>
              </Card>
            </div>

            {/* Milestones List Header & Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" /> Milestone Execution Sequence
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold">
                    {learningPath.milestones.length} Phases
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleExpandAllMilestones}
                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                  >
                    Expand All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCollapseAllMilestones}
                    className="text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Collapse All
                  </Button>
                </div>
              </div>

              {learningPath.milestones.map((m: LearningPathMilestone, index: number) => {
                const isExpanded = Boolean(expandedMilestones[m.milestone_id]);
                const isCompleted = m.status === 'completed';
                const isInProgress = m.status === 'in_progress';
                const isCurrentMilestone = learningPath.progress?.current_milestone === m.milestone_id || isInProgress;

                // Milestone completion progress calculation
                const completedCount = m.completed_course_ids?.length || 0;
                const totalCount = m.course_ids?.length || 1;
                const milestoneProgress = m.progress ?? Math.round((completedCount / totalCount) * 100);

                return (
                  <Card key={m.milestone_id} className="border-slate-200 overflow-hidden shadow-xs">
                    {/* Milestone Accordion Header */}
                    <div
                      onClick={() => toggleMilestone(m.milestone_id)}
                      className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${
                        isCompleted
                          ? 'bg-emerald-50/50 hover:bg-emerald-50'
                          : isCurrentMilestone
                          ? 'bg-indigo-50/50 hover:bg-indigo-50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrentMilestone
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isCompleted ? <Check className="h-5 w-5 text-emerald-700" /> : index + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-slate-900 text-base">{m.title}</h3>
                            {isCurrentMilestone && !isCompleted && (
                              <Badge variant="ai" className="text-[10px] uppercase font-bold">
                                Current Phase
                              </Badge>
                            )}
                            <Badge
                              variant={isCompleted ? 'success' : isCurrentMilestone ? 'secondary' : 'outline'}
                              className="text-[10px] uppercase tracking-wider"
                            >
                              {m.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-slate-500 font-medium">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" /> {m.estimated_hours}h
                            </span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Depth {m.dependency_depth}
                            </span>
                          </div>
                          <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              style={{ width: `${milestoneProgress}%` }}
                            />
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Milestone Content Body */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100 space-y-6 bg-white">
                        {/* Target Skills */}
                        {m.skills && m.skills.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                              Target Skills
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {m.skills.map((skill) => (
                                <Badge key={skill} variant="primary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Courses Section */}
                        {m.course_ids && m.course_ids.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-indigo-600" /> Recommended Courses
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(m.courses || m.course_ids || []).map((courseEntry: any) => {
                                const cid = typeof courseEntry === 'string' ? courseEntry : courseEntry?.id || courseEntry?.course_id || '';
                                const courseItem: any = typeof courseEntry === 'object' && courseEntry !== null ? courseEntry : null;
                                const isCourseCompleted = (m.completed_course_ids || []).includes(cid);
                                const isNext = cid === nextCourseId || courseItem?.is_next;
                                const isPendingThis = activeCourseId === cid;

                                return (
                                  <div
                                    key={cid}
                                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                                      isNext
                                        ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                                        : isCourseCompleted
                                        ? 'border-emerald-200 bg-emerald-50/40'
                                        : 'border-slate-200 bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-slate-800 truncate">
                                          {courseItem?.title || cid}
                                        </span>
                                        {isNext && (
                                          <Badge variant="ai" className="text-[9px] px-1.5 py-0 font-extrabold uppercase">
                                            <Zap className="h-3 w-3 mr-0.5 text-indigo-600" /> Next Up
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>{courseItem?.provider || 'FastAPI candidate course'}</span>
                                        {courseItem?.reason && (
                                          <span className="text-indigo-600 font-medium truncate">
                                            • {courseItem.reason}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={isCourseCompleted ? 'outline' : isNext ? 'primary' : 'secondary'}
                                      disabled={isCourseCompleted || isPendingThis || completeCourseMutation.isPending}
                                      onClick={() => completeCourseMutation.mutate(cid)}
                                      className={`text-xs font-bold shrink-0 ${
                                        isCourseCompleted
                                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                                          : isNext
                                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                          : ''
                                      }`}
                                    >
                                      {isCourseCompleted ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Done
                                        </>
                                      ) : isPendingThis ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        'Complete'
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Projects Section */}
                        {m.project_ids && m.project_ids.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <FolderGit2 className="h-4 w-4 text-emerald-600" /> Hands-On Projects
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(m.projects || m.project_ids || []).map((projectEntry: any) => {
                                const pid = typeof projectEntry === 'string' ? projectEntry : projectEntry?.id || projectEntry?.project_id || '';
                                const projItem: any = typeof projectEntry === 'object' && projectEntry !== null ? projectEntry : null;
                                const isLocked = projItem?.is_locked || Boolean(projItem?.missing_prerequisites && projItem.missing_prerequisites.length > 0);
                                const isPendingThis = activeProjectId === pid;
                                const isProjCompleted = projItem?.is_completed || projItem?.status === 'completed';
                                const reason = projItem?.reason || 'Demonstrates key milestone skills';
                                const missingReqs = projItem?.missing_prerequisites || [];

                                return (
                                  <div
                                    key={pid}
                                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                                      isLocked
                                        ? 'border-amber-200 bg-amber-50/40'
                                        : isProjCompleted
                                        ? 'border-emerald-200 bg-emerald-50/40'
                                        : 'border-slate-200 bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-slate-800 truncate">
                                          {projItem?.title || pid}
                                        </span>
                                        {isLocked && (
                                          <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold gap-1">
                                            <Lock className="h-3 w-3 text-amber-600" /> Locked
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 leading-normal">{reason}</p>

                                      {/* Locked prerequisite explanation */}
                                      {isLocked && missingReqs.length > 0 && (
                                        <div className="text-[10px] text-amber-700 font-medium bg-amber-100/60 p-1.5 rounded-md mt-1 flex items-center gap-1">
                                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                          <span>Missing: {missingReqs.join(', ')}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action button disabled when locked */}
                                    <Button
                                      size="sm"
                                      disabled={isLocked || isProjCompleted || isPendingThis || completeProjectMutation.isPending}
                                      onClick={() => completeProjectMutation.mutate(pid)}
                                      className={`text-xs font-bold shrink-0 self-end ${
                                        isLocked
                                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed border-slate-300'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      }`}
                                    >
                                      {isLocked ? (
                                        <>
                                          <Lock className="h-3.5 w-3.5 mr-1" /> Locked
                                        </>
                                      ) : isProjCompleted ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed
                                        </>
                                      ) : isPendingThis ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        'Complete'
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Assessments Section */}
                        {m.assessment_ids && m.assessment_ids.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Award className="h-4 w-4 text-amber-500" /> Knowledge Assessments
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(m.assessments || m.assessment_ids || []).map((assessmentEntry: any) => {
                                const aid = typeof assessmentEntry === 'string' ? assessmentEntry : assessmentEntry?.id || assessmentEntry?.assessment_id || '';
                                const assessItem: any = typeof assessmentEntry === 'object' && assessmentEntry !== null ? assessmentEntry : null;
                                const isLocked = assessItem?.is_locked || assessItem?.readiness_state === 'locked' || Boolean(assessItem?.missing_skills && assessItem.missing_skills.length > 0);
                                const isAssessCompleted = assessItem?.is_completed || assessItem?.status === 'completed';
                                const currentScore = assessmentScores[aid] ?? assessItem?.last_score ?? 85;
                                const isPendingThis = activeAssessmentId === aid;
                                const reason = assessItem?.reason || 'Validates skill proficiency';
                                const missingSkills = assessItem?.missing_skills || [];

                                return (
                                  <div
                                    key={aid}
                                    className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                                      isLocked
                                        ? 'border-amber-200 bg-amber-50/40'
                                        : isAssessCompleted
                                        ? 'border-emerald-200 bg-emerald-50/40'
                                        : 'border-slate-200 bg-slate-50/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-xs text-slate-800 truncate">
                                        {assessItem?.title || aid}
                                      </span>
                                      {isLocked ? (
                                        <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold gap-1">
                                          <Lock className="h-3 w-3 text-amber-600" /> Locked
                                        </Badge>
                                      ) : isAssessCompleted ? (
                                        <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">
                                          Passed ({currentScore}%)
                                        </Badge>
                                      ) : (
                                        <span className="text-xs font-bold text-indigo-600">{currentScore}%</span>
                                      )}
                                    </div>

                                    <p className="text-[10px] text-slate-500 leading-normal">{reason}</p>

                                    {/* Locked missing-skill explanation */}
                                    {isLocked && missingSkills.length > 0 && (
                                      <div className="text-[10px] text-amber-700 font-medium bg-amber-100/60 p-1.5 rounded-md flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                        <span>Required skills missing: {missingSkills.join(', ')}</span>
                                      </div>
                                    )}

                                    {/* Score slider & action disabled when locked */}
                                    {!isAssessCompleted && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <input
                                          type="range"
                                          min="50"
                                          max="100"
                                          value={currentScore}
                                          onChange={(e) =>
                                            setAssessmentScores({
                                              ...assessmentScores,
                                              [aid]: parseFloat(e.target.value),
                                            })
                                          }
                                          disabled={isLocked || isPendingThis || submitAssessmentMutation.isPending}
                                          className="w-full accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <Button
                                          size="sm"
                                          disabled={isLocked || isPendingThis || submitAssessmentMutation.isPending}
                                          onClick={() =>
                                            submitAssessmentMutation.mutate({
                                              assessmentId: aid,
                                              score: currentScore,
                                            })
                                          }
                                          className={`text-xs font-bold shrink-0 ${
                                            isLocked
                                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed border-slate-300'
                                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                                          }`}
                                        >
                                          {isLocked ? (
                                            <>
                                              <Lock className="h-3.5 w-3.5 mr-1" /> Locked
                                            </>
                                          ) : isPendingThis ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            'Submit'
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}


      </div>
    </AppLayout>
  );
}
