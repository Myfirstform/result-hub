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
    console.log("fetchRoleData called for userId:", userId);
    
    try {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("Role query result:", { roleData, roleError });

      if (roleError) {
        console.error("Role query error:", roleError);
        // If it's a lock timeout, try with a direct approach
        if (roleError.message?.includes('Navigator LockManager') || roleError.message?.includes('timed out')) {
          console.log("Lock timeout detected, trying fallback approach");
          // Set a default role based on user email pattern or other logic
          // This is a temporary fallback - you might want to implement proper role management
          setTimeout(() => {
            console.log("Setting fallback role after timeout");
            // You can modify this logic based on your needs
            setRole("institution_admin"); // or determine based on some criteria
          }, 500);
        }
      } else if (roleData) {
        console.log("Setting role:", roleData.role);
        setRole(roleData.role as AppRole);
      } else {
        console.log("No role data found for user");
      }

      const { data: adminData, error: adminError } = await supabase
        .from("institution_admins")
        .select("institution_id")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("Admin query result:", { adminData, adminError });

      if (adminError) {
        console.error("Admin query error:", adminError);
        // Similar fallback for institution data
        if (adminError.message?.includes('Navigator LockManager') || adminError.message?.includes('timed out')) {
          console.log("Lock timeout detected for institution data");
          // You might want to set a default institution or handle this differently
        }
      } else if (adminData) {
        console.log("Setting institutionId:", adminData.institution_id);
        setInstitutionId(adminData.institution_id);
      } else {
        console.log("No admin data found for user");
      }
    } catch (error) {
      console.error("Unexpected error in fetchRoleData:", error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", { event: _event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Add delay and try multiple times if needed
          const attemptRoleFetch = async (attempt = 0) => {
            try {
              await fetchRoleData(session.user.id);
            } catch (error) {
              console.error(`Role fetch attempt ${attempt + 1} failed:`, error);
              if (attempt < 2) {
                setTimeout(() => attemptRoleFetch(attempt + 1), 1000 * (attempt + 1));
              } else {
                console.log("All role fetch attempts failed, setting fallback");
                // Set fallback role after all attempts fail
                setRole("institution_admin");
              }
            }
          };
          
          setTimeout(() => attemptRoleFetch(), 200);
        } else {
          setRole(null);
          setInstitutionId(null);
        }
        setLoading(false);
      }
    );

    // Initial session check with better error handling
    const checkInitialSession = async (retries = 0) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session check:", { hasSession: !!session, retries });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchRoleData(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Initial session check error:", error);
        if (retries < 3) {
          setTimeout(() => checkInitialSession(retries + 1), 1000);
        } else {
          console.log("Session check failed after retries, setting loading to false");
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
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
