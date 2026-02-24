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
import { Upload, Trash2, Eye, EyeOff, Search, FileSpreadsheet, Users, TrendingUp, Filter, Download, RefreshCw, ImageIcon, X, Settings, CheckCircle, AlertCircle, Plus, Edit2, Save, BookOpen, AlertTriangle, CheckSquare, Square } from "lucide-react";

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

interface PassMark {
  id: string;
  class: string;
  subject: string;
  pass_mark: number;
  created_at: string;
  updated_at: string;
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

  // Institution settings state
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [loadingInstitution, setLoadingInstitution] = useState(false);

  // Pass marks state
  const [passMarks, setPassMarks] = useState<PassMark[]>([]);
  const [passMarksLoading, setPassMarksLoading] = useState(false);
  const [passMarkDialogOpen, setPassMarkDialogOpen] = useState(false);
  const [editingPassMark, setEditingPassMark] = useState<PassMark | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [newPassMark, setNewPassMark] = useState("");

  // Bulk actions state
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [selectedPassMarks, setSelectedPassMarks] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const fetchInstitutionData = async () => {
    if (!institutionId) return;
    setLoadingInstitution(true);
    
    console.log("Fetching institution data for ID:", institutionId);
    
    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("name, logo_url, footer_message")
        .eq("id", institutionId)
        .single();
      
      console.log("Fetch result:", { data, error });
      
      if (error) {
        console.error("Database fetch error:", error);
        throw error;
      }
      
      if (!data) {
        console.error("No institution data found");
        throw new Error("Institution not found");
      }
      
      console.log("Setting institution data:", data);
      console.log("Setting logo URL:", data?.logo_url);
      setInstitutionData(data);
      setLogoUrl(data?.logo_url || "");
    } catch (error: any) {
      console.error("Error fetching institution data:", error);
      toast({ title: "Error loading institution data", description: error.message, variant: "destructive" });
    } finally {
      setLoadingInstitution(false);
    }
  };

  const handleUpdateLogo = async () => {
    if (!institutionId) return;
    
    console.log("Updating logo for institution:", institutionId);
    console.log("New logo URL:", logoUrl);
    
    try {
      // Use Supabase function to bypass RLS issues
      const { data, error } = await supabase
        .rpc('update_institution_logo', {
          p_institution_id: institutionId,
          p_logo_url: logoUrl || null
        });
      
      console.log("Update result:", { data, error });
      
      if (error) {
        console.error("Database update error:", error);
        throw error;
      }
      
      if (!data) {
        console.error("No data returned from update");
        throw new Error("No data returned from update operation");
      }
      
      // Parse the JSON result
      const updatedData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("Updated institution data:", updatedData);
      
      toast({ title: "Logo updated successfully", description: "Logo URL has been updated in the database" });
      setLogoDialogOpen(false);
      
      // Update local state with the returned data
      setInstitutionData(prev => ({
        ...prev,
        logo_url: updatedData.logo_url
      }));
      setLogoUrl(updatedData.logo_url || "");
      
    } catch (error: any) {
      console.error("Error updating logo:", error);
      toast({ 
        title: "Error updating logo", 
        description: error.message || "Unknown error occurred", 
        variant: "destructive" 
      });
    }
  };

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

  const fetchPassMarks = async () => {
    if (!institutionId) return;
    setPassMarksLoading(true);

    const { data, error } = await supabase
      .from("pass_marks")
      .select("*")
      .eq("institution_id", institutionId)
      .order("class, subject");

    if (error) {
      console.error("Error fetching pass marks:", error);
      // If table doesn't exist, show empty state
      setPassMarks([]);
    } else {
      setPassMarks(data || []);
    }
    setPassMarksLoading(false);
  };

  const fetchAvailableClassesAndSubjects = () => {
    const classesSet = new Set<string>();
    const subjectsSet = new Set<string>();

    results.forEach(result => {
      if (result.class) {
        classesSet.add(result.class);
      }
      if (result.subjects && Array.isArray(result.subjects)) {
        result.subjects.forEach((subject: any) => {
          if (subject.name) {
            subjectsSet.add(subject.name);
          }
        });
      }
    });

    setAvailableClasses(Array.from(classesSet).sort());
    setAvailableSubjects(Array.from(subjectsSet).sort());
  };



  useEffect(() => { fetchResults(); }, [institutionId, user?.id]);
  useEffect(() => { fetchPassMarks(); }, [institutionId, user?.id]);
  useEffect(() => { fetchAvailableClassesAndSubjects(); }, [results]);
  useEffect(() => { 
    console.log("InstitutionAdmin useEffect - institutionId:", institutionId);
    console.log("InstitutionAdmin useEffect - user:", user?.id);
    fetchInstitutionData(); 
  }, [institutionId]);



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
    if (!confirm("Are you sure you want to delete this result?")) return;

    const { error } = await supabase.from("student_results").delete().eq("id", id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Result deleted successfully" });
      fetchResults();
    }
  };

  // Pass marks management functions
  const handleSavePassMark = async () => {
    if (!selectedClass || !selectedSubject || !newPassMark) {
      toast({ title: "Missing fields", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    const passMarkValue = parseInt(newPassMark);
    if (isNaN(passMarkValue) || passMarkValue < 0 || passMarkValue > 100) {
      toast({ title: "Invalid pass mark", description: "Pass mark must be between 0 and 100", variant: "destructive" });
      return;
    }

    if (editingPassMark) {
      // Update existing pass mark
      const { error } = await supabase
        .from("pass_marks")
        .update({ pass_mark: passMarkValue })
        .eq("id", editingPassMark.id);

      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Pass mark updated successfully" });
        setPassMarkDialogOpen(false);
        setEditingPassMark(null);
        resetPassMarkForm();
        fetchPassMarks();
      }
    } else {
      // Create new pass mark
      const { error } = await supabase
        .from("pass_marks")
        .insert({
          institution_id: institutionId,
          class: selectedClass,
          subject: selectedSubject,
          pass_mark: passMarkValue,
          created_by: user?.id
        });

      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Pass mark created successfully" });
        setPassMarkDialogOpen(false);
        resetPassMarkForm();
        fetchPassMarks();
      }
    }
  };

  const handleEditPassMark = (passMark: PassMark) => {
    setEditingPassMark(passMark);
    setSelectedClass(passMark.class);
    setSelectedSubject(passMark.subject);
    setNewPassMark(passMark.pass_mark.toString());
    setPassMarkDialogOpen(true);
  };

  const handleDeletePassMark = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pass mark?")) return;

    const { error } = await supabase.from("pass_marks").delete().eq("id", id);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pass mark deleted successfully" });
      fetchPassMarks();
    }
  };

  const resetPassMarkForm = () => {
    setSelectedClass("");
    setSelectedSubject("");
    setNewPassMark("");
    setEditingPassMark(null);
  };

  // Bulk action functions for Student Results
  const handleSelectAllResults = () => {
    if (selectedResults.length === filtered.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(filtered.map(r => r.id));
    }
  };

  const handleSelectResult = (id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleBulkDeleteResults = async () => {
    if (selectedResults.length === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('student_results')
        .delete()
        .in('id', selectedResults);
      
      if (error) throw error;
      
      toast({ 
        title: "Bulk delete successful", 
        description: `Deleted ${selectedResults.length} result(s)` 
      });
      setSelectedResults([]);
      fetchResults();
    } catch (error: any) {
      toast({ 
        title: "Bulk delete failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedResults.length === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('student_results')
        .update({ published: publish })
        .in('id', selectedResults);
      
      if (error) throw error;
      
      toast({ 
        title: `Bulk ${publish ? 'publish' : 'draft'} successful`, 
        description: `${publish ? 'Published' : 'Set to draft'} ${selectedResults.length} result(s)` 
      });
      setSelectedResults([]);
      fetchResults();
    } catch (error: any) {
      toast({ 
        title: `Bulk ${publish ? 'publish' : 'draft'} failed`, 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk action functions for Pass Marks
  const handleSelectAllPassMarks = () => {
    if (selectedPassMarks.length === passMarks.length) {
      setSelectedPassMarks([]);
    } else {
      setSelectedPassMarks(passMarks.map(pm => pm.id));
    }
  };

  const handleSelectPassMark = (id: string) => {
    setSelectedPassMarks(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleBulkDeletePassMarks = async () => {
    if (selectedPassMarks.length === 0) return;
    
    setBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('pass_marks')
        .delete()
        .in('id', selectedPassMarks);
      
      if (error) throw error;
      
      toast({ 
        title: "Bulk delete successful", 
        description: `Deleted ${selectedPassMarks.length} pass mark(s)` 
      });
      setSelectedPassMarks([]);
      fetchPassMarks();
    } catch (error: any) {
      toast({ 
        title: "Bulk delete failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setBulkActionLoading(false);
    }
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

          {/* Institution Settings Section */}
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden mb-8">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                    <ImageIcon className="h-5 w-5" style={{ color: 'rgba(59, 130, 246)' }} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Institution Settings</CardTitle>
                    <p className="text-sm text-slate-600">Manage your institution's logo and branding</p>
                  </div>
                </div>
                <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                      style={{ backgroundColor: 'rgba(59, 130, 246)' }}
                      onClick={() => setLogoUrl(institutionData?.logo_url || "")}
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Logo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md border-0 shadow-2xl">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold text-slate-900">Edit Institution Logo</DialogTitle>
                      <DialogDescription className="text-slate-600">
                        Update your institution's logo URL. Leave empty to use default logo.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoUrl" className="text-sm font-medium text-slate-700">Logo URL</Label>
                        <Input 
                          id="logoUrl"
                          type="url"
                          value={logoUrl} 
                          onChange={(e) => setLogoUrl(e.target.value)} 
                          placeholder="https://example.com/logo.png"
                          className="h-11 border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-lg"
                        />
                        <p className="text-xs text-slate-500">Enter a valid URL for your institution logo. If not provided, the default logo will be used.</p>
                      </div>
                      {logoUrl && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">Preview</Label>
                          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <img 
                              src={logoUrl} 
                              alt="Logo preview" 
                              className="max-h-20 mx-auto object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                              onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'block';
                              }}
                            />
                            {!logoUrl && (
                              <div className="text-center text-slate-500 text-sm">No logo preview available</div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          onClick={handleUpdateLogo} 
                          className="flex-1 py-3 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ backgroundColor: 'rgba(59, 130, 246)' }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Update Logo
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setLogoDialogOpen(false)}
                          className="flex-1 py-3 border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-all duration-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    {(institutionData?.logo_url || "/icon.png") ? (
                      <img 
                        src={institutionData?.logo_url || "/icon.png"} 
                        alt="Institution logo" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== "/icon.png") {
                            target.src = "/icon.png";
                          }
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{institutionData?.name || "Loading..."}</h3>
                  <p className="text-sm text-slate-600 mb-2">Current institution logo</p>
                  {institutionData?.logo_url ? (
                    <div className="text-xs text-slate-500">
                      Logo URL: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{institutionData.logo_url}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Using default logo</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pass Marks Management Section */}
          <Card className="border-0 shadow-lg rounded-xl overflow-hidden mb-8">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(62, 45, 116, 0.1)' }}>
                    <Settings className="h-5 w-5" style={{ color: 'rgba(62, 45, 116)' }} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">Pass Marks Management</CardTitle>
                    <p className="text-sm text-slate-600">Set pass marks for subjects by class</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPassMarks.length > 0 && (
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">
                        {selectedPassMarks.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBulkDeletePassMarks}
                        disabled={bulkActionLoading}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        title="Delete Selected"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                  <Dialog open={passMarkDialogOpen} onOpenChange={setPassMarkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                        onClick={() => resetPassMarkForm()}
                      >
                        <Plus className="h-4 w-4" />
                        Add Pass Mark
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-md border-0 shadow-2xl">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold text-slate-900">
                        {editingPassMark ? 'Edit Pass Mark' : 'Add Pass Mark'}
                      </DialogTitle>
                      <DialogDescription className="text-slate-600">
                        Set the pass mark for a specific subject and class
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="class" className="text-sm font-medium text-slate-700">Class</Label>
                        <select
                          id="class"
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full h-11 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3"
                        >
                          <option value="">Select a class</option>
                          {availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium text-slate-700">Subject</Label>
                        <select
                          id="subject"
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full h-11 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg px-3"
                        >
                          <option value="">Select a subject</option>
                          {availableSubjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passMark" className="text-sm font-medium text-slate-700">Pass Mark (0-100)</Label>
                        <Input 
                          id="passMark"
                          type="number"
                          value={newPassMark} 
                          onChange={(e) => setNewPassMark(e.target.value)} 
                          placeholder="Enter pass mark"
                          min="0"
                          max="100"
                          className="h-11 border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          onClick={handleSavePassMark} 
                          className="flex-1 h-11 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                          style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingPassMark ? 'Update' : 'Save'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setPassMarkDialogOpen(false)}
                          className="flex-1 h-11 border-slate-300 hover:bg-slate-50 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {passMarksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : passMarks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto p-3 rounded-full bg-slate-100 w-12 h-12 flex items-center justify-center mb-4">
                    <Settings className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pass Marks Set</h3>
                  <p className="text-slate-600 mb-4">Start by adding pass marks for your subjects and classes</p>
                  <Button 
                    onClick={() => setPassMarkDialogOpen(true)}
                    className="gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ backgroundColor: 'rgba(62, 45, 116)' }}
                  >
                    <Plus className="h-4 w-4" />
                    Add First Pass Mark
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {passMarks.length > 1 && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSelectAllPassMarks}
                          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                        >
                          {selectedPassMarks.length === passMarks.length ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                          {selectedPassMarks.length === passMarks.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      {selectedPassMarks.length > 0 && (
                        <div className="text-sm text-slate-600">
                          {selectedPassMarks.length} of {passMarks.length} selected
                        </div>
                      )}
                    </div>
                  )}
                  {passMarks.map((passMark) => (
                    <div key={passMark.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleSelectPassMark(passMark.id)}
                          className="flex items-center justify-center"
                        >
                          {selectedPassMarks.includes(passMark.id) ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{passMark.subject}</div>
                          <div className="text-sm text-slate-600">{passMark.class}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">{passMark.pass_mark}</div>
                          <div className="text-xs text-slate-500">Pass Mark</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditPassMark(passMark)} 
                          className="h-8 w-8 p-0 hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeletePassMark(passMark.id)} 
                          className="h-8 w-8 p-0 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900">Student Results</CardTitle>
                {selectedResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">
                        {selectedResults.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkPublish(true)}
                        disabled={bulkActionLoading}
                        className="h-8 w-8 p-0 hover:bg-emerald-100"
                        title="Publish Selected"
                      >
                        <Eye className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkPublish(false)}
                        disabled={bulkActionLoading}
                        className="h-8 w-8 p-0 hover:bg-amber-100"
                        title="Set to Draft"
                      >
                        <EyeOff className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBulkDeleteResults}
                        disabled={bulkActionLoading}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        title="Delete Selected"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-4 py-3 w-12">
                        {filtered.length > 0 && (
                          <button
                            onClick={handleSelectAllResults}
                            className="flex items-center justify-center"
                            title={selectedResults.length === filtered.length ? 'Deselect All' : 'Select All'}
                          >
                            {selectedResults.length === filtered.length ? (
                              <CheckSquare className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        )}
                      </TableHead>
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
                          <button
                            onClick={() => handleSelectResult(r.id)}
                            className="flex items-center justify-center"
                            title="Select this result"
                          >
                            {selectedResults.includes(r.id) ? (
                              <CheckSquare className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </TableCell>
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

