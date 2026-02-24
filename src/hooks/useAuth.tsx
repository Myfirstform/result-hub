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
      // Check if user has super_admin role first
      const { data: superAdminData, error: superAdminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();

      console.log("Super admin check result:", { superAdminData, superAdminError });

      if (superAdminData) {
        console.log("User is super admin");
        setRole("super_admin");
        return;
      }

      // Check if user has institution_admin role
      const { data: institutionAdminData, error: institutionAdminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "institution_admin")
        .maybeSingle();

      console.log("Institution admin check result:", { institutionAdminData, institutionAdminError });

      if (institutionAdminData) {
        console.log("User is institution admin");
        setRole("institution_admin");
        
        // Get institution ID for institution admin
        const { data: adminData, error: adminError } = await supabase
          .from("institution_admins")
          .select("institution_id")
          .eq("user_id", userId)
          .maybeSingle();

        console.log("Admin query result:", { adminData, adminError });

        if (adminData) {
          console.log("Setting institutionId:", adminData.institution_id);
          setInstitutionId(adminData.institution_id);
        } else {
          console.log("No institution assignment found, but user has role");
          // User has role but no institution assignment - this is okay for multi-institution access
        }
        return;
      }

      // Fallback: Check if user has institution_admins entry but no user_roles entry
      const { data: orphanedAdmin } = await supabase
        .from("institution_admins")
        .select("institution_id")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("Orphaned admin check result:", { orphanedAdmin });

      if (orphanedAdmin) {
        console.log("Found orphaned institution admin, creating role entry");
        // Create missing user_roles entry
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "institution_admin" });
        
        if (insertError) {
          console.error("Failed to create user role entry:", insertError);
        } else {
          console.log("Successfully created user role entry");
        }
        
        setRole("institution_admin");
        setInstitutionId(orphanedAdmin.institution_id);
        return;
      }

      // Additional fallback: Check if user exists in auth.users but has no roles
      // Note: We can't use admin API from client side, so we'll use a different approach
      const { data: userCheck } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (!userCheck) {
        console.log("User exists in auth but has no roles - checking if they should be institution admin");
        
        // Check if there are any institutions this user should have access to
        const { data: institutions } = await supabase
          .from("institutions")
          .select("id, name, slug")
          .eq("status", "active")
          .limit(1);
        
        if (institutions && institutions.length > 0) {
          console.log("Found active institutions, auto-assigning institution admin role");
          // Auto-assign institution admin role for users without roles
          const { error: autoAssignError } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "institution_admin" });
          
          if (!autoAssignError) {
            // Also create institution_admins entry
            await supabase
              .from("institution_admins")
              .insert({ user_id: userId, institution_id: institutions[0].id });
            
            setRole("institution_admin");
            setInstitutionId(institutions[0].id);
            return;
          }
        }
      }

      console.log("No role found for user");
      setRole(null);
      setInstitutionId(null);
      
    } catch (error) {
      console.error("Unexpected error in fetchRoleData:", error);
      setRole(null);
      setInstitutionId(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", { event: _event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Simple immediate fetch with fallback
          fetchRoleData(session.user.id);
        } else {
          setRole(null);
          setInstitutionId(null);
        }
        setLoading(false);
      }
    );

    // Simple initial session check
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session check:", { hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchRoleData(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error("Initial session check error:", error);
        setLoading(false);
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
