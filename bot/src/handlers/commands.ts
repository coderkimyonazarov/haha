import type { BotContext, BotDashboard, QuizItem } from "../types";
import { config } from "../config";
import {
  askBotAi,
  getBotDashboard,
  linkWithToken,
  resolveLinkedUser,
} from "../services/auth";
import {
  escapeHtml,
  extractCommandArgument,
  parseStartPayload,
  personaBadge,
  shortId,
} from "../services/security";
import { buildMotivation, formatDeadlineLine } from "../services/otp";
import { sendBrandAnimation } from "../services/brand";
import {
  dashboardKeyboard,
  guestKeyboard,
  helpKeyboard,
  profileKeyboard,
  quizKeyboard,
  settingsKeyboard,
} from "../keyboards/auth";

const QUIZ_BANK: QuizItem[] = [
  {
    id: 1,
    question: "SAT Reading: What should be your first move on a dense passage?",
    options: [
      "Read all options first",
      "Skim intro + first/last sentence each paragraph",
      "Jump directly to hardest question",
      "Translate each sentence word-by-word",
    ],
    answer: 1,
    explanation:
      "Skimming structure first gives you map + speed. Then target evidence questions precisely.",
  },
  {
    id: 2,
    question: "Admissions: strongest activity description strategy?",
    options: [
      "List many generic tasks",
      "Focus only on awards",
      "Show impact with concrete numbers and role",
      "Use formal complicated words",
    ],
    answer: 2,
    explanation:
      "Admissions officers value measurable impact and ownership more than buzzwords.",
  },
  {
    id: 3,
    question: "SAT Math timing: if stuck >75 seconds on one question, best action?",
    options: [
      "Keep grinding until solved",
      "Mark, skip, and return later",
      "Random guess and submit test",
      "Restart section",
    ],
    answer: 1,
    explanation:
      "Protect section timing. Skip strategically, secure easier points, then come back.",
  },
];

function telegramIdentity(ctx: BotContext) {
  return {
    telegramUserId: String(ctx.from?.id ?? ""),
    telegramUsername: ctx.from?.username,
  };
}

function guessAiContext(message: string): "SAT" | "Admissions" | "General" {
  const lower = message.toLowerCase();
  if (lower.includes("sat") || lower.includes("math") || lower.includes("reading")) {
    return "SAT";
  }
  if (
    lower.includes("admission") ||
    lower.includes("university") ||
    lower.includes("essay") ||
    lower.includes("scholarship")
  ) {
    return "Admissions";
  }
  return "General";
}

function formatDashboardText(payload: BotDashboard): string {
  const user = payload.user;
  const sat = user.profile.satTotal ?? "not set";
  const major = user.profile.targetMajor ?? "not set";
  const interests = user.profile.interests.length > 0 ? user.profile.interests.join(", ") : "not set";

  return [
    "<b>Sypev Command Center</b>",
    "",
    `👤 <b>${escapeHtml(user.name)}</b> (${shortId(user.id)})`,
    `🔖 Username: <code>${escapeHtml(user.username ?? "not set")}</code>`,
    `🎯 Target major: <b>${escapeHtml(String(major))}</b>`,
    `📈 SAT total: <b>${sat}</b>`,
    `🎨 Persona: <b>${escapeHtml(personaBadge(user.preferences.persona))}</b>`,
    `💡 Interests: ${escapeHtml(interests)}`,
    "",
    "Use the buttons below for quick actions.",
  ].join("\n");
}

async function ensureLinkedDashboard(ctx: BotContext): Promise<BotDashboard | null> {
  const identity = telegramIdentity(ctx);
  if (!identity.telegramUserId) {
    await ctx.reply("Unable to read Telegram identity.");
    return null;
  }

  try {
    const payload = await getBotDashboard(identity.telegramUserId, identity.telegramUsername);
    return payload;
  } catch (error: any) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("not linked")) {
      await ctx.reply(
        "Your Telegram account is not linked yet. Use /link and paste your secure token from web account settings.",
        {
          parse_mode: "HTML",
          reply_markup: guestKeyboard(config.BOT_WEB_APP_URL),
        },
      );
      return null;
    }

    await ctx.reply("⚠️ Service is temporarily busy. Please try again.");
    return null;
  }
}

export async function performLinkWithTokenFlow(ctx: BotContext, rawToken: string) {
  const token = rawToken.trim();
  if (!token) {
    await ctx.reply("Please send a valid link token.");
    return;
  }

  const identity = telegramIdentity(ctx);
  try {
    await linkWithToken(identity.telegramUserId, token, identity.telegramUsername);
    ctx.session.pendingLinkToken = false;
    await sendBrandAnimation(ctx, {
      caption: "<b>Sypev x Telegram connected.</b>",
      force: true,
    });
    await ctx.reply("<b>Telegram linked successfully.</b>\nBot and web now use one unified account.", {
      parse_mode: "HTML",
    });
    await commandDashboard(ctx);
  } catch (error: any) {
    await ctx.reply(
      `Link failed: ${escapeHtml(error?.message || "invalid or expired token")}\n\nGenerate a fresh token in web account settings and try again.`,
      {
        parse_mode: "HTML",
        reply_markup: guestKeyboard(config.BOT_WEB_APP_URL),
      },
    );
  }
}

