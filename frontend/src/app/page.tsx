import React from 'react';
import { VideoBackground } from '@/components/layout/video-background';
import { SiteHeader } from '@/components/layout/site-header';
import { HeroSection } from '@/components/layout/hero-section';
import { StatsFooter } from '@/components/layout/stats-footer';
import { ProjectOverview } from '@/components/layout/project-overview';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <VideoBackground />

      <div className="first-viewport">
        <SiteHeader />
        <HeroSection />
        <StatsFooter />
      </div>

      <ProjectOverview />
    </main>
  );
}
