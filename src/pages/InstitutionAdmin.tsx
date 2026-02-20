import { useEffect, useState, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import AdminLayout from "@/components/AdminLayout";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent } from "@/components/ui/card";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Eye, EyeOff, Search, FileSpreadsheet, Pencil } from "lucide-react";

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
  created_by: string; // Track which admin uploaded the data
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
      .select("*")
      .eq("institution_id", institutionId)
      .eq("created_by", user?.id) // Only show results uploaded by current admin
      .order("created_at", { ascending: false });

    setResults((data as StudentResult[]) || []);
    setLoading(false);
  };



  useEffect(() => { fetchResults(); }, [institutionId, user]);



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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Student Results</h1>
          {!loading && <Badge variant="secondary" className="ml-1">{results.length}</Badge>}
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>

          <DialogTrigger asChild>

            <Button className="gap-2"><Upload className="h-4 w-4" />Upload CSV/Excel</Button>

          </DialogTrigger>

          <DialogContent className="max-w-2xl">

            <DialogHeader>
  <DialogTitle>Upload Results</DialogTitle>
  <DialogDescription>
    Upload a CSV or Excel file with student results. Required columns: register_number, secret_code, student_name.
  </DialogDescription>
</DialogHeader>

            <div className="space-y-4">
              <Input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />

              {previewData && (

                <>

                  <p className="text-sm font-medium">{previewData.length} rows found. Preview:</p>
                  <div className="max-h-60 overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(previewData[0] || {}).map((k) => (
                            <TableHead key={k} className="text-xs whitespace-nowrap">{k}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((v, j) => (
                              <TableCell key={j} className="text-xs">{String(v)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button onClick={handleBulkInsert} disabled={uploading} className="w-full">

                    {uploading ? "Uploading..." : `Upload ${previewData.length} Results`}

                  </Button>

                </>

              )}

            </div>

          </DialogContent>

        </Dialog>
      </div>



      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or register number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>



      <Card>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Register No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Class</TableHead>
                  <TableHead className="hidden sm:table-cell">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No results found</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.register_number}</TableCell>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.class || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.total ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.grade || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.published ? "default" : "secondary"} className="text-xs">
                        {r.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => togglePublish(r.id, r.published)} title={r.published ? "Unpublish" : "Publish"}>
                        {r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default InstitutionAdmin;

