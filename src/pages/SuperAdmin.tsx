import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building, Users, TrendingUp, Search, Filter, Download, RefreshCw, Mail, Phone, Globe, Shield, AlertCircle, CheckCircle, Crown, Sparkles, Eye, EyeOff, MoreHorizontal } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-20 blur-xl"></div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Institutions</h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-1">Manage and monitor all educational institutions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Building className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {!loading && institutions.length > 0 ? `${institutions.length} Institutions` : '0 Institutions'}
                  </span>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Institution</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-0 shadow-2xl">
                    <DialogHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200 pb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-bold text-slate-900">{editingId ? "Edit" : "New"} Institution</DialogTitle>
                          <DialogDescription className="text-slate-600 mt-1">
                            {editingId ? "Update institution details and configuration" : "Create a new educational institution with admin access"}
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="p-6 sm:p-8 space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Building className="h-4 w-4 text-indigo-600" />
                            Institution Name *
                          </Label>
                          <Input 
                            id="name" 
                            value={form.name} 
                            onChange={(e) => setForm({ ...form, name: e.target.value })} 
                            className="h-11 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="Enter institution name"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="slug" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-purple-600" />
                            URL Slug *
                          </Label>
                          <div className="relative">
                            <Input 
                              id="slug" 
                              value={form.slug} 
                              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} 
                              className="h-11 border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200 font-mono"
                              placeholder="institution-name" 
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <span className="text-sm">/</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="contact_email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-emerald-600" />
                            Contact Email
                          </Label>
                          <Input 
                            id="contact_email" 
                            type="email"
                            value={form.contact_email} 
                            onChange={(e) => setForm({ ...form, contact_email: e.target.value })} 
                            className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="contact@institution.com"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="contact_phone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-blue-600" />
                            Contact Phone
                          </Label>
                          <Input 
                            id="contact_phone" 
                            value={form.contact_phone} 
                            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} 
                            className="h-11 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="footer_message" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-600" />
                          Footer Message
                        </Label>
                        <Input 
                          id="footer_message" 
                          value={form.footer_message} 
                          onChange={(e) => setForm({ ...form, footer_message: e.target.value })} 
                          className="h-11 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                          placeholder="Enter footer message for result pages"
                        />
                      </div>
                      {!editingId && (
                        <>
                          <div className="border-t border-slate-200 pt-6 mt-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                                <Shield className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">Admin Account Creation</h3>
                                <p className="text-sm text-slate-600 mt-1">Optionally create an administrator account for this institution</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <Label htmlFor="admin_email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-emerald-600" />
                                  Admin Email
                                </Label>
                                <Input 
                                  id="admin_email" 
                                  type="email"
                                  value={form.admin_email} 
                                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })} 
                                  className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                                  placeholder="admin@institution.com"
                                />
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="admin_password" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-emerald-600" />
                                  Admin Password
                                </Label>
                                <Input 
                                  id="admin_password" 
                                  type="password"
                                  value={form.admin_password} 
                                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })} 
                                  className="h-11 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                                  placeholder="Enter secure password"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex gap-3 pt-6 mt-6">
                        <Button 
                          onClick={handleSave} 
                          className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                        >
                          {editingId ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Update Institution
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Institution
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => { setDialogOpen(false); resetForm(); }}
                          className="flex-1 h-12 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-xl font-semibold transition-all duration-300"
                        >
                          Cancel
                        </Button>
                      </div>
        </Dialog>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search institutions by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 border-slate-300 hover:bg-slate-50 rounded-xl">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                <span className="sm:hidden">Filter</span>
              </Button>
              <Button variant="outline" className="gap-2 border-slate-300 hover:bg-slate-50 rounded-xl">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Institutions Table */}
        <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                  <Building className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">All Institutions</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">Manage educational institutions and their settings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchInstitutions()}
                  className="gap-2 border-slate-300 hover:bg-slate-50 rounded-xl"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4 w-12">
                      <div className="flex items-center justify-center">
                        <Building className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4">Institution</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4">Slug</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4 hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider px-4 py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="hover:bg-slate-50">
                        <TableCell className="px-4 py-6">
                          <Skeleton className="h-6 w-8 rounded" />
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <Skeleton className="h-6 w-32 rounded" />
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <Skeleton className="h-6 w-24 rounded" />
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <Skeleton className="h-6 w-16 rounded" />
                        </TableCell>
                        <TableCell className="px-4 py-6 hidden sm:table-cell">
                          <Skeleton className="h-6 w-32 rounded" />
                        </TableCell>
                        <TableCell className="px-4 py-6 text-right">
                          <Skeleton className="h-6 w-20 rounded ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : institutions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-16">
                        <div className="text-center">
                          <div className="mx-auto p-4 rounded-2xl bg-slate-100 w-16 h-16 flex items-center justify-center mb-4">
                            <Building className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Institutions Found</h3>
                          <p className="text-slate-600 mb-4 max-w-md mx-auto">Start by adding your first educational institution to manage students, results, and settings.</p>
                          <Button 
                            onClick={() => setDialogOpen(true)}
                            className="gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Plus className="h-4 w-4" />
                            Add First Institution
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    institutions.map((inst) => (
                      <TableRow key={inst.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="px-4 py-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                              <Building className="h-4 w-4 text-indigo-600" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <div>
                            <div className="font-semibold text-slate-900 text-base">{inst.name}</div>
                            <div className="text-sm text-slate-500 mt-1">Educational Institution</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">/{inst.slug}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-slate-100 rounded-lg"
                              onClick={() => navigator.clipboard.writeText(inst.slug)}
                              title="Copy slug"
                            >
                              <CheckCircle className="h-3 w-3 text-slate-400" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(inst)}
                            className={`gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 ${inst.status === 'active' ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200' : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'}`}
                            title={`Click to ${inst.status === 'active' ? 'suspend' : 'activate'} institution`}
                          >
                            {inst.status === 'active' ? (
                              <>
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Active</span>
                                <span className="sm:hidden">Active</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-4 w-4" />
                                <span className="hidden sm:inline">Suspended</span>
                                <span className="sm:hidden">Suspended</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="px-4 py-6 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            {inst.contact_email ? (
                              <>
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{inst.contact_email}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400">No email</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(inst)} 
                              className="h-8 w-8 p-0 hover:bg-indigo-50 rounded-lg group"
                              title="Edit institution"
                            >
                              <Pencil className="h-4 w-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(inst.id)} 
                              className="h-8 w-8 p-0 hover:bg-red-50 rounded-lg group"
                              title="Delete institution"
                            >
                              <Trash2 className="h-4 w-4 text-slate-600 group-hover:text-red-600 transition-colors" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};







export default SuperAdmin;



