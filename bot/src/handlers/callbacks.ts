import type { BotContext } from "../types";
import {
  commandDashboard,
  commandDeadlines,
  commandHelp,
  commandProfile,
  commandQuiz,
  commandSettings,
  commandTasks,
  commandToday,
  findQuizById,
} from "./commands";
import { escapeHtml } from "../services/security";

export async function handleCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data ?? "";

  if (!data) {
    return;
  }

  if (data.startsWith("quiz:")) {
    await ctx.answerCallbackQuery();
    const [, quizIdRaw, answerRaw] = data.split(":");
    const quizId = Number(quizIdRaw);
    const answer = Number(answerRaw);

    const quiz = findQuizById(quizId);
    if (!quiz) {
      await ctx.reply("Quiz expired. Use /quiz for a new one.");
      return;
    }

    const correct = answer === quiz.answer;
    const selectedLabel = quiz.options[answer] ?? "Unknown";
    const correctLabel = quiz.options[quiz.answer] ?? "Unknown";

    await ctx.reply(
      [
        correct ? "✅ <b>Correct.</b>" : "❌ <b>Not quite.</b>",
        "",
        `You selected: <b>${escapeHtml(selectedLabel)}</b>`,
        `Correct answer: <b>${escapeHtml(correctLabel)}</b>`,
        "",
        `💡 ${escapeHtml(quiz.explanation)}`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );
    return;
  }

  switch (data) {
    case "refresh_dashboard":
      await ctx.answerCallbackQuery();
      await commandDashboard(ctx);
      return;
    case "open_profile":
      await ctx.answerCallbackQuery();
      await commandProfile(ctx);
      return;
    case "open_today":
      await ctx.answerCallbackQuery();
      await commandToday(ctx);
      return;
    case "open_tasks":
      await ctx.answerCallbackQuery();
      await commandTasks(ctx);
      return;
    case "open_deadlines":
      await ctx.answerCallbackQuery();
      await commandDeadlines(ctx);
      return;
    case "prompt_ai":
      await ctx.answerCallbackQuery();
      ctx.session.aiMode = true;
      await ctx.reply(
        "<b>AI mode enabled.</b> Send your question now.",
        { parse_mode: "HTML" },
      );
      return;
    case "prompt_link":
      await ctx.answerCallbackQuery();
      ctx.session.pendingLinkToken = true;
      await ctx.reply(
        "Send your secure link token from web account settings.",
      );
      return;
    case "open_help":
      await ctx.answerCallbackQuery();
      await commandHelp(ctx);
      return;
    case "new_quiz":
      await ctx.answerCallbackQuery();
      await commandQuiz(ctx);
      return;
    case "open_settings":
      await ctx.answerCallbackQuery();
      await commandSettings(ctx);
      return;
    default:
      await ctx.answerCallbackQuery("Unknown action");
  }
}
