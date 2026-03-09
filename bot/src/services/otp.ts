export function formatDeadlineLine(name: string, deadline: string): string {
  return `• <b>${name}</b> — <code>${deadline}</code>`;
}

export function buildMotivation(name?: string): string {
  const safe = name && name.trim().length > 0 ? name.trim() : "Do'stim";
  const lines = [
    `🔥 ${safe}, today is a compounding day.`,
    "Small disciplined actions now create big admissions outcomes later.",
    "Stay consistent and keep your edge.",
  ];
  return lines.join("\n");
}
