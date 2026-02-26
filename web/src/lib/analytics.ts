import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_PUBLIC_GA_ID;

export const initGA = () => {
  if (!GA_ID) {
    // GA_ID not configured — analytics disabled silently
    return;
  }

  // Inject script if not already present
  if (
    !document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`,
    )
  ) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }
};

export const logPageView = (path: string) => {
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
  });
};

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    logPageView(location.pathname + location.search);
  }, [location]);
};
