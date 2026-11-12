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
      const { error } = await supabase.functions.invoke("assign-user-role", {
        body: {
          email: email.trim(),
          role,
          institution_id: role === "institution_admin" ? institutionId : null,
        },
      });
      if (error) throw error;

      toast({ title: "Role assigned successfully" });
      setEmail("");
      setInstitutionId("");
    } catch (error) {
      toast({ title: "Failed to assign role", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
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
            <Select value={role} onValueChange={(value) => {
              if (value === "super_admin" || value === "institution_admin") setRole(value);
            }}>
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
