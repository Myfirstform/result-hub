import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "super_admin" | "institution_admin";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Only redirect if we have a definitive role that doesn't match
  // Don't redirect during role determination
  if (requiredRole && role && role !== requiredRole && role !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  // For super admin routes, ensure we have the super admin role
  if (requiredRole === "super_admin" && role !== "super_admin") {
    // Don't redirect immediately - wait for role to be properly determined
    if (role === null) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 w-64">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
      );
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
