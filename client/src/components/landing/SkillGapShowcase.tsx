import { BarChart3, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function SkillGapShowcase() {
  const skillGaps = [
    { name: 'Python Programming', current: 'Beginner', required: 'Advanced', percent: 30, status: 'Needs Improvement' },
    { name: 'Applied Mathematics & Statistics', current: 'Beginner', required: 'Intermediate', percent: 45, status: 'Needs Improvement' },
    { name: 'Machine Learning Algorithms', current: 'None', required: 'Intermediate', percent: 0, status: 'Missing' },
    { name: 'Vector DBs & RAG Architecture', current: 'None', required: 'Intermediate', percent: 0, status: 'Missing' },
    { name: 'JavaScript & React', current: 'Advanced', required: 'Intermediate', percent: 100, status: 'Strong' }
  ];

  return (
    <section id="skill-gap" className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Precision Skill Gap Diagnostics</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Know exactly what to learn.<br />
              <span className="text-indigo-600">Zero wasted effort.</span>
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Career For Me compares your current proficiency against market demands. It categorizes your skill set into <strong className="text-slate-900">Strong</strong>, <strong className="text-slate-900">Needs Improvement</strong>, and <strong className="text-slate-900">Missing</strong> skills so you only invest time in high-priority gaps.
            </p>

            {/* Adaptive Banner Highlight */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Adaptive Path Adjustment</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  "If you fall behind or spend extra time on a core topic, our AI dynamically recalibrates your timeline instead of breaking your plan."
                </p>
              </div>
            </div>
          </div>

          {/* Right Visual Card */}
          <div>
            <Card className="p-6 sm:p-8 bg-white border-slate-200 shadow-xl rounded-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Skill Gap Diagnosis</h3>
                  <p className="text-xs text-slate-500">Target Career: AI Engineer</p>
                </div>
                <Badge variant="ai">AI Analysis Complete</Badge>
              </div>

              <div className="space-y-4">
                {skillGaps.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 flex items-center gap-1.5">
                        {item.status === 'Strong' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : item.status === 'Needs Improvement' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-300" />
                        )}
                        {item.name}
                      </span>
                      <span className="text-slate-500">
                        {item.current} → <span className="text-indigo-600 font-bold">{item.required}</span>
                      </span>
                    </div>
                    <Progress
                      value={item.percent}
                      barColor={
                        item.status === 'Strong'
                          ? 'bg-emerald-500'
                          : item.status === 'Needs Improvement'
                          ? 'bg-amber-500'
                          : 'bg-slate-200'
                      }
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
