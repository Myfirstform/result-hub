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

  // Enhanced role checking with better fallback handling
  if (requiredRole === "institution_admin") {
    // Allow access if user has institution_admin role
    if (role === "institution_admin") {
      return <>{children}</>;
    }
    
    // Allow access if user has super_admin role (super admins can access everything)
    if (role === "super_admin") {
      return <>{children}</>;
    }
    
    // If role is still null after loading, show loading state
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
    
    // User doesn't have required role, redirect to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  // For super admin routes, ensure we have the super admin role
  if (requiredRole === "super_admin") {
    // Allow access if user has super admin role
    if (role === "super_admin") {
      return <>{children}</>;
    }
    
    // If role is still null after loading, show loading state
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
    
    // User doesn't have super admin role, redirect to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  // For routes without specific role requirements, just ensure user is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
