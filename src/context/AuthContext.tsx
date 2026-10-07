import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  role: "admin" | "teacher" | "candidate";
  targetBand: number;
  createdAt?: string;
  lastActivityAt?: string | null;
  lastLoginAt?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdminOrTeacher: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  roleCodeLogin: (role: "admin" | "teacher", code: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { name: string; email: string; whatsapp: string; password: string; role?: "admin" | "teacher" | "candidate"; targetBand?: number }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  openAuthModal: (mode?: "login" | "signup") => void;
  closeAuthModal: () => void;
  requireSignup: () => void;
  isAuthModalOpen: boolean;
  authModalMode: "login" | "signup";
  isAuthModalRequired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authentication is intentionally session-only. A fresh site load starts logged out.
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore the current browser session after a refresh. We intentionally use
  // sessionStorage rather than localStorage so closing the browser/session ends
  // the login, while a normal page refresh does not log the user out.
  useEffect(() => {
    try {
      localStorage.removeItem("ielts_mastery_user");
      localStorage.removeItem("ielts_mastery_token");
      const savedUser = sessionStorage.getItem("lingofi_auth_user");
      const savedToken = sessionStorage.getItem("lingofi_auth_token");
      if (!savedUser || !savedToken) return;
      const parsedUser = JSON.parse(savedUser) as UserProfile;
      setUser(parsedUser);
      setToken(savedToken);

      // Revalidate the session against the server. If the server has no session
      // (for example after a server restart), clear the stale browser session.
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(async (res) => {
          if (!res.ok) throw new Error("Session expired");
          const data = await res.json();
          if (!data?.authenticated || !data?.user) throw new Error("Session expired");
          setUser(data.user);
          sessionStorage.setItem("lingofi_auth_user", JSON.stringify(data.user));
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          sessionStorage.removeItem("lingofi_auth_user");
          sessionStorage.removeItem("lingofi_auth_token");
        });
    } catch {
      setUser(null);
      setToken(null);
      try {
        sessionStorage.removeItem("lingofi_auth_user");
        sessionStorage.removeItem("lingofi_auth_token");
      } catch {}
    }
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [isAuthModalRequired, setIsAuthModalRequired] = useState<boolean>(false);

  // Keep the 30-day candidate retention timer tied to real activity while the
  // account is actively being used, not just to the last successful login.
  useEffect(() => {
    if (!token) return;
    const sendActivity = async () => {
      try {
        const res = await fetch("/api/auth/activity", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.lastActivityAt) {
          setUser(prev => prev ? { ...prev, lastActivityAt: data.lastActivityAt } : prev);
        }
      } catch {}
    };
    void sendActivity();
    const interval = window.setInterval(() => { void sendActivity(); }, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Static host fallback");
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to log in." };
      }
      setUser(data.user);
      setToken(data.token);
      sessionStorage.setItem("lingofi_auth_user", JSON.stringify(data.user));
      sessionStorage.setItem("lingofi_auth_token", data.token);
      setIsAuthModalOpen(false);
      setIsAuthModalRequired(false);
      return { success: true };
    } catch {
      // Static GitHub Pages / Netlify static fallback
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === "admin@lingofi.org" && password === "admin123") {
        const adminUser: UserProfile = {
          id: "usr_admin_001",
          name: "Wasil Azad (Director)",
          email: "admin@lingofi.org",
          whatsapp: "",
          role: "admin",
          targetBand: 9.0,
          createdAt: new Date().toISOString(),
        };
        setUser(adminUser);
        setToken("static_admin_token");
        sessionStorage.setItem("lingofi_auth_user", JSON.stringify(adminUser));
        sessionStorage.setItem("lingofi_auth_token", "static_admin_token");
        setIsAuthModalOpen(false);
        setIsAuthModalRequired(false);
        return { success: true };
      }
      const localUsers: any[] = JSON.parse(localStorage.getItem("lingofi_static_users") || "[]");
      const found = localUsers.find((u) => String(u.email || "").toLowerCase() === cleanEmail && u.password === password);
      if (found) {
        const { password: _pw, ...safeUser } = found;
        setUser(safeUser);
        setToken(`static_${safeUser.id}`);
        sessionStorage.setItem("lingofi_auth_user", JSON.stringify(safeUser));
        sessionStorage.setItem("lingofi_auth_token", `static_${safeUser.id}`);
        setIsAuthModalOpen(false);
        setIsAuthModalRequired(false);
        return { success: true };
      }
      return { success: false, error: "Invalid email or password." };
    }
  };

  const roleCodeLogin = async (role: "admin" | "teacher", code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/role-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, code }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Static host fallback");
      }
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, error: data.error || "Invalid access code." };
      setUser(data.user);
      setToken(data.token);
      sessionStorage.setItem("lingofi_auth_user", JSON.stringify(data.user));
      sessionStorage.setItem("lingofi_auth_token", data.token);
      setIsAuthModalOpen(false);
      setIsAuthModalRequired(false);
      return { success: true };
    } catch {
      if (code.trim() === "60256025") {
        const staffUser: UserProfile = {
          id: `staff_${role}_${Date.now()}`,
          name: role === "admin" ? "Wasil Azad (Director)" : "LingoFi Teacher",
          email: `${role}@lingofi.org`,
          whatsapp: "",
          role,
          targetBand: 9.0,
          createdAt: new Date().toISOString(),
        };
        setUser(staffUser);
        setToken(`static_staff_${role}`);
        sessionStorage.setItem("lingofi_auth_user", JSON.stringify(staffUser));
        sessionStorage.setItem("lingofi_auth_token", `static_staff_${role}`);
        setIsAuthModalOpen(false);
        setIsAuthModalRequired(false);
        return { success: true };
      }
      return { success: false, error: "Incorrect access code." };
    }
  };

  const signup = async (payload: {
    name: string;
    email: string;
    whatsapp: string;
    password: string;
    role?: "admin" | "teacher" | "candidate";
    targetBand?: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Static host fallback");
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to create account." };
      }
      setUser(data.user);
      setToken(data.token);
      sessionStorage.setItem("lingofi_auth_user", JSON.stringify(data.user));
      sessionStorage.setItem("lingofi_auth_token", data.token);
      setIsAuthModalOpen(false);
      setIsAuthModalRequired(false);
      return { success: true };
    } catch {
      const cleanEmail = payload.email.trim().toLowerCase();
      const localUsers: any[] = JSON.parse(localStorage.getItem("lingofi_static_users") || "[]");
      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        name: payload.name.trim(),
        email: cleanEmail,
        whatsapp: String(payload.whatsapp || ""),
        role: "candidate",
        targetBand: payload.targetBand || 7.5,
        createdAt: new Date().toISOString(),
      };
      localUsers.push({ ...newUser, password: payload.password });
      localStorage.setItem("lingofi_static_users", JSON.stringify(localUsers));
      setUser(newUser);
      setToken(`static_${newUser.id}`);
      sessionStorage.setItem("lingofi_auth_user", JSON.stringify(newUser));
      sessionStorage.setItem("lingofi_auth_token", `static_${newUser.id}`);
      setIsAuthModalOpen(false);
      setIsAuthModalRequired(false);
      return { success: true };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("lingofi_auth_user");
    sessionStorage.removeItem("lingofi_auth_token");
  };

  const openAuthModal = (mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    if (isAuthModalRequired) return;
    setIsAuthModalOpen(false);
  };

  const requireSignup = () => {
    setAuthModalMode("signup");
    setIsAuthModalRequired(true);
    setIsAuthModalOpen(true);
  };

  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdminOrTeacher,
        login,
        roleCodeLogin,
        signup,
        logout,
        openAuthModal,
        closeAuthModal,
        requireSignup,
        isAuthModalOpen,
        authModalMode,
        isAuthModalRequired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
