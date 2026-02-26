import { randomUUID } from "crypto";
import { supabase } from "../db/supabase";
import type {
  BotUser,
  IdentifierType,
  IdentityResult,
  LinkedIdentifier,
} from "../types";
import { normalisePhone } from "../types";

// ────────────────────────────────────────────────────────────────────────────
// identifyUser
// Looks up a user by any identifier type. Returns full user + their linked IDs
// or null if not found.
// ────────────────────────────────────────────────────────────────────────────
export async function identifyUser(
  value: string,
  type: IdentifierType,
): Promise<IdentityResult | null> {
  const normalised =
    type === "phone" ? normalisePhone(value) : value.toLowerCase().trim();

  const { data: linked } = await supabase
    .from("linked_identifiers")
    .select("*")
    .eq("type", type)
    .eq("value", normalised)
    .single();

  if (!linked) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", linked.user_id)
    .single();

  if (!user) return null;

  const { data: allLinked } = await supabase
    .from("linked_identifiers")
    .select("*")
    .eq("user_id", user.id);

  return {
    user: mapUser(user),
    linkedIds: (allLinked ?? []).map(mapLinked),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// identifyByTelegramId
// Shortcut for Telegram-native lookup (called on every message)
// ────────────────────────────────────────────────────────────────────────────
export async function identifyByTelegramId(
  telegramId: string | number,
): Promise<IdentityResult | null> {
  return identifyUser(String(telegramId), "telegram_id");
}

// ────────────────────────────────────────────────────────────────────────────
// registerUser
// Creates a new user + initial linked identifier.
// Returns the new user.
// ────────────────────────────────────────────────────────────────────────────
export async function registerUser(params: {
  name: string;
  passwordHash: string | null;
  identifierType: IdentifierType;
  identifierValue: string;
  isVerified?: boolean;
}): Promise<BotUser> {
  const userId = randomUUID();
  const normValue =
    params.identifierType === "phone"
      ? normalisePhone(params.identifierValue)
      : params.identifierValue.toLowerCase().trim();

  // Insert user
  const { data: user, error: userErr } = await supabase
    .from("users")
    .insert({
      id: userId,
      name: params.name,
      password_hash: params.passwordHash,
      is_verified: params.isVerified ?? false,
    })
    .select()
    .single();

  if (userErr || !user)
    throw new Error(`User insert failed: ${userErr?.message}`);

  // Insert linked identifier
  const { error: idErr } = await supabase.from("linked_identifiers").insert({
    user_id: userId,
    type: params.identifierType,
    value: normValue,
    is_verified: params.isVerified ?? false,
  });
  if (idErr)
    throw new Error(`Linked identifier insert failed: ${idErr.message}`);

  return mapUser(user);
}

// ────────────────────────────────────────────────────────────────────────────
// linkIdentifier
// Adds a new identifier to an existing user (multi-account linking).
// ────────────────────────────────────────────────────────────────────────────
export async function linkIdentifier(
  userId: string,
  type: IdentifierType,
  value: string,
  isVerified = false,
): Promise<void> {
  const normValue =
    type === "phone" ? normalisePhone(value) : value.toLowerCase().trim();

  // Check if already taken by another user
  const { data: existing } = await supabase
    .from("linked_identifiers")
    .select("user_id")
    .eq("type", type)
    .eq("value", normValue)
    .single();

  if (existing && existing.user_id !== userId) {
    throw new Error(`This ${type} is already linked to another account.`);
  }

  if (existing && existing.user_id === userId) return; // already linked, idempotent

  const { error } = await supabase.from("linked_identifiers").insert({
    user_id: userId,
    type,
    value: normValue,
    is_verified: isVerified,
  });
  if (error) throw new Error(`Link insert failed: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// markIdentifierVerified
// ────────────────────────────────────────────────────────────────────────────
export async function markIdentifierVerified(
  userId: string,
  type: IdentifierType,
): Promise<void> {
  await supabase
    .from("linked_identifiers")
    .update({ is_verified: true })
    .eq("user_id", userId)
    .eq("type", type);

  // If user has at least one verified identifier, mark account verified
  await supabase.from("users").update({ is_verified: true }).eq("id", userId);
}

// ────────────────────────────────────────────────────────────────────────────
// getUserById
// ────────────────────────────────────────────────────────────────────────────
export async function getUserById(userId: string): Promise<BotUser | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data ? mapUser(data) : null;
}

// ────────────────────────────────────────────────────────────────────────────
// Mappers (snake_case DB → camelCase TS)
// ────────────────────────────────────────────────────────────────────────────
function mapUser(row: any): BotUser {
  return {
    id: row.id,
    name: row.name,
    passwordHash: row.password_hash ?? null,
    isVerified: row.is_verified,
    isAdmin: row.is_admin,
    isBanned: row.is_banned,
    createdAt: row.created_at,
  };
}

function mapLinked(row: any): LinkedIdentifier {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    value: row.value,
    isVerified: row.is_verified,
    linkedAt: row.linked_at,
  };
}
