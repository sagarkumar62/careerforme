import { UserCheck, Sparkles, Target, Compass } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: UserCheck,
      title: 'Build Your Profile',
      description: 'Tell Career For Me about your current skills, experience, interests, learning preferences, and weekly hours.'
    },
    {
      number: '02',
      icon: Sparkles,
      title: 'AI Analysis & Matching',
      description: 'Our AI engine compares your profile against thousands of real industry career requirements and skill models.'
    },
    {
      number: '03',
      icon: Target,
      title: 'Skill Gap Breakdown',
      description: 'Instantly view your match score, exact missing competencies, high-priority learning gaps, and estimated timeline.'
    },
    {
      number: '04',
      icon: Compass,
      title: 'Adaptive Learning Roadmap',
      description: 'Follow a step-by-step milestone path with curated resources that automatically adapts as you complete items.'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">Continuous Career Navigation</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How Career For Me Works</p>
          <p className="text-slate-600 text-base">A simple 4-step intelligent journey designed to eliminate guesswork from your career growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} className="p-6 relative group hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-200 transition-colors">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
