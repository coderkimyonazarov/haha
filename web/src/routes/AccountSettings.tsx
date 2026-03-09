import React from "react";
import {
  TelegramBotLinkToken,
  Persona,
  TelegramConfig,
  Theme,
  createTelegramBotLinkToken,
  getProviders,
  getTelegramConfig,
  linkTelegram,
  setUsername,
  unlinkProvider,
  updatePersonalization,
  updatePreferences,
  type AuthProvider as ProviderItem,
} from "../api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  getGoogleOAuthErrorMessage,
  getGoogleOAuthErrorMessageFromUrl,
} from "../lib/authErrors";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
} from "lucide-react";

const INTEREST_OPTIONS = [
  "programming",
  "games",
  "music",
  "anime",
  "sport",
  "design",
  "memes",
  "science",
  "business",
  "books",
];

const PERSONA_OPTIONS: Array<{ value: Persona; label: string; helper: string }> = [
  { value: "soft_cute", label: "Soft / Cute", helper: "Warm and rounded mood" },
  { value: "bold_dark", label: "Bold / Dark", helper: "Sharper contrast and depth" },
  { value: "clean_minimal", label: "Clean / Minimal", helper: "Quiet and focused UI" },
  { value: "energetic_fun", label: "Energetic / Fun", helper: "Dynamic highlights and rhythm" },
];

const ACCENTS = ["sky", "violet", "rose", "amber", "emerald"] as const;

type TelegramWindow = Window & {
  onTelegramLink?: (user: Record<string, unknown>) => Promise<void>;
};
type ProviderKey = "email" | "google" | "telegram";

