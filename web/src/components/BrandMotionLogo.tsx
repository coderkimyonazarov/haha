import React from "react";

import { cn } from "../lib/utils";

type BrandMotionLogoProps = {
  className?: string;
  alt?: string;
  decorative?: boolean;
};

function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Respect data-saving mode on mobile browsers.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const saveData = Boolean(connection?.saveData);

  return prefersReducedMotion || saveData;
}

export default function BrandMotionLogo({
  className,
  alt = "Sypev animated logo",
  decorative = false,
}: BrandMotionLogoProps) {
  const [allowMotion, setAllowMotion] = React.useState(false);
  const [useGifFallback, setUseGifFallback] = React.useState(false);

  React.useEffect(() => {
    setAllowMotion(!shouldReduceMotion());
  }, []);

  if (!allowMotion) {
    return (
      <img
        src="/brand/sypev-logo.png"
        alt={decorative ? "" : alt}
        aria-hidden={decorative}
        className={cn("h-auto w-44 object-contain", className)}
        loading="lazy"
      />
    );
  }

  if (useGifFallback) {
    return (
      <img
        src="/brand/sypev-logo-animated.gif"
        alt={decorative ? "" : alt}
        aria-hidden={decorative}
        className={cn("h-auto w-44 object-contain", className)}
        loading="lazy"
      />
    );
  }

  return (
    <video
      className={cn("h-auto w-44 object-contain", className)}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster="/brand/sypev-logo.png"
      onError={() => setUseGifFallback(true)}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative}
    >
      <source src="/brand/sypev-logo-animated.mp4" type="video/mp4" />
      <img
        src="/brand/sypev-logo-animated.gif"
        alt={decorative ? "" : alt}
        aria-hidden={decorative}
        className={cn("h-auto w-44 object-contain", className)}
        loading="lazy"
      />
    </video>
  );
}
