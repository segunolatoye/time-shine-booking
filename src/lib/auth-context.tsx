import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "admin" | "stylist" | "billing" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const isAdmin = roles.includes("super_admin") || roles.includes("admin");
  const hasRole = (role: AppRole) => roles.includes(role) || roles.includes("super_admin");

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchRoles(newSession.user.id), 0);
        } else {
          setRoles([]);
        }
        setLoading(false);
        initialized.current = true;
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      // Only set if onAuthStateChange hasn't fired yet
      if (!initialized.current) {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        if (existingSession?.user) {
          fetchRoles(existingSession.user.id).then(() => setLoading(false));
        } else {
          setLoading(false);
        }
        initialized.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, roles, hasRole, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
