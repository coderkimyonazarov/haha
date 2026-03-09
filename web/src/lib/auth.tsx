import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import * as api from "../api";
import { User as AppUser, UserPreferences } from "../api";
import { applyTheme, normalizeThemeRuntime } from "./theme";
import { clearCustomAccessToken, getCustomAccessToken, setCustomAccessToken } from "../api/client";

interface AuthState {
  user: AppUser | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  needsUsername: boolean;
  preferences: UserPreferences | null;
  providers: { provider: string; linkedAt: number }[];
}

interface AuthContextValue extends AuthState {
  refreshProfile: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  setTelegramSession: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  needsUsername: false,
  preferences: null,
  providers: [],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const fetchProfileData = async (sessionUser: SupabaseUser | null, hasCustomToken: boolean) => {
    if (!sessionUser && !hasCustomToken) {
      setState((s) => ({
        ...s,
        user: null,
        session: null,
        profile: null,
        needsUsername: false,
        preferences: null,
        providers: [],
        loading: false,
      }));
      return;
    }

    try {
      const data = await api.me();
      if (data && data.user) {
        if (data.preferences) {
          applyTheme(
            normalizeThemeRuntime({
              theme: data.preferences.theme,
              accent: data.preferences.accent,
              vibe: data.preferences.vibe,
              persona: data.preferences.persona,
              gender: data.profile?.gender ?? "prefer_not_to_say",
            }),
          );
        }

        setState((s) => ({
          ...s,
          user: data.user,
          profile: data.profile,
          needsUsername: Boolean(data.user.needsUsername),
          preferences: data.preferences || null,
          providers: data.providers || [],
          loading: false,
        }));
      } else {
        setState((s) => ({ ...s, user: null, loading: false }));
      }
    } catch {
      setState((s) => ({
        ...s,
        user: null,
        profile: null,
        needsUsername: false,
        preferences: null,
        providers: [],
        loading: false,
      }));
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      const hasCustomToken = Boolean(getCustomAccessToken());

      if (session?.access_token) {
        clearCustomAccessToken();
      }

      setState((s) => ({ ...s, session }));
      fetchProfileData(session?.user ?? null, hasCustomToken);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info("[auth] state change", {
          event: _event,
          userId: session?.user?.id ?? null,
          provider: session?.user?.app_metadata?.provider ?? null,
        });
      }

      if (session?.access_token) {
        clearCustomAccessToken();
      }

      setState((s) => ({ ...s, session, loading: true }));
      fetchProfileData(session?.user ?? null, Boolean(getCustomAccessToken()));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await fetchProfileData(state.session?.user ?? null, Boolean(getCustomAccessToken()));
  };

  const signOut = async () => {
    await api.logout().catch(() => {
      // Ignore backend logout errors and continue local sign out.
    });

    clearCustomAccessToken();
    await supabase.auth.signOut();

    setState({
      ...initialState,
      loading: false,
    });
  };

  const setTelegramSession = async (accessToken: string) => {
    setCustomAccessToken(accessToken);
    setState((s) => ({ ...s, session: null, loading: true }));
    await fetchProfileData(null, true);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        refreshProfile,
        refresh: refreshProfile,
        refreshUser: refreshProfile,
        signOut,
        logout: signOut,
        setTelegramSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
