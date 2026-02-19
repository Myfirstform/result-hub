import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RoleAssigner = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"super_admin" | "institution_admin">("institution_admin");
  const [institutionId, setInstitutionId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssignRole = async () => {
    if (!email) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Get user by email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const user = users?.find(u => u.email === email);
      if (!user) {
        toast({ title: "User not found", description: "Make sure the user is registered", variant: "destructive" });
        return;
      }

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

      if (roleError) throw roleError;

      // If institution admin, assign institution
      if (role === "institution_admin" && institutionId) {
        const { error: adminError } = await supabase
          .from("institution_admins")
          .upsert({ user_id: user.id, institution_id }, { onConflict: "user_id,institution_id" });

        if (adminError) throw adminError;
      }

      toast({ title: "Role assigned successfully" });
      setEmail("");
      setInstitutionId("");
    } catch (error: any) {
      toast({ title: "Failed to assign role", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign User Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="institution_admin">Institution Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "institution_admin" && (
            <div>
              <Label htmlFor="institutionId">Institution ID</Label>
              <Input
                id="institutionId"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="Institution UUID"
              />
            </div>
          )}

          <Button 
            onClick={handleAssignRole} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "Assigning..." : "Assign Role"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleAssigner;
