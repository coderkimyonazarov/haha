import { InlineKeyboard } from "grammy";

export function guestKeyboard(webUrl: string) {
  return new InlineKeyboard()
    .url("Open Sypev Web", `${webUrl}/login`)
    .row()
    .text("Link Account", "prompt_link")
    .text("Help", "open_help");
}

export function dashboardKeyboard(links: {
  dashboard: string;
  account: string;
  tutor: string;
  onboarding: string;
}) {
  return new InlineKeyboard()
    .text("Refresh", "refresh_dashboard")
    .text("Profile", "open_profile")
    .row()
    .text("Today", "open_today")
    .text("Tasks", "open_tasks")
    .row()
    .text("Deadlines", "open_deadlines")
    .text("AI", "prompt_ai")
    .row()
    .url("Open Dashboard", links.dashboard)
    .url("Open Settings", links.account)
    .row()
    .url("Open Tutor", links.tutor);
}

export function profileKeyboard(accountUrl: string) {
  return new InlineKeyboard()
    .url("Edit in Web", accountUrl)
    .row()
    .text("Back to Dashboard", "refresh_dashboard")
    .text("Help", "open_help");
}

export function settingsKeyboard(links: { account: string; onboarding: string }) {
  return new InlineKeyboard()
    .url("Open Account Settings", links.account)
    .row()
    .url("Complete Onboarding", links.onboarding)
    .row()
    .text("Back", "refresh_dashboard");
}

export function quizKeyboard(quizId: number, optionsCount: number) {
  const keyboard = new InlineKeyboard();
  for (let i = 0; i < optionsCount; i += 1) {
    keyboard.text(String.fromCharCode(65 + i), `quiz:${quizId}:${i}`);
    if ((i + 1) % 2 === 0 && i < optionsCount - 1) {
      keyboard.row();
    }
  }
  return keyboard.row().text("New Quiz", "new_quiz");
}

export function helpKeyboard(webUrl: string) {
  return new InlineKeyboard()
    .url("Open Web App", `${webUrl}/dashboard`)
    .row()
    .text("Link Account", "prompt_link")
    .text("Ask AI", "prompt_ai");
}
