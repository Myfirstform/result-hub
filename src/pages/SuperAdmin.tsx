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

        status: "active", // Explicitly set status

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(62, 45, 116, 0.1)' }}>
                  <Building className="h-6 w-6" style={{ color: 'rgba(62, 45, 116)' }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Institutions</h1>
                  <p className="text-sm text-slate-600 mt-1">Manage educational institutions and administrators</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <Building className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {!loading && `${institutions.length} Institutions`}
                  </span>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Institution
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-0 shadow-2xl">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold text-slate-900">
                        {editingId ? "Edit Institution" : "Create New Institution"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-slate-700">Institution Name *</Label>
                          <Input 
                            id="name"
                            value={form.name} 
                            onChange={(e) => setForm({ ...form, name: e.target.value })} 
                            className="border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                            placeholder="Enter institution name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug" className="text-sm font-medium text-slate-700">Slug *</Label>
                          <Input 
                            id="slug"
                            value={form.slug} 
                            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} 
                            className="border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg font-mono"
                            placeholder="institution-identifier"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="contact_email" className="text-sm font-medium text-slate-700">Contact Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              id="contact_email"
                              type="email"
                              value={form.contact_email} 
                              onChange={(e) => setForm({ ...form, contact_email: e.target.value })} 
                              className="pl-10 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                              placeholder="contact@institution.com"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact_phone" className="text-sm font-medium text-slate-700">Contact Phone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                              id="contact_phone"
                              value={form.contact_phone} 
                              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} 
                              className="pl-10 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                              placeholder="+1 234 567 890"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="footer_message" className="text-sm font-medium text-slate-700">Footer Message</Label>
                        <Input 
                          id="footer_message"
                          value={form.footer_message} 
                          onChange={(e) => setForm({ ...form, footer_message: e.target.value })} 
                          className="border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                          placeholder="Optional footer text for result pages"
                        />
                      </div>
                      
                      {!editingId && (
                        <>
                          <div className="border-t border-slate-200 pt-6">
                            <p className="text-sm font-medium text-slate-700 mb-4">Optional: Create Admin Account</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="admin_email" className="text-sm font-medium text-slate-700">Admin Email</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input 
                                    id="admin_email"
                                    type="email"
                                    value={form.admin_email} 
                                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })} 
                                    className="pl-10 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                                    placeholder="admin@institution.com"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="admin_password" className="text-sm font-medium text-slate-700">Admin Password</Label>
                                <Input 
                                  id="admin_password"
                                  type="password"
                                  value={form.admin_password} 
                                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })} 
                                  className="border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                                  placeholder="Create secure password"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="flex gap-3 pt-6">
                        <Button 
                          onClick={handleSave} 
                          className="flex-1 px-4 py-3 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                        >
                          {editingId ? "Update Institution" : "Create Institution"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setDialogOpen(false)}
                          className="px-4 py-3 border-slate-300 hover:bg-slate-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Stats Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex-1">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Search className="h-5 w-5 text-slate-600" />
                    Search Institutions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or slug..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Institutions</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{institutions.length}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(62, 45, 116, 0.1)' }}>
                      <Building className="h-6 w-6" style={{ color: 'rgba(62, 45, 116)' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Active</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {institutions.filter(i => i.status === 'active').length}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50">
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Suspended</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {institutions.filter(i => i.status === 'suspended').length}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50">
                      <Filter className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Institutions Table */}
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-slate-600" />
                All Institutions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Institution</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Slug</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Contact</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="px-4 py-4 text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : institutions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <Building className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-slate-600 font-medium">No institutions found</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first institution to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      institutions
                        .filter(inst => 
                          searchTerm === '' || 
                          inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inst.slug.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((inst) => (
                          <TableRow key={inst.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-slate-100">
                                  <Building className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{inst.name}</p>
                                  <p className="text-sm text-slate-500">/{inst.slug}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="font-mono text-sm text-slate-600">{inst.slug}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <Badge 
                                variant={inst.status === "active" ? "default" : "destructive"}
                                className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-colors ${
                                  inst.status === "active" 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                                    : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                                }`}
                                onClick={() => toggleStatus(inst)}
                              >
                                {inst.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                {inst.contact_email && (
                                  <div className="flex items-center gap-1 text-sm text-slate-600">
                                    <Mail className="h-3 w-3" />
                                    {inst.contact_email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEdit(inst)} 
                                  className="h-8 w-8 p-0 hover:bg-slate-100"
                                  title="Edit institution"
                                >
                                  <Pencil className="h-4 w-4 text-slate-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDelete(inst.id)} 
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  title="Delete institution"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
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
      </div>
    </AdminLayout>
  );

};

export default SuperAdmin;

