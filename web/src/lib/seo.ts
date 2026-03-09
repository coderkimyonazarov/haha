type RouteSeo = {
  title: string;
  description: string;
};

const DEFAULT_SEO: RouteSeo = {
  title: "Sypev | SAT & Admissions Platform",
  description:
    "Sypev is a premium SAT and admissions platform with personalized planning, AI guidance, and Telegram integration.",
};

const ROUTE_SEO: Record<string, RouteSeo> = {
  "/login": {
    title: "Login | Sypev",
    description: "Sign in to Sypev with email, username, Google, or Telegram and continue your study workflow.",
  },
  "/register": {
    title: "Register | Sypev",
    description: "Create your Sypev account and unlock personalized SAT and admissions guidance.",
  },
  "/dashboard": {
    title: "Dashboard | Sypev",
    description:
      "Your personalized SAT and admissions dashboard with priorities, AI insights, and progress tracking.",
  },
  "/study/sat": {
    title: "SAT Study | Sypev",
    description:
      "Train SAT sections with focused drills, progress data, and actionable feedback on Sypev.",
  },
  "/admissions": {
    title: "Admissions | Sypev",
    description:
      "Plan your admissions path with university matching, timelines, and strategic recommendations.",
  },
  "/universities": {
    title: "Universities | Sypev",
    description:
      "Explore university profiles, requirements, deadlines, and relevant facts for your goals.",
  },
  "/tutor": {
    title: "AI Tutor | Sypev",
    description:
      "Get student-friendly SAT and admissions help from the Sypev AI assistant.",
  },
  "/account": {
    title: "Account Settings | Sypev",
    description:
      "Manage profile, personalization, linked identities, and Telegram bot integration.",
  },
  "/onboarding": {
    title: "Onboarding | Sypev",
    description:
      "Complete your profile to unlock a fully personalized Sypev learning workspace.",
  },
};

function ensureMetaTag(name: string, attribute: "name" | "property" = "name"): HTMLMetaElement {
  const selector = `meta[${attribute}="${name}"]`;
  const existing = document.head.querySelector(selector);
  if (existing && existing instanceof HTMLMetaElement) {
    return existing;
  }
  const meta = document.createElement("meta");
  meta.setAttribute(attribute, name);
  document.head.appendChild(meta);
  return meta;
}

function ensureCanonicalLink(): HTMLLinkElement {
  const existing = document.head.querySelector('link[rel="canonical"]');
  if (existing && existing instanceof HTMLLinkElement) {
    return existing;
  }
  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  document.head.appendChild(link);
  return link;
}

function resolveSeoForPath(pathname: string): RouteSeo {
  const direct = ROUTE_SEO[pathname];
  if (direct) return direct;

  if (pathname.startsWith("/universities/")) {
    return {
      title: "University Details | Sypev",
      description: "Detailed university requirements, facts, and admissions context on Sypev.",
    };
  }

  return DEFAULT_SEO;
}

export function applyRouteSeo(pathname: string) {
  const seo = resolveSeoForPath(pathname);
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${pathname}`;

  document.title = seo.title;

  ensureMetaTag("description").setAttribute("content", seo.description);
  ensureMetaTag("og:title", "property").setAttribute("content", seo.title);
  ensureMetaTag("og:description", "property").setAttribute("content", seo.description);
  ensureMetaTag("og:type", "property").setAttribute("content", "website");
  ensureMetaTag("og:url", "property").setAttribute("content", canonicalUrl);
  ensureMetaTag("twitter:title").setAttribute("content", seo.title);
  ensureMetaTag("twitter:description").setAttribute("content", seo.description);

  ensureCanonicalLink().setAttribute("href", canonicalUrl);
}
