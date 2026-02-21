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
import { GraduationCap, Printer, Loader2, SearchX, Search, Award, TrendingUp, Users, CheckCircle, AlertCircle, RefreshCw, Download, Star, Trophy, Target, Calendar, BookOpen, BarChart3, Sparkles, Medal, Crown } from "lucide-react";

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
        
        // First try to get institution without status filter (more permissive)
        const { data, error } = await supabase
          .from("institutions")
          .select("id, name, logo_url, footer_message, status")
          .eq("slug", slug)
          .maybeSingle();
        
        console.log("Institution query result:", { data, error });
        
        if (data && data.status === 'active') {
          console.log("Found active institution:", data);
          setInstitution(data);
        } else if (error) {
          console.log("Institution query error:", error);
          
          // If RLS blocks, try with different approach
          const { data: allInstitutions } = await supabase
            .from("institutions")
            .select("id, name, logo_url, footer_message, slug, status")
            .eq("slug", slug);
          
          console.log("All institutions query result:", allInstitutions);
          
          if (allInstitutions && allInstitutions.length > 0) {
            const foundInstitution = allInstitutions.find(inst => inst.slug === slug);
            if (foundInstitution) {
              console.log("Found institution via fallback:", foundInstitution);
              setInstitution(foundInstitution);
            } else {
              console.log("No institution found with slug:", slug);
              setNotFound(true);
            }
          } else {
            console.log("No institutions found in fallback query");
            setNotFound(true);
          }
        } else if (data && data.status !== 'active') {
          console.log("Institution found but not active:", data);
          setNotFound(true);
        } else {
          console.log("No institution found with slug:", slug);
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
      // Fetch pass marks for this student's class
      const { data: passMarksData } = await supabase
        .from("pass_marks")
        .select("class, subject, pass_mark")
        .eq("institution_id", institution.id)
        .eq("class", resultData.class);

      setPassMarks(passMarksData || []);
      setResult(resultData as ResultData);
    } else {
      toast({ title: "No result found", description: "Check your register number and secret code.", variant: "destructive" });
    }
    setSearching(false);
  };

  if (loadingInst) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-lg py-8">
          <div className="mx-auto max-w-6xl px-4 flex items-center gap-6">
            <div className="relative">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 blur-xl"></div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-80 rounded-xl" />
              <Skeleton className="h-5 w-40 rounded-lg" />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-5xl space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Loading Portal...</span>
              </div>
            </div>
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <Skeleton className="h-7 w-48 rounded-xl bg-white/20" />
                    <Skeleton className="h-4 w-64 rounded-lg bg-white/10 mt-2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32 rounded-lg" />
                    <div className="relative">
                      <Skeleton className="h-14 w-full rounded-2xl" />
                      <Skeleton className="h-5 w-5 rounded-lg absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-28 rounded-lg" />
                    <div className="relative">
                      <Skeleton className="h-14 w-full rounded-2xl" />
                      <Skeleton className="h-5 w-5 rounded-lg absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <Card className="w-full max-w-2xl border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm relative">
          <CardContent className="p-12 text-center space-y-8">
            <div className="relative">
              <div className="mx-auto p-6 rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 w-24 h-24 flex items-center justify-center shadow-2xl">
                <SearchX className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl opacity-20 blur-2xl"></div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Institution Not Found</h2>
              <p className="text-slate-600 leading-relaxed text-lg max-w-md mx-auto">
                The institution <span className="font-mono bg-red-50 px-3 py-2 rounded-xl text-red-600 font-semibold border border-red-200">{slug}</span> does not exist or is inactive.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Go to Homepage
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
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-lg py-8 print:border-0 relative">
        <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-4">
          {institution?.logo_url && (
            <div className="relative">
              <img src={institution.logo_url} alt={institution.name} className="max-w-[140px] h-auto object-contain drop-shadow-lg" />
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-10 blur-xl"></div>
            </div>
          )}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{institution?.name}</h1>
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <p className="text-lg text-slate-600 font-medium">Student Result Portal</p>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4 relative">
        <div className="w-full max-w-6xl space-y-10">
          {!result ? (
            <div className="space-y-10">
              {/* Search Card */}
              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50 pb-10">
                  <div className="text-center space-y-6">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="p-4 rounded-3xl bg-white/20 backdrop-blur-sm shadow-2xl">
                        <Search className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl opacity-20 blur-2xl animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <CardTitle className="text-3xl font-bold text-white">Check Your Result</CardTitle>
                      <p className="text-white/90 text-lg max-w-2xl mx-auto leading-relaxed">
                        Enter your register number and secret code to view your academic performance
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  <form onSubmit={handleSearch} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="regNumber" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-600" />
                          Register Number
                        </Label>
                        <div className="relative group">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                          <Input 
                            id="regNumber"
                            value={regNumber} 
                            onChange={(e) => setRegNumber(e.target.value)} 
                            required 
                            placeholder="Enter your register number"
                            className="pl-12 h-14 border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl text-lg bg-white/80 backdrop-blur-sm transition-all duration-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="secretCode" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-600" />
                          Secret Code
                        </Label>
                        <div className="relative group">
                          <Award className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                          <Input 
                            id="secretCode"
                            type="password"
                            value={secretCode} 
                            onChange={(e) => setSecretCode(e.target.value)} 
                            required 
                            placeholder="Enter your secret code"
                            className="pl-12 h-14 border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 rounded-2xl text-lg bg-white/80 backdrop-blur-sm transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-16 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02]"
                      disabled={searching}
                    >
                      {searching ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          Searching Results...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5 mr-3" />
                          View My Result
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Instructions Card */}
              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 border-b border-slate-200/50">
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    How to Check Your Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-2xl">1</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-lg">Enter Register Number</h3>
                        <p className="text-slate-600 leading-relaxed">Your unique student identification number</p>
                      </div>
                    </div>
                    <div className="text-center space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-2xl">2</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-lg">Enter Secret Code</h3>
                        <p className="text-slate-600 leading-relaxed">Your confidential access code provided by institution</p>
                      </div>
                    </div>
                    <div className="text-center space-y-4 group">
                      <div className="relative">
                        <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <span className="text-emerald-600 font-bold text-2xl">3</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-300"></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-900 text-lg">View Results</h3>
                        <p className="text-slate-600 leading-relaxed">Instantly access your academic performance</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-4" id="result-card">
              {/* Result Header Card */}
              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50 pb-10">
                  <div className="text-center space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      {institution?.logo_url && (
                        <div className="relative">
                          <img src={institution.logo_url} alt="" className="max-w-[140px] h-auto object-contain drop-shadow-lg" />
                          <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-20 blur-2xl"></div>
                        </div>
                      )}
                      <div className="relative inline-flex items-center justify-center">
                        <div className="p-4 rounded-3xl bg-white/20 backdrop-blur-sm shadow-2xl">
                          <Trophy className="h-12 w-12 text-yellow-300" />
                        </div>
                        <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl opacity-20 blur-2xl animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <CardTitle className="text-3xl font-bold text-white">{institution?.name}</CardTitle>
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30">
                        <h2 className="text-2xl font-bold text-white">{result.student_name}</h2>
                      </div>
                      <div className="flex flex-wrap justify-center gap-6 text-white/90">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                          <Users className="h-5 w-5" />
                          <span className="font-medium">Reg: <span className="font-mono font-bold">{result.register_number}</span></span>
                        </div>
                        {result.class && (
                          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                            <BookOpen className="h-5 w-5" />
                            <span className="font-medium">Class: {result.class}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  {Array.isArray(result.subjects) && result.subjects.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg">
                          <BarChart3 className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Subject-wise Performance</h3>
                      </div>
                      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                        <Table>
                          <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <TableRow>
                              <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-6 py-4">Subject</TableHead>
                              <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-6 py-4 text-right">Marks Obtained</TableHead>
                              <TableHead className="text-sm font-bold text-slate-700 uppercase tracking-wider px-6 py-4 text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-slate-200">
                            {result.subjects.map((s: any, i: number) => {
                              const passMark = passMarks.find(pm => pm.subject === s.name && pm.class === result.class);
                              const status = passMark ? (s.marks >= passMark.pass_mark ? 'pass' : 'fail') : 'pass'; // Default to pass if no pass mark set
                              
                              return (
                                <TableRow key={i} className="hover:bg-slate-50 transition-colors group">
                                  <TableCell className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                                        <BookOpen className="h-4 w-4 text-indigo-600" />
                                      </div>
                                      <span className="font-semibold text-slate-900 text-lg">{s.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-75"></div>
                                        <span className="relative inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
                                          {s.marks}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-6 py-5 text-center">
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
                  )}
                  
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 pt-10">
                    {result.total != null && (
                      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 group hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-8 text-center">
                          <div className="relative mb-4">
                            <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <BarChart3 className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute -inset-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl opacity-20 blur-xl"></div>
                          </div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Total Marks</p>
                          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{result.total}</p>
                        </CardContent>
                      </Card>
                    )}
                    {result.grade && (
                      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 group hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-8 text-center">
                          <div className="relative mb-4">
                            <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <Award className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute -inset-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl opacity-20 blur-xl"></div>
                          </div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Grade</p>
                          <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{result.grade}</p>
                        </CardContent>
                      </Card>
                    )}
                    {result.rank && (
                      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 group hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-8 text-center">
                          <div className="relative mb-4">
                            <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 w-16 h-16 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <Crown className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute -inset-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl opacity-20 blur-xl"></div>
                          </div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Rank</p>
                          <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{result.rank}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center print:hidden">
                <Button 
                  onClick={() => window.print()} 
                  variant="outline" 
                  className="gap-3 h-14 px-8 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Printer className="h-5 w-5" />
                  Print Result
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setResult(null)} 
                  className="gap-3 h-14 px-8 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <RefreshCw className="h-5 w-5" />
                  Search Another Result
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {institution?.footer_message && (
        <footer className="bg-white/80 backdrop-blur-lg border-t border-slate-200/50 py-8 text-center print:border-0 relative">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <p className="text-slate-600 font-medium text-lg">{institution.footer_message}</p>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm text-slate-500">© 2024 {institution?.name}. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default StudentResult;
