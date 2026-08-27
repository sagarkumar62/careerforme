import Link from 'next/link';
import { Compass, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Visual Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <Compass className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight">CAREER FOR ME</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-800/50 border border-indigo-700/60 px-3 py-1 text-xs text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Career Navigator</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Stop guessing your next career move.
          </h2>

          <p className="text-indigo-200 text-sm leading-relaxed">
            Get personalized career recommendations, precision skill gap analysis, and adaptive learning roadmaps built around your life.
          </p>

          <div className="space-y-3 pt-4 text-xs font-medium text-indigo-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>AI-matched career fit scores</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Weekly commitment adaptive roadmaps</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Personalized AI Career Mentor</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-indigo-400">
          © {new Date().getFullYear()} Career For Me. Intelligent Career Growth.
        </div>
      </div>

      {/* Right Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Compass className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base text-slate-900">CAREER FOR ME</span>
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-500 text-sm">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
