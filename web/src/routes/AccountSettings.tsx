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
import { Label } from "../components/ui/label";
import {
  getGoogleOAuthErrorMessage,
  getGoogleOAuthErrorMessageFromUrl,
} from "../lib/authErrors";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import Page from "../components/Page";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Palette,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
  X,
  Plus,
  ArrowRight,
  Info,
  Smartphone,
  ShieldAlert
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
    <Page className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* ── Hero Section ────────────────────────────────────── */}
      <section className="glow-hero p-8 sm:p-10 relative overflow-hidden" data-animate="fade">
        <div className="relative z-10 space-y-4">
          <div className="nova-badge">
            <ShieldCheck className="h-3 w-3" />
            Security & Identity
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Account <span className="text-gradient">Hub</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            Manage your digital identity, linked providers, and system aesthetic. All your preferences in one unified command center.
          </p>
        </div>
      </section>

      {/* ── Layout Grid ─────────────────────────────────────── */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        
        {/* Left Column: Visuals & Interests */}
        <div className="space-y-8">
          
          {/* Appearance Panel */}
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="flex items-center gap-3 mb-8 border-b border-border/40 pb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">System Aesthetic</h2>
            </div>
            
            <div className="space-y-8">
              {/* Theme Selector */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Interface Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["light", "dark", "system"] as Theme[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={`h-12 rounded-xl border flex items-center justify-center font-bold capitalize transition-all ${
                        theme === mode
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {mode === "system" ? <Sparkles className="h-4 w-4 mr-2" /> : null}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Persona Selector */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Visual Persona</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PERSONA_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setPersona(item.value)}
                      className={`group p-4 rounded-2xl border text-left transition-all ${
                        persona === item.value
                          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                          : "border-border/60 bg-background/40 hover:border-primary/40"
                      }`}
                    >
                      <p className={`font-bold ${persona === item.value ? 'text-primary' : 'text-foreground'}`}>
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">
                        {item.helper}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent & Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Accent Hue</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((item) => (
                      <button
                        key={item}
                        onClick={() => setAccent(item)}
                        className={`h-8 px-4 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all ${
                          accent === item
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={funCardEnabled}
                      onChange={(e) => setFunCardEnabled(e.target.checked)}
                    />
                    <div className={`h-6 w-11 rounded-full transition-colors ${funCardEnabled ? 'bg-primary' : 'bg-muted/40'}`} />
                    <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${funCardEnabled ? 'translate-x-5 shadow-lg' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Fun Cards</span>
                </label>
              </div>

              <div className="pt-6 border-t border-border/40">
                <button 
                  onClick={handleSaveAppearance} 
                  disabled={savingAppearance}
                  className="btn-nova w-full sm:w-auto h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingAppearance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Aesthetic
                </button>
              </div>
            </div>
          </div>

          {/* Interests Panel */}
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Intellectual Passions</h2>
              </div>
              <div className="stat-chip py-1 px-3">
                <span className="text-[10px] font-bold text-primary">{interests.length}/8</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`h-10 px-6 rounded-2xl border text-xs font-bold capitalize transition-all flex items-center gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {interest}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={handleSaveInterests} 
              disabled={savingInterests}
              className="btn-nova w-full sm:w-auto h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingInterests ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sync Interests
            </button>
          </div>
        </div>

        {/* Right Column: Identity & Providers */}
        <div className="space-y-8">
          
          {/* Username Control */}
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="flex items-center gap-3 mb-8 border-b border-border/40 pb-4">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <UserRoundPen className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Identity</h2>
            </div>
            
            <form onSubmit={handleSaveUsername} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Global Alias</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    className="h-12 bg-background/50 border-border/60 focus:border-primary rounded-xl"
                    value={username}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    placeholder="Enter your new username..."
                  />
                  <button 
                    type="submit" 
                    className="btn-nova h-12 px-6 rounded-xl font-bold shrink-0 disabled:opacity-50"
                    disabled={savingUsername || !username.trim() || username.trim() === user?.username}
                  >
                    {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground ml-1">This is how you appear on leaderboards and in-app communications.</p>
              </div>
            </form>
          </div>

          {/* Linked Providers */}
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="flex items-center gap-3 mb-8 border-b border-border/40 pb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Security Gates</h2>
            </div>

            {loadingProviders ? (
              <div className="py-10 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">Validating Sessions...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {(["email", "google", "telegram"] as ProviderKey[]).map((provider) => {
                  const linked = providers.find((row) => row.provider === provider);
                  return (
                    <div
                      key={provider}
                      className="p-4 rounded-2xl border border-border/60 bg-background/40 group hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            linked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/30 text-muted-foreground'
                          }`}>
                            {provider === 'email' ? <Send className="h-4 w-4" /> : provider === 'google' ? <ShieldCheck className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold capitalize">{provider} Authentication</div>
                            <div className="text-[10px] text-muted-foreground">Provider Layer</div>
                          </div>
                        </div>
                        {linked && (
                          <div className="stat-chip py-1 px-3 bg-emerald-500/10 border-emerald-500/20">
                            <span className="text-[10px] font-black uppercase text-emerald-600">Active</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        {provider === "telegram" && !linked ? (
                          <div id="telegram-link-container" className="h-11 overflow-hidden" />
                        ) : provider === "google" && !linked ? (
                          <button
                            onClick={handleLinkGoogle}
                            disabled={linkingGoogle}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-2"
                          >
                            {linkingGoogle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Connect Google
                          </button>
                        ) : linked && provider !== "email" ? (
                          <button
                            onClick={() => handleUnlink(provider)}
                            disabled={unlinking === provider}
                            className="text-xs font-bold text-destructive hover:underline flex items-center gap-2"
                          >
                            {unlinking === provider ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            Terminate Link
                          </button>
                        ) : linked && provider === "email" ? (
                          <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 italic">
                            <Info className="h-3 w-3" />
                            Used for core recovery and system access.
                          </p>
                        ) : (
                          <p className="text-[10px] font-medium text-muted-foreground italic">Integration pending.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Telegram Bot Details */}
          <div className="nova-card p-6 sm:p-8" data-animate="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Send className="h-4 w-4" />
              </div>
              <h3 className="font-bold">Neural Sync (Telegram Bot)</h3>
            </div>
            
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
              <p className="text-xs text-foreground/80 leading-relaxed">
                Connect your Telegram account to receive instant SAT performance alerts, deadline reminders, and AI-curated study material via our neural bot.
              </p>
              
              {telegramInfo?.enabled && telegramInfo.botUrl ? (
                <a 
                  href={telegramInfo.botUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Visit Your AI Bot
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <div className="flex items-center gap-2 text-xs text-destructive font-bold">
                  <ShieldAlert className="h-4 w-4" />
                  Integration Offline
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleCreateBotLinkToken}
                  disabled={creatingBotToken}
                  className="w-full h-10 rounded-xl border border-primary/40 bg-background/50 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingBotToken ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Generate Secure Access Link
                </button>
              </div>

              {botLinkToken && (
                <div className="space-y-3 pt-3 animate-element">
                  <div className="p-3 rounded-xl bg-background/80 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Token Key</span>
                      <button 
                        onClick={() => copyToClipboard(botLinkToken.token, "Token")}
                        className="hover:text-primary transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <code className="block text-[10px] font-mono break-all text-foreground/70">
                      {botLinkToken.token}
                    </code>
                  </div>

                  {botLinkToken.deepLink && (
                    <a
                      href={botLinkToken.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-nova w-full h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      Initialize Bot Session
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <p className="text-[9px] text-center text-muted-foreground italic">
                    Universal access token. Expires soon.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Page>
  );
}
