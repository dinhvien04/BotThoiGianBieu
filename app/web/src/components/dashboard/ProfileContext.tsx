"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "@/lib/api";
import { useLanguage } from "@/components/dashboard/LanguageContext";

interface ProfileState {
  user: api.UserProfile | null;
  settings: api.UserSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useLanguage();
  const [user, setUser] = useState<api.UserProfile | null>(null);
  const [settings, setSettings] = useState<api.UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUserProfile();
      if (res.success) {
        setUser(res.user);
        setSettings(res.settings);
        if (res.settings.language === "vi" || res.settings.language === "en") {
          setLanguage(res.settings.language);
        }
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("ProfileProvider fetch error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [setLanguage]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <ProfileContext.Provider value={{ user, settings, loading, error, refetch: fetch }}>
      {children}
    </ProfileContext.Provider>
  );
}

/** Lấy profile từ DashboardShell context. Phải được dùng trong dashboard route. */
export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used inside ProfileProvider (dashboard shell)");
  }
  return ctx;
}