export default function AccountSettings() {
  const { user, preferences, profile, refresh } = useAuth();
  const [providers, setProviders] = React.useState<ProviderItem[]>([]);
  const [loadingProviders, setLoadingProviders] = React.useState(true);
  const [savingAppearance, setSavingAppearance] = React.useState(false);
  const [savingInterests, setSavingInterests] = React.useState(false);
  const [savingUsername, setSavingUsername] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState<string | null>(null);
  const [linkingGoogle, setLinkingGoogle] = React.useState(false);
  const [creatingBotToken, setCreatingBotToken] = React.useState(false);
  const [botLinkToken, setBotLinkToken] = React.useState<TelegramBotLinkToken | null>(null);
  const [telegramInfo, setTelegramInfo] = React.useState<{
    enabled: TelegramConfig["enabled"];
    botUsername: TelegramConfig["botUsername"];
    botUrl?: TelegramConfig["botUrl"];
    requiredDomain?: TelegramConfig["requiredDomain"];
    currentHost?: TelegramConfig["currentHost"];
    domainMatch?: TelegramConfig["domainMatch"];
    error: TelegramConfig["error"];
  } | null>(null);

  const [username, setUsernameValue] = React.useState(user?.username ?? "");
  const [theme, setTheme] = React.useState<Theme>(preferences?.theme ?? "system");
  const [persona, setPersona] = React.useState<Persona>(preferences?.persona ?? "clean_minimal");
  const [accent, setAccent] = React.useState(preferences?.accent ?? "sky");
  const [interests, setInterests] = React.useState<string[]>(profile?.interests ?? []);
  const [funCardEnabled, setFunCardEnabled] = React.useState(
    preferences?.funCardEnabled ?? true,
  );
  const oauthErrorHandledRef = React.useRef(false);

  React.useEffect(() => {
    setTheme(preferences?.theme ?? "system");
    setPersona(preferences?.persona ?? "clean_minimal");
    setAccent(preferences?.accent ?? "sky");
    setFunCardEnabled(preferences?.funCardEnabled ?? true);
  }, [preferences]);

  React.useEffect(() => {
    setInterests(profile?.interests ?? []);
  }, [profile]);

  React.useEffect(() => {
    if (oauthErrorHandledRef.current) {
      return;
    }

    const oauthErrorMessage = getGoogleOAuthErrorMessageFromUrl(window.location);
    if (!oauthErrorMessage) {
      return;
    }

    oauthErrorHandledRef.current = true;
    toast.error(oauthErrorMessage);

    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchProviders = React.useCallback(async () => {
    try {
      const [providerRows, telegramConfig] = await Promise.all([
        getProviders(),
        getTelegramConfig(),
      ]);
      setProviders(providerRows);
      setTelegramInfo(telegramConfig);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load provider settings");
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  React.useEffect(() => {
    (window as TelegramWindow).onTelegramLink = async (tUser: Record<string, unknown>) => {
      try {
        await linkTelegram(tUser);
        toast.success("Telegram linked successfully");
        await fetchProviders();
        await refresh();
      } catch (error: any) {
        toast.error(error?.message || "Telegram linking failed");
      }
    };
  }, [fetchProviders, refresh]);

  React.useEffect(() => {
    if (!telegramInfo?.enabled) {
      return;
    }

    const telegramLinked = providers.some((item) => item.provider === "telegram");
    if (telegramLinked) {
      return;
    }

    const container = document.getElementById("telegram-link-container");
    if (!container) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", telegramInfo.botUsername ?? "");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramLink(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    container.replaceChildren();
    container.appendChild(script);

    return () => {
      container.querySelector("script")?.remove();
    };
  }, [providers, telegramInfo]);

  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    try {
      await updatePreferences({
        theme,
        accent,
        persona,
        funCardEnabled,
      });
      await refresh();
      toast.success("Appearance preferences saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save appearance");
    } finally {
      setSavingAppearance(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((item) => item !== interest);
      }
      if (prev.length >= 8) {
        return prev;
      }
      return [...prev, interest];
    });
  };

  const handleSaveInterests = async () => {
    if (interests.length === 0) {
      toast.error("Pick at least one interest");
      return;
    }
    setSavingInterests(true);
    try {
      await updatePersonalization({
        interests,
      });
      await refresh();
      toast.success("Interests updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save interests");
    } finally {
      setSavingInterests(false);
    }
  };

  const handleSaveUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || username.trim() === user?.username) {
      return;
    }
    setSavingUsername(true);
    try {
      await setUsername(username.trim());
      await refresh();
      toast.success("Username updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (linkingGoogle) {
      return;
    }
    setLinkingGoogle(true);
    try {
      const redirectUrl = `${window.location.origin}/account`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast.error(getGoogleOAuthErrorMessage(error, "link"));
      setLinkingGoogle(false);
    }
  };

  const handleUnlink = async (provider: string) => {
    setUnlinking(provider);
    try {
      await unlinkProvider(provider);
      await fetchProviders();
      await refresh();
      toast.success(`${provider} unlinked`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to unlink provider");
    } finally {
      setUnlinking(null);
    }
  };

  const handleCreateBotLinkToken = async () => {
    if (creatingBotToken) {
      return;
    }

    setCreatingBotToken(true);
    try {
      const tokenData = await createTelegramBotLinkToken();
      setBotLinkToken(tokenData);
      toast.success("Telegram bot link generated.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate bot link token");
    } finally {
      setCreatingBotToken(false);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-14 sm:space-y-7 sm:pb-20">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account Settings</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Personalization + identity controls</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your theme/persona, interests, and linked providers without breaking unified account
          mapping.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {(["light", "dark", "system"] as Theme[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize ${
                      theme === mode
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/70 hover:border-primary/30"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {PERSONA_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPersona(item.value)}
                    className={`rounded-2xl border p-4 text-left ${
                      persona === item.value
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/70 hover:border-primary/30"
                    }`}
                  >
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAccent(item)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                      accent === item
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/70 hover:border-primary/30"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={funCardEnabled}
                  onChange={(event) => setFunCardEnabled(event.target.checked)}
                />
                Enable dashboard fun cards
              </label>

              <Button className="w-full sm:w-auto" onClick={handleSaveAppearance} disabled={savingAppearance}>
                {savingAppearance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save appearance
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Interests</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                    interests.includes(interest)
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/70 hover:border-primary/30"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            <Button className="mt-4 w-full sm:w-auto" onClick={handleSaveInterests} disabled={savingInterests}>
              {savingInterests ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save interests
            </Button>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserRoundPen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Username</h2>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSaveUsername}>
              <Input
                value={username}
                onChange={(event) => setUsernameValue(event.target.value)}
                placeholder="username"
              />
              <Button type="submit" className="sm:min-w-[142px]" disabled={savingUsername}>
                {savingUsername ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save username
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Linked providers</h2>
            </div>
            {loadingProviders ? (
              <div className="py-8 text-center text-muted-foreground">Loading providers...</div>
            ) : (
              <div className="space-y-3">
                {(["email", "google", "telegram"] as ProviderKey[]).map((provider) => {
                  const linked = providers.find((row) => row.provider === provider);
                  return (
                    <div
                      key={provider}
                      className="rounded-2xl border border-border/70 bg-background/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold capitalize">{provider}</div>
                        {linked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Linked
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2">
                        {provider === "telegram" && !linked ? (
                          telegramInfo?.enabled ? (
                            <div id="telegram-link-container" className="min-h-11 overflow-x-auto" />
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {telegramInfo?.domainMatch === false &&
                              telegramInfo?.requiredDomain &&
                              telegramInfo?.currentHost
                                ? `Bot domain invalid: BotFather /setdomain -> ${telegramInfo.requiredDomain} (current: ${telegramInfo.currentHost})`
                                : telegramInfo?.error || "Telegram widget unavailable."}
                            </p>
                          )
                        ) : provider === "google" && !linked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLinkGoogle}
                            disabled={linkingGoogle}
                          >
                            {linkingGoogle ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Link Google
                          </Button>
                        ) : linked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleUnlink(provider)}
                            disabled={unlinking === provider}
                          >
                            {unlinking === provider ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Unlink
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not linked</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Telegram bot</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {telegramInfo?.enabled && telegramInfo.botUrl ? (
                <>
                  Bot is configured. Open{" "}
                  <a className="text-primary underline" href={telegramInfo.botUrl} target="_blank" rel="noreferrer">
                    @{telegramInfo.botUsername}
                  </a>{" "}
                  to continue bot actions.
                </>
              ) : (
                telegramInfo?.domainMatch === false &&
                telegramInfo?.requiredDomain &&
                telegramInfo?.currentHost
                  ? `Bot domain invalid. Set BotFather /setdomain to ${telegramInfo.requiredDomain}. Current host: ${telegramInfo.currentHost}.`
                  : telegramInfo?.error || "Bot is not configured."
              )}
            </p>

            <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Secure Bot Linking
              </p>
              <p className="text-xs text-muted-foreground">
                Generate one-time token and open Telegram bot with ready deep link. Token expires in 15 minutes.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCreateBotLinkToken}
                disabled={creatingBotToken}
              >
                {creatingBotToken ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate secure bot link
              </Button>

              {botLinkToken ? (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">Token</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(botLinkToken.token, "Token")}
                      className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs hover:bg-background"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <code className="block break-all rounded-md bg-background px-2 py-1 text-[11px]">
                    {botLinkToken.token}
                  </code>

                  {botLinkToken.deepLink ? (
                    <a
                      href={botLinkToken.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95"
                    >
                      Open Telegram Bot
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}

                  <p className="text-[11px] text-muted-foreground">
                    Expires: {new Date(botLinkToken.expiresAt).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
