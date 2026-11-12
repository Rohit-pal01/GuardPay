import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { VideoBackground } from '@/components/layout/video-background';
import { SiteHeader } from '@/components/layout/site-header';
import { ShopWorkspace } from '@/components/shop-workspace';

export default function AgentPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <VideoBackground dimmed />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1220px] flex-col gap-6 px-[clamp(14px,3vw,32px)] py-[clamp(16px,2.4vh,28px)]">
        <SiteHeader />

        <div className="space-y-5 pb-16">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Home
            </Link>
            <h1 className="font-display mt-2 text-3xl text-white sm:text-4xl">
              Live Agent Shopping Flow
            </h1>
            <p className="mt-1 text-sm text-[#c8c8c8]">
              Request &rarr; Top 3 Candidates &rarr; Seller Negotiation &rarr; Mandate Policy Check &rarr; Human Approval &rarr; PayPal Sandbox Receipt &amp; Audit.
            </p>
          </div>

          <ShopWorkspace />
        </div>
      </div>
    </main>
  );
}

