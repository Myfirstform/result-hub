import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Building2, BarChart3, FileSpreadsheet, Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">
              {role === "super_admin" ? "Super Admin" : "Institution Admin"}
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={location.pathname === link.to ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 ml-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>

          {/* Mobile toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t md:hidden px-4 py-3 space-y-1 bg-card">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={location.pathname === link.to ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">{children}</main>
    </div>
  );
};

export default AdminLayout;
