import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  me,
  logout as apiLogout,
  type User,
  type Profile,
  type AuthProvider,
  type UserPreferences,
} from "../api";
import { applyTheme } from "./theme";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  providers: AuthProvider[];
  preferences: UserPreferences | null;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>; // Alias for convenience in components
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  providers: [],
  preferences: null,
  loading: true,
  refresh: async () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await me();
      setUser(res.user || null);
      setProfile(res.profile || null);
      setProviders(res.providers || []);
      setPreferences(res.preferences || null);

      if (res.preferences) {
        applyTheme({
          theme: res.preferences.theme,
          accent: res.preferences.accent,
          vibe: res.preferences.vibe,
          onboardingDone: res.preferences.onboardingDone === 1,
        });
      }
    } catch {
      setUser(null);
      setProfile(null);
      setProviders([]);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setProfile(null);
      setProviders([]);
      setPreferences(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, profile, providers, preferences, loading, refresh, refreshUser: refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
