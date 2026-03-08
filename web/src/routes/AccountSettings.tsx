import React from "react";
import { getProviders, unlinkProvider, setUsername, linkTelegram, type AuthProvider } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import {
  ShieldCheck,
  Fingerprint,
  Mail,
  Send,
  Chrome,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import gsap from "gsap";
import { supabase } from "../lib/supabase";

const PROVIDER_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  email: {
    label: "Email & Password",
    icon: <Mail className="w-5 h-5" />,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  telegram: {
    label: "Telegram",
    icon: <Send className="w-5 h-5" />,
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  google: {
    label: "Google Account",
    icon: <Chrome className="w-5 h-5" />,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  phone: {
    label: "Phone Number",
    icon: <Smartphone className="w-5 h-5" />,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
};

export default function AccountSettings() {
  const { user, refresh } = useAuth();
  const [providers, setProviders] = React.useState<AuthProvider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unlinking, setUnlinking] = React.useState<string | null>(null);
  const [newUsername, setNewUsername] = React.useState(user?.username || "");
  const [savingUsername, setSavingUsername] = React.useState(false);
  const [linkingGoogle, setLinkingGoogle] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const fetchProviders = React.useCallback(async () => {
    try {
      const res = await getProviders();
      setProviders(res);
    } catch {
      toast.error("Failed to load account providers");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  React.useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        ".animate-setting",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [loading]);

  // ── Global Handlers for Linking ──
  React.useEffect(() => {
    (window as any).onTelegramLink = async (tUser: Record<string, unknown>) => {
      try {
        await linkTelegram(tUser);
        toast.success("Telegram mapped to identity successfully");
        await fetchProviders();
        await refresh();
      } catch (err: any) {
        toast.error(err?.message || "Telegram linking failed");
      }
    };
  }, [fetchProviders, refresh]);

  // ── Render Dynamic Widgets ──
  React.useEffect(() => {
    if (loading) return;
    
    // Telegram
    if (!providers.find(p => p.provider === "telegram")) {
      const tContainer = document.getElementById("telegram-link-container");
      if (tContainer && !tContainer.hasChildNodes()) {
        const botUsername = (window as any).__TELEGRAM_BOT_USERNAME;
        if (botUsername) {
          const script = document.createElement("script");
          script.src = "https://telegram.org/js/telegram-widget.js?22";
          script.setAttribute("data-telegram-login", botUsername);
          script.setAttribute("data-size", "medium");
          script.setAttribute("data-radius", "8");
          script.setAttribute("data-onauth", "onTelegramLink(user)");
          script.setAttribute("data-request-access", "write");
          tContainer.appendChild(script);
        }
      }
    }

  }, [loading, providers]);

  const handleLinkGoogle = async () => {
    if (linkingGoogle) return;
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
      toast.success("Redirecting to Google to complete linking…");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("google linking via supabase oauth failed", err);
      toast.error(err?.message || "Google linking failed");
      setLinkingGoogle(false);
    }
  };

  const handleUnlink = async (provider: string) => {
    const info = PROVIDER_INFO[provider];
    if (
      !confirm(
        `Are you sure you want to unlink your ${info?.label || provider}? You might lose access if this is your last login method.`
      )
    ) {
      return;
    }
    setUnlinking(provider);
    try {
      await unlinkProvider(provider);
      toast.success(`${info?.label || provider} unlinked successfully`);
      await fetchProviders();
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to unlink provider");
    } finally {
      setUnlinking(null);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername === user?.username) return;
    setSavingUsername(true);
    try {
      await setUsername(newUsername);
      toast.success("Identity updated successfully");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8 pb-20" ref={containerRef}>
      
      <div className="animate-setting space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Identity Hub</h1>
        <p className="text-muted-foreground text-lg">
          Manage your secure footprint and access layers securely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Identity & Security */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity Card */}
          <div className="glass-panel rounded-3xl overflow-hidden animate-setting relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px] -z-10" />
            <div className="p-6 md:p-8 bg-card/40 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    Core Identity
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">Your unique handle on Test_Bro</p>
                </div>
                {user?.isVerified ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Target
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              <form onSubmit={handleUpdateUsername} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">Username</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-medium">
                        @
                      </span>
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="your_handle"
                        className="pl-10 h-11 bg-background/50 focus:bg-background transition-colors font-mono"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-11 px-6 font-semibold"
                      disabled={savingUsername || newUsername === user?.username}
                    >
                      {savingUsername ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground pb-2">
                    Only letters, numbers, and underscores allowed. 3-30 chars.
                  </p>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Display Name
                  </p>
                  <p className="font-semibold text-lg">{user?.name}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Primary Data
                  </p>
                  <p className="font-semibold text-lg">{user?.email || "Encrypted"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security / Providers Card */}
          <div className="glass-panel rounded-3xl overflow-hidden animate-setting">
            <div className="p-6 md:p-8 bg-card/40 border-b border-border/50">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Access Keys
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Attach biometrics and social endpoints to lock down your identity.
              </p>
            </div>
            
            <div className="p-6 md:p-8 space-y-4">
              {(["email", "telegram", "google", "phone"] as const).map(
                (providerKey) => {
                  const linked = providers.find((p) => p.provider === providerKey);
                  const info = PROVIDER_INFO[providerKey];

                  return (
                    <div
                      key={providerKey}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                        linked ? "bg-background/80 shadow-sm border-border" : "bg-card/30 border-dashed border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl border ${
                            linked ? info.color : "text-muted-foreground bg-muted/50 border-border/50"
                          }`}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-base">{info.label}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">
                            {linked
                              ? `Secured on ${new Date(linked.linkedAt).toLocaleDateString()}`
                              : providerKey === "phone" ? "Coming very soon" : "Available for linkage"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {linked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive font-semibold hover:bg-destructive/10 -ml-2 sm:ml-0"
                            disabled={unlinking === providerKey}
                            onClick={() => handleUnlink(providerKey)}
                          >
                            {unlinking === providerKey ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Revoke Access"
                            )}
                          </Button>
                        ) : (
                          <div className="h-9 flex items-center -ml-2 sm:ml-0">
                            {providerKey === "telegram" ? (
                              <div id="telegram-link-container" className="scale-90 origin-left sm:origin-right" />
                            ) : providerKey === "google" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-semibold rounded-lg"
                                disabled={linkingGoogle}
                                onClick={handleLinkGoogle}
                              >
                                {linkingGoogle ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Link with Google"
                                )}
                              </Button>
                            ) : providerKey === "phone" ? (
                              <span className="text-xs font-bold text-muted-foreground uppercase px-2">Pending</span>
                            ) : (
                              <Button variant="outline" size="sm" className="font-semibold rounded-lg">
                                Link
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border-primary/20 bg-primary/5 animate-setting">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
              Protocol Upgrade
            </h4>
            <div className="space-y-4">
              <p className="text-sm font-medium text-primary/80 leading-relaxed">
                Sync <strong>Telegram</strong> or <strong>Google</strong> now to enable persistent background sessions and encrypted one-click entry anywhere.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex gap-4 items-start animate-setting backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-500">Air-Gap Policy</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-500/80 leading-relaxed font-medium">
                Linking endpoints grants cryptographic handshake pairing only. We NEVER retrieve contact lists or post on your behalf.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

