import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import * as api from "../api";
import { applyTheme } from "./theme";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  needsUsername: boolean;
  preferences: any | null;
  providers: { provider: string; linkedAt: number }[];
}

interface AuthContextValue extends AuthState {
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setSessionManually: (accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    needsUsername: false,
    preferences: null,
    providers: [],
  });

  const fetchProfileData = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setState((s) => ({ ...s, user: null, session: null, profile: null, loading: false }));
      return;
    }
    
    try {
      const { data } = await api.get("/auth/me");
      if (data?.data) {
        if (data.data.preferences) {
          applyTheme(
            data.data.preferences.theme,
            data.data.preferences.accent,
            data.data.preferences.vibe
          );
        }
        setState((s) => ({
          ...s,
          user: sessionUser,
          profile: data.data.profile,
          needsUsername: data.data.user?.needsUsername || false,
          preferences: data.data.preferences,
          providers: data.data.providers || [],
          loading: false,
        }));
      } else {
        setState((s) => ({ ...s, user: sessionUser, loading: false }));
      }
    } catch (error) {
      setState((s) => ({ ...s, user: sessionUser, loading: false }));
    }
  };

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({ ...s, session }));
      fetchProfileData(session?.user || null);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState((s) => ({ ...s, session, loading: true }));
        fetchProfileData(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await fetchProfileData(state.user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      needsUsername: false,
      preferences: null,
      providers: [],
    });
  };

  const setSessionManually = async (access_token: string, refresh_token: string) => {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    setState((s) => ({ ...s, session: data.session, loading: true }));
    fetchProfileData(data.session?.user || null);
  };

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile, signOut, setSessionManually }}>
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
