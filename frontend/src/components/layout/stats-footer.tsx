'use client';

import React, { useEffect, useRef, useState } from 'react';

interface StatMetric {
  glyph: string;
  target: number;
  suffix: string;
  decimals: number;
  label: string;
  delay: string;
}

const STATS: StatMetric[] = [
  { glyph: '<', target: 120, suffix: 'ms', decimals: 0, label: 'Policy Evaluation', delay: '0.5s' },
  { glyph: '%', target: 100, suffix: '%', decimals: 0, label: 'Code-Enforced Caps', delay: '0.58s' },
  { glyph: '*', target: 4, suffix: ' rds', decimals: 0, label: 'Max Negotiation', delay: '0.66s' },
  { glyph: '#', target: 14, suffix: ' evts', decimals: 0, label: 'Live Audit Trail', delay: '0.74s' },
];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StatsFooter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<number[]>(() => STATS.map((s) => s.target));
  const startedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValues(STATS.map((s) => s.target));
      return;
    }

    setValues(STATS.map(() => 0));

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || startedRef.current) return;
        startedRef.current = true;
        observer.disconnect();

        const startOrigin = performance.now();

        STATS.forEach((stat, index) => {
          const duration = 1500 + index * 80;
          const offset = 480 + index * 90;

          const tick = (now: number) => {
            const elapsed = now - startOrigin - offset;
            if (elapsed < 0) {
              requestAnimationFrame(tick);
              return;
            }
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            const current = stat.target * eased;

            setValues((prev) => {
              const next = [...prev];
              next[index] = current;
              return next;
            });

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };

          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={containerRef}
      aria-label="Platform Guarantees"
      className="mx-auto grid w-full max-w-[920px] shrink-0 grid-cols-2 gap-y-5 gap-x-4 pt-4 min-[721px]:grid-cols-4"
    >
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="anim flex flex-col items-center text-center"
          style={{ '--d': stat.delay } as React.CSSProperties}
        >
          <span
            aria-hidden="true"
            className="font-display text-[clamp(22px,3vw,33px)] leading-none text-white"
          >
            {stat.glyph}
          </span>
          <span className="mt-1.5 text-[clamp(18px,2.2vw,26px)] font-semibold tracking-[-0.025em] text-white tabular-nums">
            {values[i].toFixed(stat.decimals)}
            {stat.suffix}
          </span>
          <span className="mt-0.5 text-[clamp(11px,1.2vw,12.5px)] text-[#8e8e8e]">
            {stat.label}
          </span>
        </div>
      ))}
    </footer>
  );
}

