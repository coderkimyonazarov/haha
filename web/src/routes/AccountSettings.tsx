import React from "react";
import { getProviders, unlinkProvider, setUsername, type AuthProvider } from "../api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../lib/auth";
import Page from "../components/Page";
import { toast } from "sonner";
import {
  ShieldCheck,
  User,
  Fingerprint,
  Mail,
  Send,
  Chrome,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const PROVIDER_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  email: {
    label: "Email & Password",
    icon: <Mail className="w-5 h-5" />,
    color: "text-blue-500",
  },
  telegram: {
    label: "Telegram",
    icon: <Send className="w-5 h-5" />,
    color: "text-sky-500",
  },
  google: {
    label: "Google Account",
    icon: <Chrome className="w-5 h-5" />,
    color: "text-rose-500",
  },
  phone: {
    label: "Phone Number",
    icon: <Smartphone className="w-5 h-5" />,
    color: "text-emerald-500",
  },
};

export default function AccountSettings() {
  const { user, refresh } = useAuth();
  const [providers, setProviders] = React.useState<AuthProvider[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unlinking, setUnlinking] = React.useState<string | null>(null);
  const [newUsername, setNewUsername] = React.useState(user?.username || "");
  const [savingUsername, setSavingUsername] = React.useState(false);

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

  const handleUnlink = async (provider: string) => {
    const info = PROVIDER_INFO[provider];
    if (
      !confirm(
        `Are you sure you want to unlink your ${info?.label || provider}? You might lose access if this is your last login method.`,
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
      toast.success("Username updated successfully");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  if (loading) {
    return (
      <Page className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Page>
    );
  }

  return (
    <Page className="max-w-4xl mx-auto space-y-8 pb-12">
      <div data-animate="fade">
        <h1 className="text-4xl font-bold tracking-tight">Account Hub</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Manage your security, identity, and connected experiences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Identity */}
        <div className="md:col-span-2 space-y-8">
          {/* Identity Card */}
          <Card className="overflow-hidden border-2" data-animate="card">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    Identity
                  </CardTitle>
                  <CardDescription>Your unique handle on Test_Bro</CardDescription>
                </div>
                {user?.isVerified ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                        @
                      </span>
                      <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="your_handle"
                        className="pl-8 font-mono"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={savingUsername || newUsername === user?.username}
                    >
                      {savingUsername ? "Saving..." : "Update"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only letters, numbers, and underscores allowed. 3-30 chars.
                  </p>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Display Name
                  </p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Primary Email
                  </p>
                  <p className="font-medium">{user?.email || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security / Providers Card */}
          <Card className="border-2" data-animate="card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Security & Access
              </CardTitle>
              <CardDescription>
                Manage linked accounts. Add multiple ways to log in so you never
                get locked out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(["email", "telegram", "google", "phone"] as const).map(
                (providerKey) => {
                  const linked = providers.find((p) => p.provider === providerKey);
                  const info = PROVIDER_INFO[providerKey];

                  return (
                    <div
                      key={providerKey}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        linked ? "bg-card shadow-sm" : "bg-muted/30 border-dashed"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2.5 rounded-lg bg-background border ${
                            linked ? info.color : "text-muted-foreground"
                          }`}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {linked
                              ? `Linked on ${new Date(
                                  linked.linkedAt,
                                ).toLocaleDateString()}`
                              : "Not connected"}
                          </p>
                        </div>
                      </div>

                      {linked ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={unlinking === providerKey}
                          onClick={() => handleUnlink(providerKey)}
                        >
                          {unlinking === providerKey ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Unlink"
                          )}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          Link
                        </Button>
                      )}
                    </div>
                  );
                },
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Meta Info */}
        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-primary/80 leading-relaxed">
                Add <b>Telegram</b> or <b>Google</b> to enjoy one-click biometric
                logins across all your devices.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/90">
                Level Up Security
              </Button>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">Privacy Notice</p>
              <p className="text-[11px] text-amber-800 leading-normal">
                Linking accounts allows us to unify your data. We never post to
                your social accounts or share your credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

