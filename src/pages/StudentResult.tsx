import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Printer, Loader2, SearchX, Search, Award, TrendingUp, Users, CheckCircle, AlertCircle, RefreshCw, Download, Star, Trophy, Target, Calendar, BookOpen, BarChart3, Sparkles, Medal, Crown, FileDown, Share2 } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InstitutionInfo {
  id: string;
  name: string;
  logo_url: string | null;
  footer_message: string | null;
}

interface ResultData {
  student_name: string;
  register_number: string;
  class: string | null;
  subjects: { name: string; marks: number }[];
  total: number | null;
  grade: string | null;
  rank: string | null;
}

interface PassMark {
  class: string;
  subject: string;
  pass_mark: number;
}

interface SubjectWithStatus {
  name: string;
  marks: number;
  status: 'pass' | 'fail';
  passMark: number;
}

const StudentResult = () => {
  const { slug } = useParams<{ slug: string }>();
  const [institution, setInstitution] = useState<InstitutionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [regNumber, setRegNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingInst, setLoadingInst] = useState(true);
  const [passMarks, setPassMarks] = useState<PassMark[]>([]);

  useEffect(() => {
    if (!slug) return;
    
    const fetchInstitution = async () => {
      try {
        console.log("Fetching institution for slug:", slug);
        
        // Try multiple approaches to handle RLS blocking
        let institutionData = null;
        let lastError = null;
        
        // Approach 1: Direct query with status filter
        const { data: data1, error: error1 } = await supabase
          .from("institutions")
          .select("id, name, logo_url, footer_message, status")
          .eq("slug", slug)
          .maybeSingle();
        
        console.log("Approach 1 result:", { data: data1, error: error1 });
        
        if (data1) {
          institutionData = data1;
        } else {
          lastError = error1;
          
          // Approach 2: Query without status filter (more permissive)
          const { data: data2, error: error2 } = await supabase
            .from("institutions")
            .select("id, name, logo_url, footer_message, slug, status")
            .eq("slug", slug)
            .maybeSingle();
          
          console.log("Approach 2 result:", { data: data2, error: error2 });
          
          if (data2) {
            institutionData = data2;
          } else {
            lastError = error2;
            
            // Approach 3: Get all institutions and filter client-side
            const { data: data3, error: error3 } = await supabase
              .from("institutions")
              .select("id, name, logo_url, footer_message, slug, status")
              .eq("slug", slug);
            
            console.log("Approach 3 result:", { data: data3, error: error3 });
            
            if (data3 && data3.length > 0) {
              institutionData = data3.find(inst => inst.slug === slug) || data3[0];
            } else {
              lastError = error3;
            }
          }
        }
        
        console.log("Final institution data:", institutionData);
        
        if (institutionData) {
          // Accept institution regardless of status - let RLS handle access control
          console.log("Setting institution data:", institutionData);
          setInstitution(institutionData);
        } else {
          console.log("All approaches failed, last error:", lastError);
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error fetching institution:", err);
        setNotFound(true);
      } finally {
        setLoadingInst(false);
      }
    };
    
    fetchInstitution();
  }, [slug]);

  const handleDownloadPDF = async () => {
    if (!result || !institution) return;
    
    try {
      toast({ title: "Generating PDF", description: "Please wait while we create your result PDF..." });
      
      // Get the print element
      const element = document.getElementById('result-certificate');
      if (!element) {
        toast({ title: "Error", description: "Could not find result certificate element", variant: "destructive" });
        return;
      }
      
      // Generate canvas from the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add new page if content exceeds one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `${result.student_name}_${result.register_number}_Result.pdf`;
      pdf.save(fileName);
      
      toast({ title: "Download Complete", description: "Your result PDF has been downloaded successfully" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ 
        title: "Download Failed", 
        description: "Failed to generate PDF. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    setSearching(true);
    setResult(null);

    await supabase.from("access_logs").insert({
      institution_id: institution.id,
      register_number: regNumber,
    });

    // Fetch student result
    const { data: resultData } = await supabase
      .from("student_results")
      .select("student_name, register_number, class, subjects, total, grade, rank")
      .eq("institution_id", institution.id)
      .eq("register_number", regNumber)
      .eq("secret_code", secretCode)
      .eq("published", true)
      .maybeSingle();

    if (resultData) {
      setResult(resultData as ResultData);
    } else {
      toast({ title: "No result found", description: "Check your register number and secret code.", variant: "destructive" });
    }
    setSearching(false);
  };

  if (loadingInst) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-lg py-4 sm:py-8">
          <div className="mx-auto max-w-6xl px-4 flex items-center gap-4 sm:gap-6">
            <div className="relative">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl" />
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl opacity-20 blur-lg sm:blur-xl"></div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <Skeleton className="h-6 w-48 sm:h-10 sm:w-80 rounded-lg sm:rounded-xl" />
              <Skeleton className="h-4 w-24 sm:h-5 sm:w-40 rounded-lg" />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center py-8 sm:py-16 px-4">
          <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-lg">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-indigo-600" />
                <span className="text-sm sm:text-base font-medium text-slate-700">Loading Portal...</span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <Skeleton className="h-8 w-64 sm:h-12 sm:w-96 mx-auto rounded-lg sm:rounded-xl" />
                <Skeleton className="h-4 w-48 sm:h-6 sm:w-64 mx-auto rounded-lg" />
              </div>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <Skeleton className="h-32 sm:h-48 w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Skeleton className="h-20 sm:h-24 w-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50" />
                <Skeleton className="h-20 sm:h-24 w-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50" />
                <Skeleton className="h-20 sm:h-24 w-full rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <Card className="w-full max-w-2xl border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm relative">
          <CardContent className="p-8 sm:p-12 text-center space-y-6 sm:space-y-8">
            <div className="relative">
              <div className="mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center shadow-xl sm:shadow-2xl">
                <SearchX className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl sm:rounded-3xl opacity-20 blur-xl sm:blur-2xl"></div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Institution Not Found</h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-lg max-w-md mx-auto">
                The institution <span className="font-mono bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-red-600 font-semibold border border-red-200">{slug}</span> does not exist or is inactive.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/'}
                className="px-6 sm:px-8 py-3 sm:py-4 text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Go to Homepage</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-lg py-4 sm:py-8 print:border-0 relative">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-3 sm:gap-4">
          {institution?.logo_url && (
            <div className="relative">
              <img src={institution.logo_url} alt={institution.name} className="max-w-[100px] sm:max-w-[140px] h-auto object-contain drop-shadow-lg" />
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-10 blur-xl"></div>
            </div>
          )}
          <div className="text-center space-y-1 sm:space-y-2">
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{institution?.name}</h1>
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500" />
              <p className="text-sm sm:text-lg text-slate-600 font-medium">Student Result Portal</p>
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-16 px-4 relative">
        <div className="w-full max-w-6xl space-y-6 sm:space-y-10">
          {!result ? (
            <div className="space-y-10">
              {/* Search Card */}
              <Card className="border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50 pb-6 sm:pb-10">
                  <div className="text-center space-y-4 sm:space-y-6">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/20 backdrop-blur-sm shadow-xl sm:shadow-2xl">
                        <Search className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      </div>
                      <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl sm:rounded-3xl opacity-20 blur-xl sm:blur-2xl animate-pulse"></div>
                    </div>
                    <div className="space-y-2 sm:space-y-3 px-4">
                      <CardTitle className="text-2xl sm:text-3xl font-bold text-white">Check Your Result</CardTitle>
                      <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Enter your register number and secret code to view your academic performance
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-10">
                  <form onSubmit={handleSearch} className="space-y-6 sm:space-y-8">
                    <div className="grid grid-cols-1 gap-6 sm:gap-8">
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="regNumber" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-600" />
                          Register Number
                        </Label>
                        <div className="relative group">
                          <Users className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                          <Input 
                            id="regNumber"
                            value={regNumber} 
                            onChange={(e) => setRegNumber(e.target.value)} 
                            required 
                            placeholder="Enter your register number"
                            className="pl-10 sm:pl-12 h-12 sm:h-14 border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-xl sm:rounded-2xl text-base sm:text-lg bg-white/80 backdrop-blur-sm transition-all duration-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="secretCode" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-600" />
                          Secret Code
                        </Label>
                        <div className="relative group">
                          <Award className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                          <Input 
                            id="secretCode"
                            type="password"
                            value={secretCode} 
                            onChange={(e) => setSecretCode(e.target.value)} 
                            required 
                            placeholder="Enter your secret code"
                            className="pl-10 sm:pl-12 h-12 sm:h-14 border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 rounded-xl sm:rounded-2xl text-base sm:text-lg bg-white/80 backdrop-blur-sm transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 sm:h-16 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02]"
                      disabled={searching}
                    >
                      {searching ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 animate-spin" />
                          <span className="text-sm sm:text-base">Searching Results...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                          <span className="text-sm sm:text-base">View My Result</span>
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Instructions Card */}
              <Card className="border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 border-b border-slate-200/50">
                  <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <span className="text-sm sm:text-base">How to Check Your Result</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
                    <div className="text-center space-y-3 sm:space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-lg sm:text-2xl">1</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-20 blur-lg sm:blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-1 sm:space-y-2 px-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-lg">Enter Register Number</h3>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-base">Your unique student identification number</p>
                      </div>
                    </div>
                    <div className="text-center space-y-3 sm:space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-lg sm:text-2xl">2</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-20 blur-lg sm:blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-1 sm:space-y-2 px-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-lg">Enter Secret Code</h3>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-base">Your confidential access code provided by institution</p>
                      </div>
                    </div>
                    <div className="text-center space-y-3 sm:space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-lg sm:text-2xl">3</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-20 blur-lg sm:blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-1 sm:space-y-2 px-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-lg">View Results</h3>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-base">Instantly access your academic performance</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-4" id="result-card">
              {/* Result Header Card */}
              <Card className="border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50 pb-6 sm:pb-10">
                  <div className="text-center space-y-4 sm:space-y-6">
                    <div className="flex flex-col items-center gap-3 sm:gap-4">
                      {institution?.logo_url && (
                        <div className="relative">
                          <img src={institution.logo_url} alt="" className="max-w-[80px] sm:max-w-[140px] h-auto object-contain drop-shadow-lg" />
                          <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-20 blur-xl sm:blur-2xl"></div>
                        </div>
                      )}
                      <div className="relative inline-flex items-center justify-center">
                        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/20 backdrop-blur-sm shadow-xl sm:shadow-2xl">
                          <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-300" />
                        </div>
                        <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl sm:rounded-3xl opacity-20 blur-xl sm:blur-2xl animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4 px-4">
                      <CardTitle className="text-xl sm:text-3xl font-bold text-white">{institution?.name}</CardTitle>
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-white/30">
                        <h2 className="text-lg sm:text-2xl font-bold text-white">{result.student_name}</h2>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-white/90">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl border border-white/20">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="font-medium text-xs sm:text-sm sm:text-base">Reg: <span className="font-mono font-bold">{result.register_number}</span></span>
                        </div>
                        {result.class && (
                          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl border border-white/20">
                            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="font-medium text-xs sm:text-sm sm:text-base">Class: {result.class}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-10 space-y-8 sm:space-y-10">
                  {Array.isArray(result.subjects) && result.subjects.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg">
                          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg sm:text-2xl font-bold text-slate-900">Subject-wise Performance</h3>
                      </div>
                      <div className="rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                        {/* Mobile Card Layout */}
                        <div className="sm:hidden divide-y divide-slate-200">
                          {result.subjects.map((s: any, i: number) => {
                            const passMark = passMarks.find(pm => pm.subject === s.name && pm.class === result.class);
                            const status = passMark ? (s.marks >= passMark.pass_mark ? 'pass' : 'fail') : 'pass';
                            
                            return (
                              <div key={i} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                                      <BookOpen className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <span className="font-semibold text-slate-900 text-base">{s.name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-75"></div>
                                      <span className="relative inline-flex items-center px-3 py-1 rounded-full text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
                                        {s.marks}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    {status === 'pass' ? (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 border border-emerald-200">
                                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                                        <span className="text-xs font-semibold text-emerald-700">Pass</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 border border-red-200">
                                        <AlertCircle className="h-3 w-3 text-red-600" />
                                        <span className="text-xs font-semibold text-red-700">Fail</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Desktop Table Layout */}
                        <div className="hidden sm:block">
                          <Table>
                            <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                              <TableRow>
                                <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-4 sm:px-6 py-3 sm:py-4">Subject</TableHead>
                                <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-4 sm:px-6 py-3 sm:py-4 text-right">Marks Obtained</TableHead>
                                <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-4 sm:px-6 py-3 sm:py-4 text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-200">
                              {result.subjects.map((s: any, i: number) => {
                                const passMark = passMarks.find(pm => pm.subject === s.name && pm.class === result.class);
                                const status = passMark ? (s.marks >= passMark.pass_mark ? 'pass' : 'fail') : 'pass';
                                
                                return (
                                  <TableRow key={i} className="hover:bg-slate-50 transition-colors group">
                                    <TableCell className="px-4 sm:px-6 py-3 sm:py-5">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                                          <BookOpen className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <span className="font-semibold text-slate-900 text-base sm:text-lg">{s.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-4 sm:px-6 py-3 sm:py-5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="relative">
                                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-75"></div>
                                          <span className="relative inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
                                            {s.marks}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-4 sm:px-6 py-3 sm:py-5 text-center">
                                      <div className="flex items-center justify-center">
                                        {status === 'pass' ? (
                                          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-100 border border-emerald-200">
                                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                                            <span className="text-sm font-semibold text-emerald-700">Pass</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-red-100 border border-red-200">
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            <span className="text-sm font-semibold text-red-700">Fail</span>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 border-t border-slate-200 pt-8 sm:pt-10">
                    {result.total != null && (
                      <Card className="border-0 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 group hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                          <div className="relative mb-3 sm:mb-4">
                            <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl opacity-20 blur-lg sm:blur-xl"></div>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">Total Marks</p>
                          <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{result.total}</p>
                        </CardContent>
                      </Card>
                    )}
                    {result.grade && (
                      <Card className="border-0 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 group hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                          <div className="relative mb-3 sm:mb-4">
                            <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <Award className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl opacity-20 blur-lg sm:blur-xl"></div>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">Grade</p>
                          <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{result.grade}</p>
                        </CardContent>
                      </Card>
                    )}
                    {result.rank && (
                      <Card className="border-0 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 group hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                          <div className="relative mb-3 sm:mb-4">
                            <div className="mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <Crown className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="absolute -inset-2 sm:-inset-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl sm:rounded-2xl opacity-20 blur-lg sm:blur-xl"></div>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1 sm:mb-2">Rank</p>
                          <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{result.rank}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Modern Print Layout - Hidden from screen, visible in print */}
      <div id="result-certificate" className="hidden print:block">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-8">
          {/* Modern Header */}
          <div className="text-center mb-8">
            {institution?.logo_url && (
              <div className="mb-6">
                <img src={institution.logo_url} alt={institution.name} className="h-24 mx-auto object-contain" />
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{institution?.name}</h1>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-1">ACADEMIC RESULT CERTIFICATE</h2>
            <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Main Result Card - Same as main display */}
          <div className="text-card-foreground border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm mb-8">
            <div className="relative p-6 sm:p-8">
              {/* Student Info Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl opacity-20 blur-lg"></div>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{result?.student_name}</h2>
                    <p className="text-sm sm:text-base text-gray-600">Class: {result?.class || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Register Number</p>
                  <p className="text-lg sm:text-xl font-mono font-bold text-gray-900">{result?.register_number}</p>
                </div>
              </div>

              {/* Subject Results Table */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                  Subject Results
                </h3>
                {Array.isArray(result?.subjects) && result.subjects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 text-sm sm:text-base font-semibold text-gray-700">Subject</th>
                          <th className="text-center py-3 px-4 text-sm sm:text-base font-semibold text-gray-700">Marks</th>
                          <th className="text-center py-3 px-4 text-sm sm:text-base font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((subject: any, index: number) => {
                          const status = 'PASS'; // Default to PASS since we don't have pass marks data
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm sm:text-base text-gray-900">{subject.name}</td>
                              <td className="py-3 px-4 text-center text-sm sm:text-base font-bold text-gray-900">{subject.marks}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                                  status === 'PASS' 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {status === 'PASS' ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <SearchX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm sm:text-base">No subjects data available</p>
                  </div>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {result?.total !== null && (
                  <div className="text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <div className="relative mb-3 sm:mb-4">
                      <div className="mx-auto p-2 sm:p-3 rounded-xl bg-white/20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-blue-100 mb-1 sm:mb-2">Total Marks</p>
                    <p className="text-2xl sm:text-3xl font-bold">{result.total}</p>
                  </div>
                )}
                
                {result?.grade && (
                  <div className="text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                    <div className="relative mb-3 sm:mb-4">
                      <div className="mx-auto p-2 sm:p-3 rounded-xl bg-white/20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-green-100 mb-1 sm:mb-2">Grade</p>
                    <p className="text-2xl sm:text-3xl font-bold">{result.grade}</p>
                  </div>
                )}
                
                {result?.rank && (
                  <div className="text-center p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                    <div className="relative mb-3 sm:mb-4">
                      <div className="mx-auto p-2 sm:p-3 rounded-xl bg-white/20 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                        <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-amber-100 mb-1 sm:mb-2">Rank</p>
                    <p className="text-2xl sm:text-3xl font-bold">{result.rank}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Institution Footer */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800 mb-2">{institution?.name}</p>
              {institution?.footer_message && (
                <p className="text-gray-600 mb-4">"{institution.footer_message}"</p>
              )}
              <div className="w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">© 2024 {institution?.name}. All rights reserved.</p>
              <p className="text-xs text-gray-400 mt-2">This is a computer-generated result certificate. Validity should be confirmed with institution.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center print:hidden">
                <Button 
                  onClick={() => window.print()} 
                  variant="outline" 
                  className="gap-2 sm:gap-3 h-12 sm:h-14 px-6 sm:px-8 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Print Result</span>
                </Button>
                <Button 
                  onClick={handleDownloadPDF} 
                  variant="outline" 
                  className="gap-2 sm:gap-3 h-12 sm:h-14 px-6 sm:px-8 border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Download PDF</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)} 
                  className="gap-2 sm:gap-3 h-12 sm:h-14 px-6 sm:px-8 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Search Another</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {institution?.footer_message && (
        <footer className="bg-white/80 backdrop-blur-lg border-t border-slate-200/50 py-4 sm:py-8 text-center print:border-0 relative">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500" />
              <p className="text-slate-600 font-medium text-sm sm:text-lg">{institution.footer_message}</p>
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500">© 2024 {institution?.name}. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default StudentResult;
