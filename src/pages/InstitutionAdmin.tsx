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

import { Checkbox } from "@/components/ui/checkbox";

import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Eye, EyeOff, Search, FileSpreadsheet, Users, TrendingUp, Filter, Download, RefreshCw, ImageIcon, X, Settings, CheckCircle, AlertCircle, Plus, Edit2, Save, BookOpen, AlertTriangle, CheckSquare, Square, Loader2 } from "lucide-react";

import * as XLSX from "xlsx";
import { validateResultImport, type ResultImportIssue } from "@/lib/resultImport";



interface StudentResult {
  id: string;
  register_number: string;
  secret_code: string;
  student_name: string;
  class: string | null;
  subjects: SubjectMark[] | null;
  total: number | null;
  grade: string | null;
  rank: string | null;
  published: boolean;
  created_by: string | null;
}

interface SubjectMark {
  name: string;
  marks: number;
}

interface InstitutionSettings {
  name: string;
  logo_url: string | null;
  footer_message: string | null;
}

const normalizeSubjects = (value: unknown): SubjectMark[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): SubjectMark[] => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const subject = entry as Record<string, unknown>;
    if (typeof subject.name !== "string" || typeof subject.marks !== "number") return [];
    return [{ name: subject.name, marks: subject.marks }];
  });
};



interface PassMark {
  id: string;
  class: string;
  subject: string;
  pass_mark: number;
  institution_id: string;
  created_by: string | null;
  created_at: string;
}

interface ClassSubject {
  class: string;
  subjects: string[];
}

