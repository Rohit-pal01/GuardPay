'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', match: (p) => p === '/' },
  {
    label: 'Agent Flow',
    href: '/agent',
    match: (p) => p.startsWith('/agent') || p.startsWith('/receipt'),
  },
  { label: 'Mandate', href: '/mandate', match: (p) => p.startsWith('/mandate') },
  { label: 'Audit', href: '/audit', match: (p) => p.startsWith('/audit') },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 720) setMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  return (
    <header className="nav-shell relative z-30 mx-auto w-full max-w-[720px] shrink-0">
      <div className="hidden min-[721px]:flex items-center justify-center gap-[clamp(18px,2.8vw,28px)]">
        <Link
          href="/"
          aria-label="GaurdPay Home"
          className="nav-shadow grid h-[clamp(40px,4.4vw,46px)] w-[clamp(40px,4.4vw,46px)] shrink-0 place-items-center rounded-full bg-white transition-transform duration-200 hover:scale-[1.04]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt=""
            width={52}
            height={52}
            className="h-[72%] w-[72%] object-contain"
          />
        </Link>

        <nav
          aria-label="Primary Navigation"
          className="nav-shadow flex h-[clamp(44px,5.2vw,48px)] max-w-[460px] flex-1 items-center justify-around rounded-full bg-white px-2 py-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active ? 'true' : 'false'}
                className="nav-link-item flex h-full items-center px-3 text-[clamp(13px,1.4vw,15px)] font-medium tracking-[-0.01em]"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center justify-between min-[721px]:hidden">
        <Link
          href="/"
          aria-label="GaurdPay Home"
          className="nav-shadow grid h-12 w-12 place-items-center rounded-full bg-white transition-transform duration-200 hover:scale-[1.04]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt=""
            width={52}
            height={52}
            className="h-[72%] w-[72%] object-contain"
          />
        </Link>

        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-sheet"
          onClick={() => setMenuOpen((prev) => !prev)}
          className={cn(
            'nav-shadow relative z-40 flex h-12 w-12 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full transition-colors duration-200',
            menuOpen ? 'bg-white' : 'bg-[#28282a]'
          )}
        >
          <span
            className={cn(
              'h-[1.5px] w-[18px] rounded-full transition-transform duration-200',
              menuOpen ? 'translate-y-[6.5px] rotate-45 bg-black' : 'bg-white'
            )}
          />
          <span
            className={cn(
              'h-[1.5px] w-[18px] rounded-full transition-opacity duration-200',
              menuOpen ? 'opacity-0 bg-black' : 'bg-white'
            )}
          />
          <span
            className={cn(
              'h-[1.5px] w-[18px] rounded-full transition-transform duration-200',
              menuOpen ? '-translate-y-[6.5px] -rotate-45 bg-black' : 'bg-white'
            )}
          />
        </button>
      </div>

      {menuOpen && (
        <div
          className="mobile-overlay-anim fixed inset-0 z-30 flex flex-col items-center bg-black/62 px-4 pt-20 backdrop-blur-[6px] min-[721px]:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            id="mobile-nav-sheet"
            className="mobile-sheet-anim w-full max-w-[380px] rounded-[28px] bg-white px-[18px] pt-[22px] pb-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setMenuOpen(false)}
                    className="nav-link-item mobile-nav-link flex h-12 items-center justify-center rounded-2xl text-[15px] font-medium tracking-[-0.01em]"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
