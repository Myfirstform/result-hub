import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building, Users, TrendingUp, Search, Filter, Download, RefreshCw, Mail, Phone, Globe } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";


type Institution = Tables<"institutions">;

const SuperAdmin = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", contact_email: "", contact_phone: "", footer_message: "", admin_email: "", admin_password: "" });

  const fetchInstitutions = async () => {
    const { data } = await supabase.from("institutions").select("*").order("created_at", { ascending: false });
    setInstitutions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchInstitutions(); }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", contact_email: "", contact_phone: "", footer_message: "", admin_email: "", admin_password: "" });
    setEditingId(null);
  };



  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("institutions").update({
        name: form.name, slug: form.slug, contact_email: form.contact_email,
        contact_phone: form.contact_phone, footer_message: form.footer_message,
      }).eq("id", editingId);

      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Institution updated" });
    } else {
      const { data: inst, error } = await supabase.from("institutions").insert({
        name: form.name, 
        slug: form.slug, 
        contact_email: form.contact_email,
        contact_phone: form.contact_phone, 
        footer_message: form.footer_message,
        status: "active",
      }).select().single();

      console.log("Institution creation result:", { inst, error });

      if (error) { 
        toast({ title: "Creation failed", description: error.message, variant: "destructive" }); 
        return; 
      }

      if (!inst) {
        toast({ title: "Creation failed", description: "No institution data returned", variant: "destructive" });
        return;
      }

      // Create admin user if email provided
      if (form.admin_email && form.admin_password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.admin_email, password: form.admin_password,
        });

        if (authError) {
          toast({ title: "Admin creation failed", description: authError.message, variant: "destructive" });
        } else if (authData.user) {
          await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "institution_admin" as any });
          await supabase.from("institution_admins").insert({ user_id: authData.user.id, institution_id: inst.id });
          toast({ title: "Institution & admin created" });
        }
      } else {
        toast({ title: "Institution created successfully" });
      }
    }

    resetForm();
    setDialogOpen(false);
    fetchInstitutions();
  };


  const handleEdit = (inst: Institution) => {
    setForm({
      name: inst.name, slug: inst.slug, contact_email: inst.contact_email || "",
      contact_phone: inst.contact_phone || "", footer_message: inst.footer_message || "",
      admin_email: "", admin_password: "",
    });
    setEditingId(inst.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("institutions").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Institution deleted" });
    fetchInstitutions();
  };

  const toggleStatus = async (inst: Institution) => {
    const newStatus = inst.status === "active" ? "suspended" : "active";
    await supabase.from("institutions").update({ status: newStatus }).eq("id", inst.id);
    fetchInstitutions();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Institutions</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Institution</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Institution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="darululoom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Footer Message</Label>
                <Input value={form.footer_message} onChange={(e) => setForm({ ...form, footer_message: e.target.value })} />
              </div>
              {!editingId && (
                <>
                  <hr />
                  <p className="text-sm text-muted-foreground">Optional: Create an admin account for this institution</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Admin Email</Label>
                      <Input value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Admin Password</Label>
                      <Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
                    </div>
                  </div>
                </>
              )}
              <Button onClick={handleSave} className="w-full">{editingId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : institutions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No institutions yet</TableCell></TableRow>
              ) : institutions.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell className="font-mono text-sm">/{inst.slug}</TableCell>
                  <TableCell>
                    <Badge
                      variant={inst.status === "active" ? "default" : "destructive"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(inst)}
                    >
                      {inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inst.contact_email || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(inst)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inst.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};







export default SuperAdmin;



