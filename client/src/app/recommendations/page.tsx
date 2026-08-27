'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Compass, Layers, Check, ShieldCheck, Zap, BarChart2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchScore } from '@/components/ui/match-score';
import { api } from '@/lib/api';
import { CareerRecommendation, CareerComparison } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RecommendationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, updateUserAndProfile } = useAuth();
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.getRecommendations(),
    staleTime: 0,
    refetchOnMount: true
  });

  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data: comparisonData, isLoading: isComparing } = useQuery({
    queryKey: ['compare-careers', compareIds],
    queryFn: () => api.compareCareers(compareIds),
    enabled: compareIds.length > 0
  });

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id));
    } else {
      if (compareIds.length >= 3) return;
      setCompareIds([...compareIds, id]);
    }
  };

  if (isLoading || !recommendations) {
    const loadingSteps = [
      'Analyzing your profile & skill matrix...',
      'Executing 6-factor hybrid match scoring...',
      'Finding top matching career pathways...',
      'Identifying skill gaps & confidence levels...',
      'Preparing personalized career dashboard...'
    ];

    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <Sparkles className="h-5 w-5 text-indigo-600 absolute" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-lg">AI Career Engine Active</h3>
            <p className="text-xs text-indigo-600 font-semibold animate-pulse">{loadingSteps[loadingStepIndex % loadingSteps.length]}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const selectedCareer: CareerRecommendation | undefined =
    recommendations.find(r => (r.id || (r as any).career_id) === selectedCareerId) || recommendations[0];

  const selectedIdResolved = selectedCareer ? (selectedCareer.id || (selectedCareer as any).career_id) : '';

  const alternatives: CareerRecommendation[] = recommendations.filter(r => (r.id || (r as any).career_id) !== selectedIdResolved);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/60 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Career Decision Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Personalized Career Intelligence</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Active Goal: <strong className="text-indigo-600">{profile?.targetCareerGoal || (profile as any)?.targetCareer || selectedCareer?.title || selectedCareer?.career || 'Target Career'}</strong> — 6-Factor Hybrid Match derived from your skills, goals, and experience.
            </p>
          </div>
        </div>

        {/* Empty State */}
        {recommendations.length === 0 ? (
          <Card className="p-8 text-center space-y-4 bg-white border-slate-200 shadow-soft rounded-2xl">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">No Career Recommendations Generated Yet</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Complete your learner profile onboarding to allow our Python AI engine to evaluate your 6-factor match.
              </p>
            </div>
            <Link href="/onboarding">
              <Button variant="ai" className="gap-2 font-bold px-6">
                Start AI Onboarding <Sparkles className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* SELECTED CAREER HERO BANNER */}
            {selectedCareer && (
              <Card className="p-6 sm:p-8 bg-white border-2 border-indigo-600 ring-4 ring-indigo-50 shadow-lg rounded-2xl space-y-6 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="ai" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                        {selectedIdResolved === (recommendations[0]?.id || (recommendations[0] as any)?.career_id) ? 'Top Match' : 'Selected Career'}
                      </Badge>
                      {selectedCareer.confidence && (
                        <Badge variant="secondary" className="font-semibold text-xs flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Confidence: {selectedCareer.confidence}
                        </Badge>
                      )}
                      <Badge variant="primary">{selectedCareer.difficulty || 'Intermediate'} Difficulty</Badge>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedCareer.title || selectedCareer.career}</h2>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">{selectedCareer.description}</p>
                  </div>

                  <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
                    <MatchScore score={selectedCareer.matchScore || selectedCareer.finalScore || 85} size="lg" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">6-Factor AI Match</span>
                  </div>
                </div>



                {/* Insights & Next Best Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <h4 className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Why It Matches You
                    </h4>
                    <ul className="space-y-1 font-medium text-emerald-800">
                      {(selectedCareer.whyMatches || []).map((reason: string, i: number) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    <h4 className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-indigo-600" /> Next Best Action
                    </h4>
                    <p className="font-semibold text-indigo-800">
                      {selectedCareer.nextBestAction || selectedCareer.next_best_action || `Bridge key skill gaps in ${selectedCareer.skillGaps?.[0] || 'core competencies'} to start transition.`}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 pt-1">
                      Estimated Transition Effort: <strong className="text-indigo-700">{selectedCareer.estimatedTransition || selectedCareer.transition_estimate || '3-6 Months'}</strong>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Link href={`/careers/${selectedIdResolved}`} className="w-full sm:w-auto">
                    <Button variant="ai" size="lg" className="w-full font-bold gap-2 text-sm px-8">
                      Explore Detailed Skill Gap <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant={compareIds.includes(selectedIdResolved) ? 'secondary' : 'outline'}
                    size="lg"
                    onClick={() => toggleCompare(selectedIdResolved)}
                    className="w-full sm:w-auto font-bold text-xs"
                  >
                    {compareIds.includes(selectedIdResolved) ? 'Compared ✓' : '+ Compare'}
                  </Button>
                </div>
              </Card>
            )}

            {/* ALTERNATIVE CAREER PATHS */}
            {alternatives.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Alternative Recommended Careers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {alternatives.map((car, idx) => {
                    const carId = car?.id || car?.career_id || `car_alt_${idx}`;
                    const carTitle = car?.title || car?.career || 'Alternative Role';
                    const isCompared = compareIds.includes(carId);

                    return (
                      <Card
                        key={carId}
                        onClick={() => setSelectedCareerId(carId)}
                        className={`p-6 flex flex-col justify-between bg-white border shadow-soft hover:shadow-lg transition-all rounded-2xl space-y-4 cursor-pointer ${
                          selectedCareerId === carId ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-extrabold text-lg text-slate-900">{carTitle}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="primary">{car.difficulty || 'Intermediate'}</Badge>
                                <span className="text-[11px] font-semibold text-slate-500">{car.estimatedTransition || car.transition_estimate || '3-6 Months'}</span>
                              </div>
                            </div>
                            <MatchScore score={car.matchScore || car.finalScore || 75} size="sm" showLabel={false} />
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2">{car.description}</p>

                          {/* Target Skill Gaps */}
                          {car.skillGaps && car.skillGaps.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Skill Gaps:</span>
                              <div className="flex flex-wrap gap-1">
                                {car.skillGaps.slice(0, 3).map((sg, i) => (
                                  <Badge key={i} variant="warning" className="text-[10px]">
                                    {sg}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                          <Link href={`/careers/${carId}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="primary" size="md" className="w-full font-bold text-xs gap-1">
                              Details <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant={isCompared ? 'secondary' : 'outline'}
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(carId);
                            }}
                            className="font-bold text-xs"
                          >
                            {isCompared ? '✓' : '+ Compare'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SIDE-BY-SIDE CAREER COMPARISON DRAWER */}
        {compareIds.length > 0 && (
          <div className="pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-900">Side-by-Side Career Comparison Engine</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCompareIds([])} className="text-xs text-slate-500">
                Clear Comparison ({compareIds.length})
              </Button>
            </div>

            {isComparing ? (
              <div className="p-6 text-center text-xs font-semibold text-indigo-600 bg-white border border-slate-200 rounded-2xl animate-pulse">
                Comparing career paths against your skill matrix...
              </div>
            ) : comparisonData && comparisonData.length > 0 ? (
              <Card className="p-6 bg-white border-slate-200 shadow-lg rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-400 uppercase tracking-wider">Metric</th>
                      {comparisonData.map(c => (
                        <th key={c.careerId} className="p-3 font-extrabold text-slate-900 text-sm">{c.careerTitle}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-bold text-slate-600">AI Match Score</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-extrabold text-indigo-600 text-sm">{c.score}% Fit</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-600">AI Confidence</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-bold text-slate-700">
                          <Badge variant={c.confidence === 'HIGH' ? 'ai' : 'secondary'}>{c.confidence}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-600">Transition Effort</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-semibold text-slate-800">{c.transitionEffort} ({c.estimatedLearningHours} hrs)</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-600">Skill Overlap</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-semibold text-emerald-700">{c.overlapCount} Skills Matched</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-600">Missing Skills</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-medium text-amber-700">
                          {c.missingSkills.slice(0, 3).join(', ')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-600">Career Risks</td>
                      {comparisonData.map(c => (
                        <td key={c.careerId} className="p-3 font-medium text-slate-600">
                          {c.careerRisks?.[0] || 'Standard transition effort.'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
