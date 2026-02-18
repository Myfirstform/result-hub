import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const AdminDashboard = () => {
  const { role } = useAuth();

  if (role === "super_admin") return <Navigate to="/admin/super" replace />;
  if (role === "institution_admin") return <Navigate to="/admin/institution" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">No role assigned. Contact the platform administrator.</p>
    </div>
  );
};

export default AdminDashboard;
