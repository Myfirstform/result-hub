import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "super_admin" | "institution_admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  institutionId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleData = async (userId: string) => {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleError) throw roleError;

    const roles = roleData?.map((entry) => entry.role) ?? [];
    if (roles.includes("super_admin")) {
      return { role: "super_admin" as const, institutionId: null };
    }
    if (!roles.includes("institution_admin")) {
      return { role: null, institutionId: null };
    }

    const { data: assignedInstitutionId, error: institutionError } = await supabase
      .rpc("get_institution_id_for_admin", { _user_id: userId });
    if (institutionError) throw institutionError;
    return { role: "institution_admin" as const, institutionId: assignedInstitutionId };
  };

  useEffect(() => {
    let active = true;
    let authVersion = 0;
    let receivedAuthEvent = false;

    const applySession = async (nextSession: Session | null, version: number) => {
      if (!active || version !== authVersion) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRole(null);
        setInstitutionId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const roleData = await fetchRoleData(nextSession.user.id);
        if (!active || version !== authVersion) return;
        setRole(roleData.role);
        setInstitutionId(roleData.institutionId);
      } catch (error) {
        console.error("Unable to load account access:", error);
        if (!active || version !== authVersion) return;
        setRole(null);
        setInstitutionId(null);
      } finally {
        if (active && version === authVersion) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        receivedAuthEvent = true;
        authVersion += 1;
        void applySession(nextSession, authVersion);
      }
    );

    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!receivedAuthEvent) {
          authVersion += 1;
          await applySession(initialSession, authVersion);
        }
      } catch (error) {
        console.error("Unable to restore sign-in:", error);
        if (active && !receivedAuthEvent) setLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setInstitutionId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, institutionId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
