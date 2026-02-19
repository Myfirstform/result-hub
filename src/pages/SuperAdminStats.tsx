import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Search } from "lucide-react";

const SuperAdminStats = () => {
  const [stats, setStats] = useState({ institutions: 0, results: 0, searches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [instRes, resultsRes, logsRes] = await Promise.all([
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("student_results").select("id", { count: "exact", head: true }),
        supabase.from("access_logs").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        institutions: instRes.count || 0,
        results: resultsRes.count || 0,
        searches: logsRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Institutions", value: stats.institutions, icon: Building2, color: "text-primary" },
    { label: "Total Results", value: stats.results, icon: Users, color: "text-primary" },
    { label: "Total Searches", value: stats.searches, icon: Search, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Platform Statistics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="text-3xl font-bold">{c.value.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default SuperAdminStats;
