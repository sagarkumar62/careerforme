import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <Logo href="/" size="sm" showBadge={true} className="brightness-125" />

        <p className="text-slate-500 text-center md:text-left">
          © {new Date().getFullYear()} Career For Me Inc. AI-Powered Personalized Career & Learning Path SaaS.
        </p>

        <div className="flex items-center gap-6 text-slate-400 font-medium">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Support</Link>
        </div>
      </div>
    </footer>
  );
}