const InstitutionAdmin = () => {
  const { institutionId, user } = useAuth();

  const [results, setResults] = useState<StudentResult[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [previewIssues, setPreviewIssues] = useState<ResultImportIssue[]>([]);

  const [uploading, setUploading] = useState(false);

  const [publishImmediately, setPublishImmediately] = useState(true);


  const fileRef = useRef<HTMLInputElement>(null);

  // Institution settings state
  const [institutionData, setInstitutionData] = useState<InstitutionSettings | null>(null);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [loadingInstitution, setLoadingInstitution] = useState(false);

  // Pass marks state
  const [passMarks, setPassMarks] = useState<PassMark[]>([]);
  const [passMarksLoading, setPassMarksLoading] = useState(false);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [passMarkDialogOpen, setPassMarkDialogOpen] = useState(false);
  const [editingPassMark, setEditingPassMark] = useState<PassMark | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [newPassMark, setNewPassMark] = useState("");
  
  // Bulk actions state
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
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
    } catch (error) {
      console.error("Error fetching institution data:", error);
      toast({ title: "Error loading institution data", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
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
      
    } catch (error) {
      console.error("Error updating logo:", error);
      toast({ 
        title: "Error updating logo", 
        description: error instanceof Error ? error.message : "Unknown error occurred", 
        variant: "destructive" 
      });
    }
  };

  const fetchResults = async () => {
    if (!institutionId) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("student_results")
      .select("id, register_number, secret_code, student_name, class, subjects, total, grade, rank, published, created_by")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Could not load results", description: error.message, variant: "destructive" });
    }
    setResults((data ?? []).map((row) => ({
      ...row,
      subjects: normalizeSubjects(row.subjects),
    })));
    setLoading(false);
  };

  // Extract subjects and classes from existing results data
  const extractClassSubjects = () => {
    const classSubjectMap = new Map<string, Set<string>>();

    results.forEach(result => {
      if (result.class && result.subjects && Array.isArray(result.subjects)) {
        const className = result.class;
        
        if (!classSubjectMap.has(className)) {
          classSubjectMap.set(className, new Set());
        }
        
        const subjectSet = classSubjectMap.get(className);
        if (!subjectSet) return;
        result.subjects.forEach((subject) => subjectSet.add(subject.name));
      }
    });

    const classSubjectsArray: ClassSubject[] = Array.from(classSubjectMap.entries())
      .map(([className, subjects]) => ({
        class: className,
        subjects: Array.from(subjects).sort()
      }))
      .sort((a, b) => a.class.localeCompare(b.class));

    setClassSubjects(classSubjectsArray);
  };

  // Fetch pass marks from database
  const fetchPassMarks = async () => {
    if (!institutionId) return;
    setPassMarksLoading(true);

    try {
      const { data, error } = await supabase
        .from("pass_marks")
        .select("*")
        .eq("institution_id", institutionId)
        .order("class, subject");

      if (error) {
        console.error("Error fetching pass marks:", error);
        setPassMarks([]);
      } else {
        setPassMarks(data || []);
      }
    } catch (error) {
      console.error("Error fetching pass marks:", error);
      setPassMarks([]);
    } finally {
      setPassMarksLoading(false);
    }
  };


  useEffect(() => { fetchResults(); }, [institutionId, user?.id]);
  useEffect(() => { extractClassSubjects(); }, [results]);
  useEffect(() => { fetchPassMarks(); }, [institutionId, user?.id]);
  useEffect(() => { 
    console.log("InstitutionAdmin useEffect - institutionId:", institutionId);
    console.log("InstitutionAdmin useEffect - user:", user?.id);
    fetchInstitutionData(); 
  }, [institutionId]);



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["csv", "xls", "xlsx"].includes(extension)) {
      setPreviewData(null);
      setPreviewIssues([{ row: null, message: "Choose a CSV or Excel workbook." }]);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setPreviewData(null);
      setPreviewIssues([{ row: null, message: "The selected file could not be read." }]);
      toast({ title: "Could not read file", description: "Choose the spreadsheet and try again.", variant: "destructive" });
    };
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array", cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
        if (!firstSheet) {
          setPreviewData([]);
          setPreviewIssues([{ row: null, message: "The workbook does not contain a worksheet." }]);
          return;
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
        const validation = validateResultImport(rows, results.map((result) => result.register_number));
        setPreviewData(rows);
        setPreviewIssues(validation.issues);
      } catch {
        setPreviewData(null);
        setPreviewIssues([{ row: null, message: "This spreadsheet could not be parsed. Save it as CSV or Excel and retry." }]);
      }
    };
    reader.readAsArrayBuffer(file);
  };



  const handleBulkInsert = async () => {
    if (!previewData) return;
    const validation = validateResultImport(previewData, results.map((result) => result.register_number));
    setPreviewIssues(validation.issues);
    if (validation.issues.length > 0 || validation.rows.length === 0) {
      toast({ title: "Review the spreadsheet", description: "Fix the listed rows before uploading.", variant: "destructive" });
      return;
    }
    if (!institutionId) {
      toast({ title: "Institution not assigned", description: "Ask the platform administrator to assign your institution access.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) throw userError ?? new Error("Please sign in again before uploading.");

      const registerNumbers = validation.rows.map((row) => row.register_number);
      const { data: existingRows, error: duplicateCheckError } = await supabase
        .from("student_results")
        .select("register_number")
        .eq("institution_id", institutionId)
        .in("register_number", registerNumbers);
      if (duplicateCheckError) throw duplicateCheckError;
      if (existingRows && existingRows.length > 0) {
        const existingNumbers = new Set(existingRows.map((row) => row.register_number.toLowerCase()));
        const issues = validation.rows
          .filter((row) => existingNumbers.has(row.register_number.toLowerCase()))
          .map((row) => ({ row: row.sourceRow, message: `Register number ${row.register_number} already exists in this institution.` }));
        setPreviewIssues(issues);
        toast({ title: "Duplicate register numbers", description: "Remove existing students from the spreadsheet before uploading.", variant: "destructive" });
        return;
      }

      const rows = validation.rows.map(({ sourceRow: _sourceRow, ...row }) => ({
        ...row,
        institution_id: institutionId,
        created_by: currentUser.id,
        published: publishImmediately,
      }));
      const { error } = await supabase.from("student_results").insert(rows);
      if (error) throw error;

      const { data: insertedResults, error: refreshError } = await supabase
        .from("student_results")
        .select("id, register_number, secret_code, student_name, class, subjects, total, grade, rank, published, created_by")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false });
      if (refreshError) throw refreshError;
      setResults((insertedResults ?? []).map((row) => ({
        ...row,
        subjects: normalizeSubjects(row.subjects),
      })));
      toast({
        title: `${rows.length} results uploaded successfully`,
        description: publishImmediately ? "Results are published and visible to students." : "Saved as drafts — publish them when ready.",
      });
      setUploadDialogOpen(false);
      setPreviewData(null);
      setPreviewIssues([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The results could not be saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from("student_results").update({ published: !current }).eq("id", id);
    if (error) {
      toast({ title: "Could not update result visibility", description: error.message, variant: "destructive" });
      return;
    }
    await fetchResults();
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
    } catch (error) {
      toast({ 
        title: "Bulk delete failed", 
        description: error instanceof Error ? error.message : "Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setBulkActionLoading(false);
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

    try {
      if (editingPassMark) {
        // Update existing pass mark
        const { error } = await supabase
          .from("pass_marks")
          .update({ pass_mark: passMarkValue })
          .eq("id", editingPassMark.id);

        if (error) throw error;
        
        toast({ title: "Pass mark updated successfully" });
        setPassMarkDialogOpen(false);
        setEditingPassMark(null);
        resetPassMarkForm();
        fetchPassMarks();
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

        if (error) throw error;
        
        toast({ title: "Pass mark created successfully" });
        setPassMarkDialogOpen(false);
        resetPassMarkForm();
        fetchPassMarks();
      }
    } catch (error) {
      toast({ 
        title: "Operation failed", 
        description: error instanceof Error ? error.message : "Please try again.", 
        variant: "destructive" 
      });
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

    try {
      const { error } = await supabase.from("pass_marks").delete().eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Pass mark deleted successfully" });
      fetchPassMarks();
    } catch (error) {
      toast({ 
        title: "Delete failed", 
        description: error instanceof Error ? error.message : "Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const resetPassMarkForm = () => {
    setSelectedClass("");
    setSelectedSubject("");
    setNewPassMark("");
    setEditingPassMark(null);
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
    } catch (error) {
      toast({ 
        title: `Bulk ${publish ? 'publish' : 'draft'} failed`, 
        description: error instanceof Error ? error.message : "Please try again.", 
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
                      
                      {previewIssues.length > 0 && (
                        <div role="alert" className="max-h-32 overflow-y-auto border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                          <p className="font-semibold">Fix these issues before uploading:</p>
                          <ul className="mt-1 list-disc pl-5">
                            {previewIssues.map((issue, index) => (
                              <li key={`${issue.row ?? "sheet"}-${index}`}>
                                {issue.row ? `Row ${issue.row}: ` : ""}{issue.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {previewData && previewData.length > 0 && (
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
                                        {String(v ?? "")}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="publish-immediately"
                              checked={publishImmediately}
                              onCheckedChange={(checked) => setPublishImmediately(checked === true)}
                            />
                            <Label htmlFor="publish-immediately" className="text-sm text-slate-700 cursor-pointer">
                              Publish immediately (students can view results right away)
                            </Label>
                          </div>
                          <Button 
                            onClick={handleBulkInsert} 

                            disabled={uploading || previewIssues.length > 0} 
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
                    {institutionData?.logo_url ? (
                      <img 
                        src={institutionData.logo_url} 
                        alt="Institution logo" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
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
                    <p className="text-sm text-slate-600">Set custom pass marks for subjects by class</p>
                  </div>
                </div>
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select class</option>
                          {classSubjects.map(cs => (
                            <option key={cs.class} value={cs.class}>{cs.class}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium text-slate-700">Subject</Label>
                        <select
                          id="subject"
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          disabled={!selectedClass}
                        >
                          <option value="">Select subject</option>
                          {selectedClass && classSubjects.find(cs => cs.class === selectedClass)?.subjects.map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passMark" className="text-sm font-medium text-slate-700">Pass Mark</Label>
                        <Input
                          id="passMark"
                          type="number"
                          min="0"
                          max="100"
                          value={newPassMark}
                          onChange={(e) => setNewPassMark(e.target.value)}
                          placeholder="Enter pass mark (0-100)"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleSavePassMark}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          {editingPassMark ? 'Update' : 'Add'} Pass Mark
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setPassMarkDialogOpen(false)}
                          className="flex-1 border-slate-300 hover:bg-slate-50 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {passMarksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : classSubjects.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-slate-300 mb-3 mx-auto" />
                  <p className="text-slate-600 font-medium">No subjects found</p>
                  <p className="text-slate-500 text-sm mt-1">Upload student results first to see subjects and classes</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {classSubjects.map((classSubject) => (
                    <div key={classSubject.class} className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <BookOpen className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Class {classSubject.class}</h3>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                          {classSubject.subjects.length} subjects
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classSubject.subjects.map((subject) => {
                          const existingPassMark = passMarks.find(
                            pm => pm.class === classSubject.class && pm.subject === subject
                          );
                          return (
                            <div key={subject} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-900">{subject}</span>
                                {existingPassMark ? (
                                  <Badge 
                                    variant="secondary" 
                                    className={`${
                                      existingPassMark.pass_mark >= 50 
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {existingPassMark.pass_mark}%
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-red-200 text-red-600">
                                    Not Set
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {existingPassMark ? (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEditPassMark(existingPassMark)} 
                                      className="h-8 w-8 p-0 hover:bg-indigo-50"
                                      title="Edit Pass Mark"
                                    >
                                      <Edit2 className="h-4 w-4 text-indigo-600" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeletePassMark(existingPassMark.id)} 
                                      className="h-8 w-8 p-0 hover:bg-red-50"
                                      title="Delete Pass Mark"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedClass(classSubject.class);
                                      setSelectedSubject(subject);
                                      setNewPassMark("");
                                      setEditingPassMark(null);
                                      setPassMarkDialogOpen(true);
                                    }} 
                                    className="h-8 w-8 p-0 hover:bg-indigo-50"
                                    title="Set Pass Mark"
                                  >
                                    <Plus className="h-4 w-4 text-indigo-600" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
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

