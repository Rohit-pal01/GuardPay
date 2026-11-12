import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'gp-input flex h-11 w-full rounded-2xl border border-white/20 bg-[#1a1a1d]/90 px-4 py-2 text-sm text-white placeholder:text-[#8e8e8e] focus-visible:outline-none focus-visible:border-white/60 focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

