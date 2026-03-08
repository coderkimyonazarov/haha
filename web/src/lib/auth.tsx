import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import * as api from "../api";
import { User as AppUser, UserPreferences } from "../api";
import { applyTheme } from "./theme";

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

  const fetchProfileData = async (sessionUser: SupabaseUser | null) => {
    if (!sessionUser) {
      setState((s) => ({ ...s, user: null, session: null, profile: null, loading: false }));
      return;
    }
    
    try {
      const data = await api.me();
      if (data && data.user) {
        if (data.preferences) {
          applyTheme({
            ...data.preferences,
            onboardingDone: Boolean(data.preferences.onboardingDone) // Convert number 0/1 to boolean
          });
        }
        setState((s) => ({
          ...s,
          user: data.user,
          profile: data.profile,
          needsUsername: data.user.needsUsername || false,
          preferences: data.preferences || null,
          providers: data.providers || [],
          loading: false,
        }));
      } else {
        setState((s) => ({ ...s, user: null, loading: false }));
      }
    } catch (error) {
      setState((s) => ({ ...s, user: null, loading: false }));
    }
  };

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setState((s) => ({ ...s, session }));
      fetchProfileData(session?.user || null);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: Session | null) => {
        setState((s) => ({ ...s, session, loading: true }));
        fetchProfileData(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    await fetchProfileData(state.session?.user || null);
  };

  const signOut = async () => {
    await api.logout().catch(() => {}); // Clear backend sypev cookies if any left
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
    <AuthContext.Provider 
      value={{ 
        ...state, 
        refreshProfile, 
        refresh: refreshProfile, 
        refreshUser: refreshProfile, 
        signOut, 
        logout: signOut, 
        setSessionManually 
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
