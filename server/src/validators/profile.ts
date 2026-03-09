import { z } from "zod";

export const themeSchema = z.enum(["light", "dark", "system"]);
export const accentSchema = z.enum(["sky", "violet", "rose", "amber", "emerald"]);
export const vibeSchema = z.enum(["minimal", "playful", "bold"]);
export const personaSchema = z.enum([
  "soft_cute",
  "bold_dark",
  "clean_minimal",
  "energetic_fun",
]);
export const genderSchema = z.enum([
  "male",
  "female",
  "non_binary",
  "prefer_not_to_say",
]);

const interestItemSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_ -]+$/);

export const interestsSchema = z
  .array(interestItemSchema)
  .min(1)
  .max(12)
  .transform((items) => Array.from(new Set(items)));

export const profileUpdateSchema = z.object({
  grade: z.number().int().min(1).max(12).nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  target_major: z.string().max(120).nullable().optional(),
  sat_math: z.number().int().min(200).max(800).nullable().optional(),
  sat_reading_writing: z.number().int().min(200).max(800).nullable().optional(),
  ielts_score: z.number().min(0).max(9).nullable().optional(),
});

export const onboardingSaveSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  gender: genderSchema,
  birth_year: z.number().int().min(1950).max(new Date().getFullYear() - 10),
  interests: interestsSchema,
  persona: personaSchema,
  theme: themeSchema,
  accent: accentSchema.optional(),
});

export const personalizationUpdateSchema = z.object({
  interests: interestsSchema.optional(),
  persona: personaSchema.optional(),
  theme: themeSchema.optional(),
  accent: accentSchema.optional(),
  vibe: vibeSchema.optional(),
  fun_card_enabled: z.boolean().optional(),
});

