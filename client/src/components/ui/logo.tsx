'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
  href?: string;
}

export function Logo({ size = 'md', showBadge = true, className = '', href = '/' }: LogoProps) {
  const sizeMap = {
    sm: { img: 28, text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { img: 36, text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { img: 44, text: 'text-lg', badge: 'text-[11px] px-2 py-0.5' },
  };

  const dim = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 group cursor-pointer ${className}`}>
      <div className="relative flex items-center justify-center rounded-xl overflow-hidden shadow-md ring-1 ring-indigo-500/20 group-hover:scale-105 group-hover:shadow-indigo-500/20 transition-all duration-300">
        <Image
          src="/logo.jpg"
          alt="Career Pathfinder Logo"
          width={dim.img}
          height={dim.img}
          className="object-cover rounded-xl"
          priority
        />
      </div>
      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 ${dim.text}`}>
          PATHFINDER
          {showBadge && (
            <span className={`inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold shadow-xs ${dim.badge}`}>
              <Sparkles className="mr-0.5 h-2.5 w-2.5 animate-pulse" /> AI
            </span>
          )}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
