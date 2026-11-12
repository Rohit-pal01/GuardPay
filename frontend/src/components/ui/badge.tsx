import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/20 bg-[#28282a] text-[#e5e5e5]',
        allow: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
        needs_approval: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
        deny: 'border-red-400/40 bg-red-500/15 text-red-300',
        outline: 'border-white/30 bg-transparent text-white/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

