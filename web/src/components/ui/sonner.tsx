import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      closeButton
      duration={4200}
      toastOptions={{
        className: "border border-border/70 bg-card/95 text-card-foreground shadow-[0_16px_36px_-28px_hsl(var(--foreground)/0.45)]",
      }}
    />
  );
}
