import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Building2, BarChart3, FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const superAdminLinks = [
    { to: "/admin/super", label: "Institutions", icon: Building2 },
    { to: "/admin/super/stats", label: "Statistics", icon: BarChart3 },
  ];

  const institutionLinks = [
    { to: "/admin/institution", label: "Results", icon: FileSpreadsheet },
    { to: "/admin/institution/logs", label: "Search Logs", icon: Search },
  ];

  const links = role === "super_admin" ? superAdminLinks : institutionLinks;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">
              {role === "super_admin" ? "Super Admin" : "Institution Admin"}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={location.pathname === link.to ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("gap-2")}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 ml-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
