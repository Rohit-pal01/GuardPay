import React from 'react';

interface VideoBackgroundProps {
  dimmed?: boolean;
}

export function VideoBackground({ dimmed = false }: VideoBackgroundProps) {
  return (
    <div className="bg-video-layer" aria-hidden="true">
      <video className="bg-video" autoPlay muted loop playsInline>
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
          type="video/mp4"
        />
      </video>
      {dimmed && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/70 to-black/92" />
      )}
    </div>
  );
}