export async function commandStart(ctx: BotContext) {
  const payload = parseStartPayload(ctx);
  if (payload.startsWith("link_")) {
    await performLinkWithTokenFlow(ctx, payload.slice(5));
    return;
  }

  const identity = telegramIdentity(ctx);
  try {
    const linked = await resolveLinkedUser(identity.telegramUserId, identity.telegramUsername);
    if (linked.linked) {
      await sendBrandAnimation(ctx, {
        caption: "<b>Welcome back to Sypev.</b>",
      });
      await ctx.reply(
        `Welcome back, <b>${escapeHtml(linked.user.name)}</b>.\nYour study workspace is ready.`,
        {
          parse_mode: "HTML",
        },
      );
      await commandDashboard(ctx);
      return;
    }
  } catch {
    // graceful fallback to guest message below
  }

  await sendBrandAnimation(ctx, {
    caption: "<b>Sypev</b> • SAT & admissions command center",
  });
  await ctx.reply(
    [
      "<b>Welcome to Sypev Bot</b>",
      "",
      "A focused SAT + admissions assistant connected to your Sypev account.",
      "",
      "1) Open web app",
      "2) Sign in",
      "3) Generate secure Telegram link token in Account Settings",
      "4) Use /link here",
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: guestKeyboard(config.BOT_WEB_APP_URL),
    },
  );
}

export async function commandLink(ctx: BotContext) {
  const arg = extractCommandArgument(ctx);
  if (arg) {
    await performLinkWithTokenFlow(ctx, arg);
    return;
  }

  ctx.session.pendingLinkToken = true;
  await ctx.reply(
    [
      "<b>Link Telegram Account</b>",
      "",
      "Send your one-time token from Sypev Web → Account Settings.",
      "Example:",
      "<code>/link aBcDeF...token</code>",
      "",
      "Or paste the raw token in next message.",
    ].join("\n"),
    { parse_mode: "HTML" },
  );
}

export async function commandProfile(ctx: BotContext) {
  const identity = telegramIdentity(ctx);

  try {
    const linked = await resolveLinkedUser(identity.telegramUserId, identity.telegramUsername);
    if (!linked.linked) {
      await ctx.reply("Your Telegram is not linked. Use /link.", {
        reply_markup: guestKeyboard(config.BOT_WEB_APP_URL),
      });
      return;
    }

    const user = linked.user;
    const profileText = [
      "<b>Profile Snapshot</b>",
      "",
      `Name: <b>${escapeHtml(user.name)}</b>`,
      `Email: <code>${escapeHtml(user.email ?? "not set")}</code>`,
      `Username: <code>${escapeHtml(user.username ?? "not set")}</code>`,
      `Country: <b>${escapeHtml(user.profile.country ?? "not set")}</b>`,
      `SAT Total: <b>${user.profile.satTotal ?? "not set"}</b>`,
      `Persona: <b>${escapeHtml(personaBadge(user.preferences.persona))}</b>`,
      `Theme: <b>${escapeHtml(user.preferences.theme)}</b>`,
      `Providers: <code>${escapeHtml(user.providers.join(", ") || "none")}</code>`,
    ].join("\n");

    await ctx.reply(profileText, {
      parse_mode: "HTML",
      reply_markup: profileKeyboard(`${config.BOT_WEB_APP_URL}/account`),
    });
  } catch {
    await ctx.reply("⚠️ Failed to load profile. Please try again.");
  }
}

export async function commandDashboard(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  await ctx.reply(formatDashboardText(payload), {
    parse_mode: "HTML",
    reply_markup: dashboardKeyboard(payload.quickLinks),
  });
}

export async function commandPlan(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  const lines = payload.plan.today.map((task, index) => `${index + 1}. ${escapeHtml(task)}`);
  const motivation = buildMotivation(payload.user.name);

  await ctx.reply(
    [
      "<b>Strategic Plan</b>",
      "",
      ...lines,
      "",
      escapeHtml(motivation),
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: dashboardKeyboard(payload.quickLinks),
    },
  );
}

export async function commandToday(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  const lines = payload.plan.today.map((task, index) => `• ${index + 1}) ${escapeHtml(task)}`);
  await ctx.reply(["<b>Today Focus</b>", "", ...lines].join("\n"), {
    parse_mode: "HTML",
    reply_markup: dashboardKeyboard(payload.quickLinks),
  });
}

