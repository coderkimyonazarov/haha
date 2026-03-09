import React from "react";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Sonner
      position={isMobile ? "top-center" : "top-right"}
      closeButton
      duration={4200}
      toastOptions={{
        className: "border border-border/70 bg-card/95 text-card-foreground shadow-[0_16px_36px_-28px_hsl(var(--foreground)/0.45)]",
      }}
    />
  );
}
