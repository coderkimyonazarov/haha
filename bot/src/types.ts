import type { Context, SessionFlavor } from "grammy";

export type LinkedUser = {
  id: string;
  email: string | null;
  name: string;
  username: string | null;
  needsUsername: boolean;
  needsOnboarding: boolean;
  profile: {
    gender: string | null;
    birthYear: number | null;
    country: string | null;
    targetMajor: string | null;
    satMath: number | null;
    satReadingWriting: number | null;
    satTotal: number | null;
    interests: string[];
  };
  preferences: {
    theme: string;
    persona: string;
    vibe: string;
    accent: string;
    funCardEnabled: boolean;
  };
  providers: string[];
};

export type BotDashboard = {
  linked: true;
  user: LinkedUser;
  plan: {
    today: string[];
    tasks: string[];
    deadlines: Array<{ name: string; deadline: string }>;
  };
  quickLinks: {
    dashboard: string;
    account: string;
    tutor: string;
    onboarding: string;
  };
};

export type BotSession = {
  aiMode: boolean;
  pendingLinkToken: boolean;
  lastQuizId: number | null;
  lastActionAt: number;
  lastBrandAnimationAt: number;
};

export type BotContext = Context & SessionFlavor<BotSession>;

export type QuizItem = {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};
