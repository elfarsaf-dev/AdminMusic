import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { fetchApi } from "./api";

interface AuthContextType {
  adminKey: string | null;
  setAdminKey: (key: string) => void;
  clearAdminKey: () => void;
  isChecking: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminKey, setKey] = useState<string | null>(() => localStorage.getItem("mc_admin_key"));
  const [isChecking, setIsChecking] = useState(true);
  const [, setLocation] = useLocation();

  const setAdminKey = (key: string) => {
    localStorage.setItem("mc_admin_key", key);
    setKey(key);
  };

  const clearAdminKey = () => {
    localStorage.removeItem("mc_admin_key");
    setKey(null);
    setLocation("/login");
  };

  useEffect(() => {
    const handleStorage = () => {
      setKey(localStorage.getItem("mc_admin_key"));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Check valid key on mount if present
  useEffect(() => {
    async function check() {
      if (adminKey) {
        try {
          await fetchApi("/admin/users");
        } catch (e: any) {
          if (e.status === 401) {
            clearAdminKey();
          }
        }
      }
      setIsChecking(false);
    }
    check();
  }, [adminKey]);

  return (
    <AuthContext.Provider value={{ adminKey, setAdminKey, clearAdminKey, isChecking }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
