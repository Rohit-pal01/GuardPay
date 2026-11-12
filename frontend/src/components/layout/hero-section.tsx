import React from 'react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      aria-label="GaurdPay Overview"
      className="mx-auto flex w-full max-w-[900px] flex-1 flex-col items-center justify-center py-4 text-center"
    >
      <div
        className="trust-row anim mb-[clamp(16px,2.5vh,26px)] inline-flex items-center"
        style={{ '--d': '0.05s' } as React.CSSProperties}
      >
        <div className="trust-avatar trust-avatar-1" title="PayPal Orders v2">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#111]">
            <i
              className="fa-brands fa-paypal"
              style={{ fontSize: 'calc(var(--trust-size) * 0.34)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          className="trust-avatar trust-avatar-overlap trust-avatar-2"
          title="Code-Enforced Spending Mandate"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#111]">
            <i
              className="fa-solid fa-shield-halved"
              style={{ fontSize: 'calc(var(--trust-size) * 0.34)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          className="trust-avatar trust-avatar-overlap trust-avatar-3"
          title="Agentic Commerce & Negotiation"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#111]">
            <i
              className="fa-solid fa-robot"
              style={{ fontSize: 'calc(var(--trust-size) * 0.34)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="trust-pill flex items-center text-[12px] min-[721px]:text-[clamp(12px,1.4vw,13.5px)] font-medium">
          Code-Enforced Mandate &bull; PayPal Orders v2
        </div>
      </div>

      <h1 className="hero-headline select-none">
        <span className="hero-headline-line text-red-500" style={{ animationDelay: '0.12s' }}>
          GaurdPay
        </span>
        <span className="hero-headline-line" style={{ animationDelay: '0.3s' }}>
          Code Governs Spend
        </span>
      </h1>

      <p className="hero-subhead anim mt-4" style={{ '--d': '0.28s' } as React.CSSProperties}>
        Tell GaurdPay what to buy. It searches real products, negotiates prices,
        enforces your Mandate in code, and settles through PayPal.
      </p>

      <div className="anim-pulse mt-7" style={{ '--d': '0.4s' } as React.CSSProperties}>
        <Link
          href="/agent"
          className="hero-cta-glow inline-flex items-center justify-center rounded-full bg-white px-[clamp(22px,3vw,28px)] py-[clamp(11px,1.6vh,13px)] text-[clamp(13.5px,1.5vw,14.5px)] font-semibold text-black"
        >
          Start Shopping
        </Link>
      </div>
    </section>
  );
}
