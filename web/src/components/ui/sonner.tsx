import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={4200}
      toastOptions={{
        className: "border border-border/70 bg-card text-card-foreground",
      }}
    />
  );
}
