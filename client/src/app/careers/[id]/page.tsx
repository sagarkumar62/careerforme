'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Compass, DollarSign, Clock, ArrowLeft, Loader2, FolderGit2, BookOpen, GitFork } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchScore } from '@/components/ui/match-score';
import { api } from '@/lib/api';

export default function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: career, isLoading } = useQuery({
    queryKey: ['career', resolvedParams.id],
    queryFn: () => api.getRecommendationById(resolvedParams.id)
  });

  const displayTitle = career?.title || (career as any)?.career || 'Career Pathway';

  const { data: projects } = useQuery({
    queryKey: ['career-projects', resolvedParams.id, displayTitle],
    queryFn: () => api.getProjectRecommendations(displayTitle, career?.skillGaps),
    enabled: Boolean(career)
  });

  const { data: resources } = useQuery({
    queryKey: ['career-resources', resolvedParams.id, displayTitle],
    queryFn: () => api.getResourceRecommendations(career?.skillGaps, displayTitle),
    enabled: Boolean(career)
  });

  const { data: flowchart } = useQuery({
    queryKey: ['career-flowchart', resolvedParams.id, displayTitle],
    queryFn: () => api.getFlowchartData(displayTitle),
    enabled: Boolean(career)
  });

  const generateRoadmapMutation = useMutation({
    mutationFn: (careerId: string) => api.generateRoadmap(careerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['skill-gap'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.push('/roadmap');
    }
  });

  const handleBuildRoadmap = () => {
    generateRoadmapMutation.mutate(displayTitle || resolvedParams.id);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-xs text-indigo-600 font-semibold animate-pulse">Analyzing career intelligence & skill gaps...</p>
        </div>
      </AppLayout>
    );
  }

  if (!career) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-2xl mx-auto py-12 text-center">
          <Card className="p-8 space-y-4 bg-white border-slate-200 shadow-soft rounded-2xl">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Career Pathway Not Found</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              We couldn't locate details for the specified career identifier. Explore our full library of personalized career recommendations below.
            </p>
            <Link href="/recommendations" className="inline-block pt-2">
              <Button variant="primary" className="font-bold gap-2">
                <ArrowLeft className="h-4 w-4" /> Return to Explore Careers
              </Button>
            </Link>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const whyMatchesList = Array.isArray(career.whyMatches) ? career.whyMatches : [];
  const skillGapsList = Array.isArray(career.skillGaps) ? career.skillGaps : [];
  const keyResponsibilitiesList = Array.isArray(career.keyResponsibilities) ? career.keyResponsibilities : [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <Link href="/recommendations" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Explore Careers
        </Link>

        {/* Hero Card */}
        <Card className="p-6 sm:p-8 bg-white border-slate-200 shadow-soft rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{displayTitle}</h1>
                <Badge variant="primary">{career.difficulty || 'Intermediate'} Level</Badge>
                {career.confidence && (
                  <Badge variant="ai">AI Match: {career.confidence}</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">{career.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 pt-1">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-600" /> {career.estimatedTransition || career.transition_estimate || '6 Months'}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-emerald-600" /> {career.averageSalary || '$135,000 / yr'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
              <MatchScore score={career.matchScore || career.finalScore || 85} size="lg" />
              <Button
                variant="ai"
                size="lg"
                disabled={generateRoadmapMutation.isPending}
                onClick={handleBuildRoadmap}
                className="w-full font-bold shadow-glow-indigo gap-2"
              >
                {generateRoadmapMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Building Roadmap...
                  </>
                ) : (
                  <>
                    Build My Roadmap <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Grid: Strengths & Skill Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths / Why it matches */}
          <Card className="p-6 space-y-4 bg-white border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">Why This Career Fits You</h2>
            </div>
            {whyMatchesList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No specific matching reasons listed.</p>
            ) : (
              <ul className="space-y-3 text-xs text-slate-700 font-medium">
                {whyMatchesList.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Skill Gaps to Learn */}
          <Card className="p-6 space-y-4 bg-white border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="font-extrabold text-slate-900 text-lg">Skill Gaps to Bridge</h2>
            </div>
            {skillGapsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Great alignment! No critical skill gaps identified for this role.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {skillGapsList.map((sg, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs font-semibold text-amber-900">
                    <span>{sg}</span>
                    <Badge variant="warning">NEEDS_WORK</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* PREREQUISITE & TOPIC FLOWCHART */}
        {flowchart && flowchart.nodes && flowchart.nodes.length > 0 && (
          <Card className="p-6 space-y-4 bg-white border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <GitFork className="h-5 w-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">Prerequisite Graph Flowchart</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {flowchart.nodes.map((node: any, i: number) => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-900 shadow-sm">
                    {node.label}
                    {node.category && <span className="block text-[9px] font-semibold text-indigo-600 uppercase mt-0.5">{node.category}</span>}
                  </div>
                  {i < flowchart.nodes.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* GEMINI RECOMMENDED PROJECTS */}
        {projects && projects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">Recommended Practical Projects</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projects.map((proj, idx) => (
                <Card key={idx} className="p-5 space-y-3 bg-white border-slate-200 shadow-soft rounded-2xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={proj.difficulty === 'BEGINNER' ? 'secondary' : proj.difficulty === 'INTERMEDIATE' ? 'primary' : 'ai'}>
                        {proj.difficulty}
                      </Badge>
                      <span className="text-[11px] font-bold text-slate-500">{proj.estimatedHours} hrs</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">{proj.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{proj.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Practiced Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {proj.skillsPracticed.map((sp: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{sp}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* SKILL-MAPPED LEARNING RESOURCES */}
        {resources && resources.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="font-extrabold text-slate-900 text-lg">Skill-Mapped Learning Resources</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources.map((res, idx) => (
                <Card key={idx} className="p-4 bg-white border-slate-200 shadow-soft rounded-xl flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{res.title}</h4>
                      <Badge variant="outline" className="text-[10px]">{res.type}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-600">{res.reason}</p>
                    {res.url ? (
                      <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 pt-1">
                        Access Resource <ArrowRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 block pt-1">Search topic for verified documentation</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Typical Responsibilities */}
        {keyResponsibilitiesList.length > 0 && (
          <Card className="p-6 space-y-4 bg-white border-slate-200 rounded-2xl">
            <h2 className="font-extrabold text-slate-900 text-lg">Typical Responsibilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700">
              {keyResponsibilitiesList.map((resp, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
