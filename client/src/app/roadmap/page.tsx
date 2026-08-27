'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Roadmap, RoadmapGraphNode } from '@/types';
import { Progress } from '@/components/ui/progress';
import {
  Compass,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Lock,
  Play,
  Star,
  Plus,
  RefreshCw,
  Zap,
  Trash2,
  Loader2,
  X,
  FileText,
  Video,
  FolderGit2,
  AlertCircle,
  Layers,
  GitFork,
  BookOpen,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  ExternalLink,
  Code,
  Lightbulb,
  Globe
} from 'lucide-react';

const SUGGESTED_CAREERS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'AI Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Cloud Architect',
  'Cybersecurity Analyst',
  'UX Designer',
  'Product Manager',
  'Mobile App Developer'
];

export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const { profile: authProfile } = useAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [customCareer, setCustomCareer] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'phases'>('graph');
  const [selectedNode, setSelectedNode] = useState<RoadmapGraphNode | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [resourceCategory, setResourceCategory] = useState<'all' | 'video' | 'documentation' | 'project'>('all');

  // Fetch list of roadmaps
  const { data: roadmaps = [], isLoading: loadingList } = useQuery<Roadmap[]>({
    queryKey: ['roadmaps'],
    queryFn: () => api.getRoadmaps(),
    staleTime: 0,
    refetchOnMount: true
  });

  const activeRoadmapObj = roadmaps.find((r) => (r as any).status === 'active') || roadmaps[0];
  const activeRoadmapId = selectedId || activeRoadmapObj?.id;

  // Fetch selected roadmap details
  const { data: currentRoadmap = null, isLoading: loadingDetails } = useQuery<Roadmap | null>({
    queryKey: ['roadmap', activeRoadmapId || 'active'],
    queryFn: () => api.getRoadmap(selectedId ? selectedId : 'active'),
    staleTime: 0,
    refetchOnMount: true
  });

  // Generate Roadmap Mutation
  const generateMutation = useMutation({
    mutationFn: (targetCareer: string) => api.generateRoadmap(targetCareer),
    onSuccess: (newRoadmap) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      if (newRoadmap && newRoadmap.id) {
        setSelectedId(newRoadmap.id);
        queryClient.invalidateQueries({ queryKey: ['roadmap', newRoadmap.id] });
      }
      setShowModal(false);
      setCustomCareer('');
    },
  });

  // Toggle Milestone Mutation with Optimistic Updates
  const milestoneMutation = useMutation({
    mutationFn: ({ phaseId, milestoneId }: { phaseId: string; milestoneId: string }) =>
      api.toggleMilestone(phaseId, milestoneId, currentRoadmap?.id),
    onMutate: async ({ phaseId, milestoneId }) => {
      await queryClient.cancelQueries({ queryKey: ['roadmap', activeRoadmapId] });

      const previousRoadmap = queryClient.getQueryData<Roadmap>(['roadmap', activeRoadmapId]);

      if (previousRoadmap) {
        const updatedPhases = previousRoadmap.phases.map((phase) => {
          if (!phaseId || phase.id === phaseId || (phase as any).phaseId === phaseId) {
            return {
              ...phase,
              milestones: phase.milestones.map((m) => {
                if (m.id === milestoneId || (m as any).milestoneId === milestoneId) {
                  return { ...m, completed: !m.completed };
                }
                return m;
              }),
            };
          }
          return phase;
        });

        const allMilestones = updatedPhases.flatMap((p) => p.milestones);
        const completedCount = allMilestones.filter((m) => m.completed).length;
        const newPercent = allMilestones.length > 0 ? Math.round((completedCount / allMilestones.length) * 100) : 0;

        queryClient.setQueryData<Roadmap>(['roadmap', activeRoadmapId], {
          ...previousRoadmap,
          overallCompletionPercent: newPercent,
          phases: updatedPhases,
        });
      }

      return { previousRoadmap };
    },
    onError: (err, variables, context) => {
      if (context?.previousRoadmap) {
        queryClient.setQueryData(['roadmap', activeRoadmapId], context.previousRoadmap);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', activeRoadmapId] });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['skill-gap'] });
    },
  });

  // Delete Roadmap Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoadmap(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const remaining = roadmaps.filter((r) => (r.id || (r as any)._id) !== deletedId);
      if (remaining.length > 0) {
        const nextId = remaining[0].id || (remaining[0] as any)._id;
        setSelectedId(nextId);
        queryClient.invalidateQueries({ queryKey: ['roadmap', nextId] });
      } else {
        setSelectedId(null);
      }
      setConfirmDeleteId(null);
    },
  });

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCareer.trim() || generateMutation.isPending) return;
    generateMutation.mutate(customCareer.trim());
  };

  const handleTagClick = (career: string) => {
    setCustomCareer(career);
    generateMutation.mutate(career);
  };

  const userSelectedFormats = Array.isArray(authProfile?.learningPreferences?.formats)
    ? authProfile.learningPreferences.formats
    : Array.isArray(authProfile?.learningPreferences)
    ? authProfile.learningPreferences
    : (authProfile as any)?.preferredLearningStyle
    ? [(authProfile as any).preferredLearningStyle]
    : ['Videos', 'Projects', 'Docs', 'Articles'];

  const isTypeMatchingFormat = (type: string, formats: string[]) => {
    if (!formats || formats.length === 0) return true;
    const lowerFormats = formats.map((f) => String(f).toLowerCase());
    const lowerType = String(type).toLowerCase();

    return lowerFormats.some((fmt) => {
      if (fmt.includes('video') && lowerType.includes('video')) return true;
      if ((fmt.includes('doc') || fmt.includes('article')) && (lowerType.includes('doc') || lowerType.includes('article'))) return true;
      if (fmt.includes('project') && lowerType.includes('project')) return true;
      return lowerType.includes(fmt) || fmt.includes(lowerType);
    });
  };

  const isLoading = loadingList || loadingDetails;

  const safeRoadmap = currentRoadmap
    ? {
        id: currentRoadmap.id,
        careerTitle: currentRoadmap.careerTitle || 'Your Target Career',
        domain: (currentRoadmap as any).domain || 'technology',
        sourceProvider: (currentRoadmap as any).sourceProvider || 'roadmap.sh',
        overallCompletionPercent: currentRoadmap.overallCompletionPercent ?? 0,
        weeklyCommitmentHours: currentRoadmap.weeklyCommitmentHours || authProfile?.learningPreferences?.weeklyHours || 10,
        adaptiveEvents: Array.isArray(currentRoadmap.adaptiveEvents) ? currentRoadmap.adaptiveEvents : [],
        nodes: Array.isArray(currentRoadmap.nodes) ? currentRoadmap.nodes : [],
        edges: Array.isArray(currentRoadmap.edges) ? currentRoadmap.edges : [],
        phases: Array.isArray(currentRoadmap.phases)
          ? currentRoadmap.phases.map((phase: any) => ({
              ...phase,
              skillsCovered: Array.isArray(phase.skillsCovered) ? phase.skillsCovered : [],
              milestones: Array.isArray(phase.milestones) ? phase.milestones : [],
              resources: Array.isArray(phase.resources) ? phase.resources : [],
            }))
          : [],
      }
    : null;

  const targetDeleteRoadmap = roadmaps.find((r) => (r.id || (r as any)._id) === confirmDeleteId);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/60">
                <Sparkles className="h-3.5 w-3.5" />
                <span>roadmap.sh Interactive Navigator</span>
              </div>
              {safeRoadmap?.domain && (
                <Badge variant="outline" className="text-[11px] font-bold capitalize">
                  Domain: {safeRoadmap.domain}
                </Badge>
              )}
              {safeRoadmap?.sourceProvider && (
                <Badge variant="secondary" className="text-[11px] font-bold">
                  Source: {safeRoadmap.sourceProvider === 'roadmap.sh' ? 'roadmap.sh' : 'Domain Dataset'}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {safeRoadmap ? safeRoadmap.careerTitle : 'Learning Roadmaps'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Explore your connected topic graph, track prerequisite dependencies, and master your career pathway.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  viewMode === 'graph' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitFork className="h-3.5 w-3.5" /> Graph View
              </button>
              <button
                onClick={() => setViewMode('phases')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  viewMode === 'phases' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Phase Summary
              </button>
            </div>

            {safeRoadmap && safeRoadmap.id && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setConfirmDeleteId(safeRoadmap.id)}
                className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs font-bold"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert Banner */}
        {generateMutation.isError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900">CAREER_NOT_SUPPORTED</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                {(generateMutation.error as any)?.response?.data?.message ||
                  (generateMutation.error as any)?.message ||
                  'This career is not currently supported by our dataset coverage.'}
              </p>
            </div>
          </div>
        )}

        {/* Saved Roadmaps Tabs */}
        {roadmaps.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            {roadmaps.map((rm) => {
              const rId = rm.id || (rm as any)._id;
              const isActive = rId === activeRoadmapId;
              return (
                <button
                  key={rId}
                  onClick={() => setSelectedId(rId)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{rm.careerTitle || 'Roadmap'}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(rId);
                    }}
                    className={`p-0.5 rounded-md hover:bg-black/10 transition-colors ${
                      isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Area */}
        {!safeRoadmap ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-500 font-medium">Loading roadmap graph...</p>
              </>
            ) : (
              <Card className="p-10 text-center space-y-3 border-dashed border-2 border-slate-200 max-w-md w-full">
                <Compass className="h-10 w-10 text-indigo-500 mx-auto" />
                <h3 className="text-base font-extrabold text-slate-900">No Roadmaps Found</h3>
                <p className="text-xs text-slate-500">Generate your first interactive career roadmap with Gemini AI.</p>
                <Button variant="ai" size="sm" onClick={() => setShowModal(true)} className="font-bold gap-1.5 mx-auto mt-2">
                  <Sparkles className="h-4 w-4" /> Generate Roadmap
                </Button>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Registered Learning Formats & Adaptive Events */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Learning Formats & Adaptive Velocity</h4>
                  <p className="text-[11px] text-slate-500">Graph nodes dynamically match your onboarding preferences and pace.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {userSelectedFormats.map((fmt: string) => (
                  <Badge key={fmt} variant="ai" className="text-[11px] font-bold">
                    {fmt === 'Videos' ? '🎥 Videos' : fmt === 'Projects' ? '🚀 Projects' : fmt === 'Docs' ? '📄 Docs' : fmt}
                  </Badge>
                ))}
              </div>
            </div>

            {/* GRAPH VIEW (roadmap.sh style) */}
            {viewMode === 'graph' ? (
              <Card className="p-6 md:p-8 bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl space-y-8 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                      <span>{safeRoadmap.careerTitle} Interactive Learning Map</span>
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Click any topic node to inspect prerequisites, topics, and curated learning resources.
                    </p>
                  </div>
                  {/* Status Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Mastered
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span> Recommended
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span> Locked
                    </span>
                  </div>
                </div>

                {/* Graph Nodes Canvas Layout */}
                <div className="space-y-12 py-4">
                  {safeRoadmap.nodes.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No graph nodes available. Switch to Phase Summary to view structured timeline.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                      {safeRoadmap.nodes.map((node: any, idx: number) => {
                        const status = node.status || 'RECOMMENDED';
                        const isMastered = status === 'MASTERED';
                        const isRecommended = status === 'RECOMMENDED';
                        const isLocked = status === 'LOCKED';

                        return (
                          <div
                            key={node.nodeId || node.id || `n_${idx}`}
                            onClick={() => setSelectedNode(node)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between space-y-4 ${
                              isMastered
                                ? 'bg-emerald-950/40 border-emerald-500/60 hover:border-emerald-400 text-emerald-100 shadow-md'
                                : isRecommended
                                ? 'bg-indigo-950/60 border-indigo-500/80 hover:border-indigo-400 text-indigo-100 shadow-lg ring-2 ring-indigo-500/20'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  {node.type || 'Topic'}
                                </span>
                                {isMastered ? (
                                  <Badge variant="success" className="text-[9px] font-bold">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> MASTERED
                                  </Badge>
                                ) : isRecommended ? (
                                  <Badge variant="ai" className="text-[9px] font-bold">
                                    <Play className="h-3 w-3 mr-1" /> RECOMMENDED
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] font-bold text-slate-500 border-slate-700">
                                    <Lock className="h-3 w-3 mr-1" /> LOCKED
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-extrabold text-sm text-white group-hover:text-indigo-300 transition-colors">
                                {node.title}
                              </h3>
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {node.description || 'Master core concepts and prerequisites.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">
                                Level: {node.userLevel ?? 0} / {node.requiredLevel ?? 4}
                              </span>
                              <span className="font-bold text-indigo-400 group-hover:underline flex items-center gap-1">
                                Details <BookOpen className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              /* PHASE SUMMARY VIEW */
              <div className="space-y-6">
                {safeRoadmap.phases.map((phase: any) => {
                  const milestones = phase.milestones || [];
                  const completedCount = milestones.filter((m: any) => m.completed).length;
                  const phasePercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

                  return (
                    <Card key={phase.id} className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900">{phase.title}</h3>
                          <p className="text-xs text-slate-500">{phase.summary}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {phase.durationWeeks} Weeks
                          </Badge>
                          <Badge variant={phasePercent === 100 ? 'success' : 'outline'} className="text-[10px] font-bold">
                            {phasePercent}% Complete ({completedCount}/{milestones.length})
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span>Phase Progress</span>
                          <span>{phasePercent}%</span>
                        </div>
                        <Progress value={phasePercent} barColor={phasePercent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'} size="sm" />
                      </div>
                      <div className="space-y-2">
                        {phase.milestones.map((m: any) => (
                          <div
                            key={m.id}
                            onClick={() => milestoneMutation.mutate({ phaseId: phase.id, milestoneId: m.id })}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              m.completed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {m.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                              )}
                              <span className={`text-xs font-bold ${m.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {m.title}
                              </span>
                            </div>
                            <Badge variant={m.completed ? 'success' : 'outline'} className="text-[10px] font-extrabold shrink-0">
                              {m.completed ? '✓ Completed' : '○ Mark Complete'}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Phase Resources matching user registration preferences & careers.csv */}
                      {phase.resources && phase.resources.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                              Phase Learning Resources from careers.csv
                            </h4>

                            {/* Resource Filter Tabs */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                              <button
                                onClick={() => setResourceCategory('all')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                  resourceCategory === 'all'
                                    ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                All
                              </button>
                              <button
                                onClick={() => setResourceCategory('video')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                  resourceCategory === 'video'
                                    ? 'bg-white text-rose-600 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                🎥 Videos
                              </button>
                              <button
                                onClick={() => setResourceCategory('documentation')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                  resourceCategory === 'documentation'
                                    ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                📖 Docs
                              </button>
                              <button
                                onClick={() => setResourceCategory('project')}
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                  resourceCategory === 'project'
                                    ? 'bg-white text-emerald-600 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                💻 Projects
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {phase.resources
                              .filter((res: any) => {
                                const lowerType = String(res.type || res.resourceType || '').toLowerCase();
                                if (resourceCategory === 'video') return lowerType.includes('video') || lowerType.includes('course');
                                if (resourceCategory === 'documentation') return lowerType.includes('doc') || lowerType.includes('article');
                                if (resourceCategory === 'project') return lowerType.includes('project') || lowerType.includes('practice');
                                return true;
                              })
                              .map((res: any, rIdx: number) => {
                                const isMatched = isTypeMatchingFormat(res.type, userSelectedFormats);
                                const lowerType = String(res.type || res.resourceType || '').toLowerCase();
                                const isVideo = lowerType.includes('video') || lowerType.includes('course');
                                const isDoc = lowerType.includes('doc') || lowerType.includes('article');
                                const isProj = lowerType.includes('project') || lowerType.includes('practice');

                                const targetUrl = (res.videoUrl || res.url || '').trim();
                                if (!targetUrl || targetUrl === '#') return null;

                                const IconComponent = isVideo ? Video : isDoc ? FileText : isProj ? FolderGit2 : BookOpen;
                                const ActionIcon = isVideo ? PlayCircle : isDoc ? BookOpen : isProj ? Code : ExternalLink;

                                const actionText = isVideo ? 'Watch Course' : isDoc ? 'Read Documentation' : isProj ? 'Start Project' : 'Open Resource';

                                return (
                                  <div
                                    key={res.id || res.resourceId || `res_${rIdx}`}
                                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                                      isVideo
                                        ? 'bg-rose-50/30 border-rose-200/80 shadow-2xs'
                                        : isProj
                                        ? 'bg-emerald-50/30 border-emerald-200/80 shadow-2xs'
                                        : 'bg-indigo-50/30 border-indigo-200/80 shadow-2xs'
                                    }`}
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <IconComponent className={`h-4 w-4 shrink-0 ${isVideo ? 'text-rose-600' : isProj ? 'text-emerald-600' : 'text-indigo-600'}`} />
                                          <Badge
                                            variant={isVideo ? 'warning' : isProj ? 'success' : 'ai'}
                                            className="text-[9px] font-bold uppercase tracking-wider"
                                          >
                                            {isVideo ? '🎥 VIDEO' : isDoc ? '📖 DOCS' : isProj ? '💻 PROJECT' : (res.type || 'RESOURCE')}
                                          </Badge>
                                        </div>
                                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                          ✓ Verified Dataset
                                        </span>
                                      </div>

                                      <h5 className="text-xs font-bold text-slate-900 line-clamp-2">
                                        {res.title}
                                      </h5>

                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                                        <p className="font-semibold text-slate-600 flex items-center gap-1">
                                          <Globe className="h-3 w-3 text-indigo-500 shrink-0" />
                                          <span className="font-extrabold text-slate-700">Provider:</span> {res.provider || 'Verified Dataset'}
                                        </p>
                                        {res.rating && (
                                          <span className="font-bold text-amber-600 text-[10px] shrink-0">
                                            ★ {res.rating}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <a
                                      href={targetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full"
                                    >
                                      <Button
                                        size="sm"
                                        variant={isVideo ? 'primary' : 'outline'}
                                        className={`w-full text-xs font-bold gap-1.5 h-8 ${
                                          isVideo
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                            : isProj
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                        }`}
                                      >
                                        <ActionIcon className="h-3.5 w-3.5" />
                                        {actionText}
                                        <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                                      </Button>
                                    </a>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NODE DETAILS SIDE DRAWER */}
        {selectedNode && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <Badge variant="ai" className="text-[10px] font-bold uppercase">
                      {selectedNode.type || 'Topic Node'}
                    </Badge>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{selectedNode.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Description</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedNode.description || 'Detailed topic requirements and prerequisites.'}
                    </p>
                  </div>

                  {selectedNode.topics && selectedNode.topics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Key Topics</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.topics.map((tp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[11px]">
                            {tp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Your Level</span>
                      <span className="font-extrabold text-slate-900">{selectedNode.userLevel ?? 0} / 4</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Required Level</span>
                      <span className="font-extrabold text-slate-900">{selectedNode.requiredLevel ?? 4} / 4</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="ai"
                  className="w-full font-bold text-xs"
                  onClick={() => {
                    setSelectedNode(null);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Topic Complete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Custom Roadmap Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6 bg-white rounded-3xl space-y-6 relative shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-extrabold text-slate-900">Generate Custom Roadmap</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Select or Enter Target Career</label>
                  
                  {/* Select Dropdown of Suggested Careers */}
                  <select
                    value={customCareer}
                    onChange={(e) => setCustomCareer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white font-medium text-slate-900"
                  >
                    <option value="">-- Select from Suggested Careers --</option>
                    {SUGGESTED_CAREERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Or Type Custom Career */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Or Type Custom Career</span>
                    <input
                      type="text"
                      value={customCareer}
                      onChange={(e) => setCustomCareer(e.target.value)}
                      placeholder="e.g. Frontend Developer, Pilot, DevOps Engineer, UX Designer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required
                    />
                  </div>

                  {/* Clickable Suggested Career Pills */}
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
                      Popular Suggested Careers
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/80">
                      {SUGGESTED_CAREERS.map((career) => (
                        <button
                          key={career}
                          type="button"
                          onClick={() => setCustomCareer(career)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            customCareer === career
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200'
                          }`}
                        >
                          ✨ {career}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="ai" size="sm" type="submit" disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Generate Roadmap
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Delete Roadmap Confirmation Modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white rounded-3xl space-y-5 relative shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="text-base font-extrabold text-slate-900">Delete Learning Roadmap</h3>
                </div>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this roadmap ({targetDeleteRoadmap?.careerTitle || 'selected roadmap'})? All associated progress records will also be removed. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(confirmDeleteId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-none"
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                  Confirm Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
