'use client';

import { Bot, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function AssistantSpotlight() {
  const { user } = useAuth();
  const onboardingHref = user ? '/onboarding' : '/register';

  const prompts = [
    "What should I learn next?",
    "Why is AI Engineering a good fit for me?",
    "How can I improve my Python skills?",
    "Give me a real project for ML practice"
  ];

  return (
    <section id="assistant" className="py-20 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Visual Chat Simulation */}
          <div className="order-2 lg:order-1">
            <Card className="p-6 bg-slate-900 text-white rounded-2xl shadow-2xl border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">CareerPath AI</h3>
                    <p className="text-[11px] text-indigo-300">Your Personal AI Career Mentor</p>
                  </div>
                </div>
                <Badge variant="ai" className="bg-indigo-950 text-indigo-300 border-indigo-800">Online</Badge>
              </div>

              {/* Chat Message Snippets */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl max-w-[85%] text-slate-200">
                  "Based on your profile, you're 75% through Phase 2. Ready for **Linear Regression Basics**?"
                </div>
                <div className="bg-indigo-600 p-3 rounded-xl max-w-[80%] ml-auto text-white font-medium">
                  "Can you suggest a quick hands-on project to practice gradient descent?"
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl max-w-[90%] text-slate-200 space-y-2">
                  <p>Here is a 45-minute exercise: <strong>Build Gradient Descent from scratch in NumPy</strong>.</p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between">
                    <span>Interactive Lab #4</span>
                    <button className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[11px] font-bold">
                      Add to Roadmap
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Prompts */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 mb-2 font-medium">Example Prompts:</p>
                <div className="flex flex-wrap gap-1.5">
                  {prompts.map((p) => (
                    <span key={p} className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer transition-colors">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Text */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
              <Bot className="h-3.5 w-3.5" />
              <span>AI Career Mentor</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              An AI coach that understands <span className="text-indigo-600">your entire context</span>.
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Unlike generic chatbots, CareerPath AI is connected directly to your learner profile, active goals, skill gap scores, and roadmap phase. Ask for advice, practice projects, resource explanations, or next steps anytime.
            </p>
            <div>
              <Link href={onboardingHref}>
                <Button size="md" variant="primary" className="gap-2">
                  Try CareerPath AI <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