export async function commandTasks(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  const lines = payload.plan.tasks.map((task, index) => `${index + 1}. ${escapeHtml(task)}`);
  await ctx.reply(["<b>Priority Tasks</b>", "", ...lines].join("\n"), {
    parse_mode: "HTML",
    reply_markup: dashboardKeyboard(payload.quickLinks),
  });
}

export async function commandDeadlines(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  if (payload.plan.deadlines.length === 0) {
    await ctx.reply(
      "<b>Deadlines</b>\n\nNo deadline data yet. Open web app and shortlist universities.",
      {
        parse_mode: "HTML",
        reply_markup: dashboardKeyboard(payload.quickLinks),
      },
    );
    return;
  }

  const lines = payload.plan.deadlines.map((item) =>
    formatDeadlineLine(escapeHtml(item.name), escapeHtml(item.deadline)),
  );

  await ctx.reply(["<b>Upcoming Deadlines</b>", "", ...lines].join("\n"), {
    parse_mode: "HTML",
    reply_markup: dashboardKeyboard(payload.quickLinks),
  });
}

export async function commandQuiz(ctx: BotContext) {
  const selected = QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
  ctx.session.lastQuizId = selected.id;

  const optionLines = selected.options.map((option, index) => {
    const tag = String.fromCharCode(65 + index);
    return `${tag}) ${escapeHtml(option)}`;
  });

  await ctx.reply(
    [
      "<b>Quick Quiz</b>",
      "",
      escapeHtml(selected.question),
      "",
      ...optionLines,
      "",
      "Choose the answer from buttons:",
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: quizKeyboard(selected.id, selected.options.length),
    },
  );
}

export async function commandAi(ctx: BotContext) {
  const arg = extractCommandArgument(ctx);
  if (!arg) {
    ctx.session.aiMode = true;
    await ctx.reply(
      "<b>AI mode is on.</b> Send your SAT/admissions question now.\nUse /dashboard to exit AI mode.",
      { parse_mode: "HTML" },
    );
    return;
  }

  await handleAiQuestion(ctx, arg);
}

async function handleAiQuestion(ctx: BotContext, question: string) {
  const identity = telegramIdentity(ctx);

  try {
    const response = await askBotAi({
      telegramUserId: identity.telegramUserId,
      telegramUsername: identity.telegramUsername,
      message: question,
      context: guessAiContext(question),
    });

    await ctx.reply(`<b>AI</b>\n\n${escapeHtml(response.reply)}`, {
      parse_mode: "HTML",
    });
  } catch (error: any) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("not linked")) {
      await ctx.reply("Please link your Telegram first with /link.");
      return;
    }
    if (message.includes("too many")) {
      await ctx.reply("AI limit reached. Please wait a bit and retry.");
      return;
    }
    await ctx.reply("⚠️ AI is temporarily unavailable. Please retry shortly.");
  }
}

export async function handleAiMessage(ctx: BotContext) {
  const text = (ctx.message as { text?: string } | undefined)?.text?.trim();
  if (!text || text.startsWith("/")) {
    return;
  }

  await handleAiQuestion(ctx, text);
}

export async function commandSettings(ctx: BotContext) {
  const payload = await ensureLinkedDashboard(ctx);
  if (!payload) {
    return;
  }

  await ctx.reply(
    "<b>Settings</b>\n\nManage persona, theme, interests, and provider links from web app.",
    {
      parse_mode: "HTML",
      reply_markup: settingsKeyboard(payload.quickLinks),
    },
  );
}

export async function commandHelp(ctx: BotContext) {
  await sendBrandAnimation(ctx, {
    caption: "<b>Sypev Bot</b> quick command guide",
  });

  const text = [
    "<b>Sypev Bot Commands</b>",
    "",
    "/start — open bot home",
    "/link — link Telegram to web account",
    "/profile — show profile snapshot",
    "/dashboard — personalized summary",
    "/plan — strategic action plan",
    "/today — today's focus",
    "/tasks — priority tasks",
    "/deadlines — upcoming deadlines",
    "/quiz — quick SAT/admissions quiz",
    "/ai <question> — ask AI assistant",
    "/settings — personalization shortcuts",
    "/help — command reference",
  ].join("\n");

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: helpKeyboard(config.BOT_WEB_APP_URL),
  });
}

export async function handlePendingLinkTokenMessage(ctx: BotContext) {
  const text = (ctx.message as { text?: string } | undefined)?.text?.trim();
  if (!ctx.session.pendingLinkToken || !text || text.startsWith("/")) {
    return false;
  }

  await performLinkWithTokenFlow(ctx, text);
  return true;
}

export function findQuizById(id: number): QuizItem | null {
  const found = QUIZ_BANK.find((item) => item.id === id);
  return found ?? null;
}
