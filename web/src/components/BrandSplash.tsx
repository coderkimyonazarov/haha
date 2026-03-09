import BrandMotionLogo from "./BrandMotionLogo";

type BrandSplashProps = {
  message?: string;
  compact?: boolean;
};

export default function BrandSplash({ message = "Preparing your Sypev workspace...", compact = false }: BrandSplashProps) {
  return (
    <div
      className={compact ? "flex min-h-[260px] items-center justify-center" : "flex min-h-screen items-center justify-center"}
      role="status"
      aria-live="polite"
    >
      <div className="brand-frame mx-auto flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        <BrandMotionLogo className="w-52" alt="Sypev loading animation" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
