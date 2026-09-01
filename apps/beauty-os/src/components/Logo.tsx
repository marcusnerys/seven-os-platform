import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: "scale-50 origin-left",
    md: "scale-75 origin-left",
    lg: "scale-100",
  };

  return (
    <div className={cn("flex flex-col items-start select-none", sizes[size], className)} id="brand-logo">
      <div className="flex items-baseline font-brush leading-none">
        <span className="text-ios-text-primary text-5xl">Les#</span>
        <span className="text-ios-gold text-5xl">@not</span>
      </div>
      <div className="w-full h-[1px] bg-ios-gold my-2 opacity-80" />
      <div className="font-futuristic text-[11px] uppercase tracking-[0.2em] text-ios-gold opacity-80 whitespace-nowrap">
        Automatize. Organize. Prospere.
      </div>
    </div>
  );
}
