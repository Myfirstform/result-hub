import { useEffect, useState, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import AdminLayout from "@/components/AdminLayout";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Eye, EyeOff, Search, FileSpreadsheet, Users, TrendingUp, Filter, Download, RefreshCw, ImageIcon, X } from "lucide-react";

import * as XLSX from "xlsx";



interface StudentResult {
  id: string;
  register_number: string;
  secret_code: string;
  student_name: string;
  class: string | null;
  subjects: any;
  total: number | null;
  grade: string | null;
  rank: string | null;
  published: boolean;
  created_by: string | null;
}



const InstitutionAdmin = () => {
  const { institutionId, user } = useAuth();

  const [results, setResults] = useState<StudentResult[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchResults = async () => {
    if (!institutionId) return;

    const { data } = await supabase
      .from("student_results")
      .select("id, register_number, secret_code, student_name, class, subjects, total, grade, rank, published, created_by")
      .eq("institution_id", institutionId)
      .eq("created_by", user?.id)
      .order("created_at", { ascending: false });

    setResults((data as unknown as StudentResult[]) || []);
    setLoading(false);
  };



  useEffect(() => { fetchResults(); }, [institutionId, user?.id]);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;



    const reader = new FileReader();

    reader.onload = (evt) => {

      const wb = XLSX.read(evt.target?.result, { type: "binary" });

      const ws = wb.Sheets[wb.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json(ws);

      setPreviewData(data);

    };

    reader.readAsBinaryString(file);

  };



  const handleBulkInsert = async () => {
    if (!previewData) return;
    
    setUploading(true);

    // Get institution_id from database function to ensure it's always available
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "User not authenticated", variant: "destructive" });
      setUploading(false);
      return;
    }

    let finalInstitutionId = null;

    // Try to get institution ID from database
    const { data: institutionData, error: institutionError } = await supabase
      .rpc('get_institution_id_for_admin', { _user_id: user.id });
    
    if (institutionData) {
      finalInstitutionId = institutionData;
    } else {
      // If user has institution_admin role but no institution assignment,
      // we need to either create one or use a default
      console.log("No institution assignment found, checking for institutions...");
      
      // Try multiple approaches to find institutions
      let institutions = null;
      let instError = null;
      
      // Approach 1: Direct query (might be blocked by RLS)
      const directQuery = await supabase
        .from("institutions")
        .select("id, name")
        .limit(1);
      
      institutions = directQuery.data;
      instError = directQuery.error;
      
      console.log("Direct query result:", { institutions, instError });
      
      // Approach 2: Skip RPC for now since it may not exist
      // if (!institutions || institutions.length === 0) {
      //   console.log("Direct query failed, trying RPC...");
      //   try {
      //     const rpcQuery = await supabase
      //       .rpc('get_all_institutions_for_super_admin');
          
      //     console.log("RPC query result:", { data: rpcQuery.data, error: rpcQuery.error });
          
      //     if (rpcQuery.data && rpcQuery.data.length > 0) {
      //       institutions = rpcQuery.data;
      //     }
      //   } catch (rpcError) {
      //     console.log("RPC not available or failed:", rpcError);
      //   }
      // }
      
      // Approach 3: If all else fails, show a helpful error
      if (!institutions || institutions.length === 0) {
        console.log("All approaches failed, showing error");
        toast({ 
          title: "No institution access", 
          description: "You have admin role but no institution assignment. Please contact a super admin to assign you to an institution.", 
          variant: "destructive" 
        });
        setUploading(false);
        return;
      }
      
      // Use the first institution found
      finalInstitutionId = institutions[0].id;
      console.log("Using institution:", institutions[0]);
      
      // Create admin assignment
      const { error: createError } = await supabase
        .from("institution_admins")
        .insert({ user_id: user.id, institution_id: finalInstitutionId });
      
      if (createError) {
        console.error("Failed to create admin assignment:", createError);
        toast({ 
          title: "Assignment failed", 
          description: "Could not assign you to institution. Please contact admin.", 
          variant: "destructive" 
        });
      } else {
        console.log("Created admin assignment for institution:", finalInstitutionId);
        toast({ 
          title: "Institution assigned", 
          description: "You have been assigned to an institution. Please refresh the page.", 
        });
      }
    }
    
    if (!finalInstitutionId) {
      toast({ 
        title: "No institution available", 
        description: "No institutions found in the system. Please contact the platform administrator to create an institution first.", 
        variant: "destructive" 
      });
      setUploading(false);
      return;
    }



    const rows = previewData.map((row: any) => {

      // Extract known fields, rest becomes subjects

      const { register_number, RegisterNumber, "Register Number": regNum,

        secret_code, SecretCode, "Secret Code": secCode,

        student_name, StudentName, "Student Name": stuName,

        class: cls, Class: cls2, total, Total, grade, Grade, rank, Rank,

        ...subjectFields } = row;

      const subjects = Object.entries(subjectFields).map(([name, marks]) => ({ name, marks: Number(marks) || 0 }));

      return {
        institution_id: finalInstitutionId,
        created_by: user.id, // Track which admin uploaded this data
        register_number: String(register_number || RegisterNumber || regNum || ""),
        secret_code: String(secret_code || SecretCode || secCode || ""),
        student_name: String(student_name || StudentName || stuName || ""),
        class: String(cls || cls2 || ""),
        subjects,
        total: Number(total || Total) || null,
        grade: String(grade || Grade || ""),
        rank: String(rank || Rank || ""),
        published: false,
      };
    }).filter((r) => r.register_number && r.student_name);

    if (rows.length === 0) {

      toast({ title: "No valid rows found", variant: "destructive" });

      setUploading(false);

      return;

    }



    const { error } = await supabase.from("student_results").insert(rows);

    if (error) {

      toast({ title: "Upload failed", description: error.message, variant: "destructive" });

    } else {
      toast({ title: `${rows.length} results uploaded successfully` });

      setUploadDialogOpen(false);

      setPreviewData(null);

      fetchResults();

    }

    setUploading(false);

  };



  const togglePublish = async (id: string, current: boolean) => {

    await supabase.from("student_results").update({ published: !current }).eq("id", id);

    fetchResults();

  };



  const handleDelete = async (id: string) => {

    await supabase.from("student_results").delete().eq("id", id);

    toast({ title: "Result deleted" });

    fetchResults();

  };



  const filtered = results.filter((r) =>

    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||

    r.register_number.toLowerCase().includes(searchTerm.toLowerCase())

  );



  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(62, 45, 116, 0.1)' }}>
                  <FileSpreadsheet className="h-6 w-6" style={{ color: 'rgba(62, 45, 116)' }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Student Results</h1>
                  <p className="text-sm text-slate-600 mt-1">Manage and track student academic performance</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {!loading && results.length > 0 ? `${results.length} Results` : '0 Results'}
                  </span>
                </div>
                
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      style={{ backgroundColor: 'rgba(62, 45, 116)' }}
// ... (rest of the code remains the same)
                    >
                      <Upload className="h-4 w-4" />
                      Upload Results
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-0 shadow-2xl">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold text-slate-900">Upload Student Results</DialogTitle>
                      <DialogDescription className="text-slate-600">
                        Upload a CSV or Excel file with student results. Required columns: register_number, secret_code, student_name.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                        <Input 
                          ref={fileRef} 
                          type="file" 
                          accept=".csv,.xlsx,.xls" 
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-600 mb-2">Drop your file here or click to browse</p>
                        <Button 
                          variant="outline" 
                          onClick={() => fileRef.current?.click()}
                          className="text-slate-700 border-slate-300 hover:bg-slate-50"
                        >
                          Choose File
                        </Button>
                      </div>
                      
                      {previewData && (
                        <>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-emerald-800">
                              {previewData.length} rows found. Preview:
                            </p>
                          </div>
                          <div className="max-h-60 overflow-auto border border-slate-200 rounded-lg">
                            <Table>
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  {Object.keys(previewData[0] || {}).map((k) => (
                                    <TableHead key={k} className="text-xs font-semibold text-slate-700 whitespace-nowrap px-3 py-2">
                                      {k}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.slice(0, 5).map((row, i) => (
                                  <TableRow key={i} className="border-b border-slate-100">
                                    {Object.values(row).map((v, j) => (
                                      <TableCell key={j} className="text-xs text-slate-600 px-3 py-2">
                                        {String(v)}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <Button 
                            onClick={handleBulkInsert} 
                            disabled={uploading} 
                            className="w-full py-3 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                          >
                            {uploading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload {previewData.length} Results
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

          {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Results</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{results.length}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(62, 45, 116, 0.1)' }}>
                    <FileSpreadsheet className="h-6 w-6" style={{ color: 'rgba(62, 45, 116)' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Published</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {results.filter(r => r.published).length}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <Eye className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Drafts</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {results.filter(r => !r.published).length}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50">
                    <EyeOff className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or register number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 border-slate-300 hover:bg-slate-50">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" className="gap-2 border-slate-300 hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <CardTitle className="text-lg font-semibold text-slate-900">Student Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Register No.</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Student Name</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Class</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Grade</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-5 w-10" /></TableCell>
                          <TableCell className="px-4 py-4"><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="px-4 py-4 text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-slate-600 font-medium">No results found</p>
                            <p className="text-slate-500 text-sm mt-1">Upload your first batch of student results to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="px-4 py-4">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {r.register_number}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                              <span className="text-xs font-medium text-slate-600">
                                {r.student_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-slate-900">{r.student_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 hidden sm:table-cell">
                          <span className="text-sm text-slate-600">{r.class || "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4 hidden sm:table-cell">
                          <span className="text-sm font-medium text-slate-900">{r.total ?? "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4 hidden md:table-cell">
                          <span className="text-sm text-slate-600">{r.grade || "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge 
                            variant={r.published ? "default" : "secondary"} 
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              r.published 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {r.published ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => togglePublish(r.id, r.published)} 
                              className="h-8 w-8 p-0 hover:bg-slate-100"
                              title={r.published ? "Unpublish" : "Publish"}
                            >
                              {r.published ? <EyeOff className="h-4 w-4 text-slate-600" /> : <Eye className="h-4 w-4 text-slate-600" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(r.id)} 
                              className="h-8 w-8 p-0 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

export default InstitutionAdmin;

