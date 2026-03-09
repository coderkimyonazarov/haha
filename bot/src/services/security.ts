import type { BotContext } from "../types";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function extractCommandArgument(ctx: BotContext): string {
  const text = ctx.message?.text ?? "";
  const parts = text.trim().split(/\s+/);
  if (parts.length <= 1) {
    return "";
  }
  return parts.slice(1).join(" ").trim();
}

export function parseStartPayload(ctx: BotContext): string {
  const text = ctx.message?.text ?? "";
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return "";
  }
  return parts.slice(1).join(" ").trim();
}

export function shortId(value: string): string {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function personaBadge(persona: string): string {
  switch (persona) {
    case "soft_cute":
      return "Soft / Cute";
    case "bold_dark":
      return "Bold / Dark";
    case "energetic_fun":
      return "Energetic / Fun";
    default:
      return "Clean / Minimal";
  }
}
