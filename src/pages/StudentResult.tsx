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
import { GraduationCap, Printer, Loader2, SearchX } from "lucide-react";

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

const StudentResult = () => {
  const { slug } = useParams<{ slug: string }>();
  const [institution, setInstitution] = useState<InstitutionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [regNumber, setRegNumber] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingInst, setLoadingInst] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("institutions")
      .select("id, name, logo_url, footer_message")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInstitution(data);
        else setNotFound(true);
        setLoadingInst(false);
      });
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

    const { data } = await supabase
      .from("student_results")
      .select("student_name, register_number, class, subjects, total, grade, rank")
      .eq("institution_id", institution.id)
      .eq("register_number", regNumber)
      .eq("secret_code", secretCode)
      .eq("published", true)
      .maybeSingle();

    if (data) {
      setResult(data as ResultData);
    } else {
      toast({ title: "No result found", description: "Check your register number and secret code.", variant: "destructive" });
    }
    setSearching(false);
  };

  if (loadingInst) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card py-4">
          <div className="mx-auto max-w-2xl px-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-40" />
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center py-8 px-4">
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center animate-fade-in">
          <CardContent className="pt-8 pb-8 space-y-3">
            <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold">Institution Not Found</p>
            <p className="text-sm text-muted-foreground">The institution "<span className="font-mono">{slug}</span>" does not exist or is inactive.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card py-4 print:border-0">
        <div className="mx-auto max-w-2xl px-4 flex items-center gap-3">
          {institution?.logo_url ? (
            <img src={institution.logo_url} alt={institution.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-xl font-bold">{institution?.name}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-2xl space-y-6 animate-fade-in">
          {!result ? (
            <Card>
              <CardHeader>
                <CardTitle>Check Your Result</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Register Number</Label>
                    <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} required placeholder="Enter your register number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Code</Label>
                    <Input value={secretCode} onChange={(e) => setSecretCode(e.target.value)} required placeholder="Enter your secret code" />
                  </div>
                  <Button type="submit" className="w-full" disabled={searching}>
                    {searching ? <><Loader2 className="h-4 w-4 animate-spin" />Searching...</> : "View Result"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 print:space-y-2" id="result-card">
              <Card>
                <CardHeader className="text-center border-b pb-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {institution?.logo_url ? (
                      <img src={institution.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary">
                        <GraduationCap className="h-7 w-7 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{institution?.name}</CardTitle>
                  <p className="text-lg font-semibold mt-2">{result.student_name}</p>
                  <div className="flex justify-center gap-6 text-sm text-muted-foreground mt-1">
                    <span>Reg: <span className="font-mono">{result.register_number}</span></span>
                    {result.class && <span>Class: {result.class}</span>}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {Array.isArray(result.subjects) && result.subjects.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Marks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.subjects.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell className="text-right font-mono">{s.marks}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center">
                    {result.total != null && (
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{result.total}</p>
                      </div>
                    )}
                    {result.grade && (
                      <div>
                        <p className="text-sm text-muted-foreground">Grade</p>
                        <p className="text-2xl font-bold">{result.grade}</p>
                      </div>
                    )}
                    {result.rank && (
                      <div>
                        <p className="text-sm text-muted-foreground">Rank</p>
                        <p className="text-2xl font-bold">{result.rank}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 print:hidden">
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />Print
                </Button>
                <Button variant="secondary" onClick={() => setResult(null)}>Search Again</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {institution?.footer_message && (
        <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground print:border-0">
          {institution.footer_message}
        </footer>
      )}
    </div>
  );
};

export default StudentResult;
