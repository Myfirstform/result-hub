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

import { GraduationCap, Loader2, SearchX, Search, Award, TrendingUp, Users, CheckCircle, AlertCircle, RefreshCw, Download, Star, Trophy, Target, Calendar, BookOpen, BarChart3, Sparkles, Medal, Crown, FileDown } from "lucide-react";

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

  published: boolean;

  created_by: string | null;

}

interface PassMark {

  id: string;

  class: string;

  subject: string;

  pass_mark: number;

  institution_id: string;

  created_by: string | null;

  created_at: string;

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

  


  // Default logo URL (using the website icon)

  const defaultLogoUrl = "/icon.png";

  // Fetch pass marks for the institution
  const fetchPassMarks = async (institutionId: string) => {
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
    }
  };



  useEffect(() => {

    if (!slug) return;

    

    const fetchInstitution = async () => {
      try {
        console.log("Fetching institution for slug:", slug);
        
        // Retry logic for network timeouts
        let retryCount = 0;
        const maxRetries = 3;
        let institutionData = null;
        let error = null;
        
        while (retryCount < maxRetries && !institutionData) {
          try {
            // Add timeout to the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const { data: data, error: err } = await supabase
              .from("institutions")
              .select("id, name, logo_url, footer_message, status")
              .eq("slug", slug)
              .maybeSingle();
            
            clearTimeout(timeoutId);
            
            if (err) {
              throw err;
            }
            
            institutionData = data;
            error = err;
            break;
          } catch (err) {
            retryCount++;
            console.log(`Retry ${retryCount}/${maxRetries} failed:`, err);
            
            if (retryCount < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            } else {
              error = err;
            }
          }
        }
        
        console.log("Institution query result:", { data: institutionData, error });
        
        if (institutionData) {
          setInstitution(institutionData);
        } else {
          console.log("Institution not found after retries:", error);
          
          // Fallback: Try to use cached data or default
          const fallbackData = {
            id: 'fallback',
            name: 'Institution',
            logo_url: null,
            footer_message: 'Result Portal',
            status: 'active'
          };
          
          setInstitution(fallbackData);
          toast({ 
            title: "Network Issue", 
            description: "Using offline mode. Some features may be limited.",
            variant: "destructive" 
          });
        }
      } catch (err) {
        console.error("Error fetching institution:", err);
        
        // Fallback for critical errors
        const fallbackData = {
          id: 'fallback',
          name: 'Institution',
          logo_url: null,
          footer_message: 'Result Portal',
          status: 'active'
        };
        
        setInstitution(fallbackData);
        toast({ 
          title: "Network Error", 
          description: "Unable to connect. Using offline mode.",
          variant: "destructive" 
        });
      } finally {
        setLoadingInst(false);
      }
    };

    

    fetchInstitution();

  }, [slug]);



  const handleDownload = async () => {
    if (!result || !institution) return;
    
    try {
      // Create certificate element
      const certificateElement = document.createElement('div');
      certificateElement.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1200px;
        min-height: 1700px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        padding: 60px 80px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
        border-radius: 20px;
      `;
      
      // Build certificate HTML
      certificateElement.innerHTML = `
        <!-- Certificate Header -->
        <div style="text-align: center; margin-bottom: 50px; position: relative;">
          <!-- Decorative Border -->
          <div style="position: absolute; top: -20px; left: -20px; right: -20px; height: 120px; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%); border-radius: 20px 20px 0 0; opacity: 0.1;"></div>
          
          <!-- Institution Name -->
          <h1 style="margin: 0 0 15px 0; font-size: 36px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px; line-height: 1.2; position: relative; z-index: 1;">
            ${institution?.name?.toUpperCase() || 'INSTITUTION'}
          </h1>
          
          <!-- Certificate Title -->
          <div style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50px; margin: 20px 0; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3); position: relative; z-index: 1;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: white; letter-spacing: 1px; line-height: 1.4;">ACADEMIC RESULT CERTIFICATE</h2>
          </div>
          
          <!-- Decorative Line -->
          <div style="width: 200px; height: 3px; background: linear-gradient(90deg, transparent, #3b82f6, transparent); margin: 20px auto; border-radius: 2px;"></div>
        </div>
        
        <!-- Student Information Section -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px; border-radius: 20px; margin-bottom: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 30px 0; font-size: 20px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 1px; text-align: center; position: relative; line-height: 1.4;">
            <span style="background: white; padding: 10px 20px; position: relative; z-index: 1; display: inline-block;">Student Information</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; z-index: 0;"></div>
          </h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 500; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Student Name</label>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; padding: 16px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4; display: flex; align-items: center; min-height: 50px;">${result?.student_name || 'N/A'}</p>
              </div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 500; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Class</label>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; padding: 16px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4; display: flex; align-items: center; min-height: 50px;">${result?.class || 'N/A'}</p>
              </div>
            </div>
            <div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 500; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Register Number</label>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; padding: 16px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4; display: flex; align-items: center; min-height: 50px;">${result?.register_number || 'N/A'}</p>
              </div>
              <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 500; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Certificate Date</label>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; padding: 16px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4; display: flex; align-items: center; min-height: 50px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Subject Performance Section -->
        <div style="background: white; padding: 40px; border-radius: 20px; margin-bottom: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 30px 0; font-size: 20px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 1px; text-align: center; position: relative; line-height: 1.4;">
            <span style="background: white; padding: 10px 20px; position: relative; z-index: 1; display: inline-block;">Subject Performance</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; z-index: 0;"></div>
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
            <thead>
              <tr style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);">
                <th style="padding: 20px; text-align: left; font-weight: 600; color: white; font-size: 16px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); line-height: 1.4;">Subject</th>
                <th style="padding: 20px; text-align: center; font-weight: 600; color: white; font-size: 16px; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); line-height: 1.4;">Marks Obtained</th>
                <th style="padding: 20px; text-align: center; font-weight: 600; color: white; font-size: 16px; letter-spacing: 0.5px; line-height: 1.4;">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${result?.subjects?.map((subject, index) => {
                // Find the pass mark for this subject and class
                const passMark = passMarks.find(pm => 
                  pm.subject === subject.name && pm.class === result.class
                );
                
                // If no pass mark is set, show as "Not Set" and fail by default
                if (!passMark) {
                  const status = 'FAIL (Pass Mark Not Set)';
                  const grade = 'F';
                  const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
                  const markColor = '#ef4444';
                  const markBg = '#fee2e2';
                  return `
                    <tr style="background: ${bgColor};">
                      <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; font-size: 16px; color: #374151; font-weight: 500; line-height: 1.4; vertical-align: middle;">${subject.name}</td>
                      <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                        <span style="color: ${markColor}; font-size: 18px; font-weight: 700; display: inline-block; line-height: 1.4;">
                          ${subject.marks}
                        </span>
                      </td>
                      <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                        <span style="display: inline-block; padding: 6px 12px; font-size: 14px; font-weight: 600; line-height: 1.4; border-radius: 8px; background: #fee2e2; color: #dc2626;">
                          ${status}
                        </span>
                      </td>
                    </tr>
                  `;
                }
                
                // Use the custom pass mark to determine pass/fail
                const status = subject.marks >= passMark.pass_mark ? 'PASS' : 'FAIL';
                const grade = subject.marks >= passMark.pass_mark ? 'A+' : 'C';
                const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
                const markColor = subject.marks >= 80 ? '#10b981' : subject.marks >= 60 ? '#f59e0b' : '#ef4444';
                const markBg = subject.marks >= 80 ? '#d1fae5' : subject.marks >= 60 ? '#fef3c7' : '#fee2e2';
                const statusBg = status === 'PASS' ? '#d1fae5' : '#fee2e2';
                const statusColor = status === 'PASS' ? '#059669' : '#dc2626';
                return `
                  <tr style="background: ${bgColor};">
                    <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; font-size: 16px; color: #374151; font-weight: 500; line-height: 1.4; vertical-align: middle;">${subject.name}</td>
                    <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                      <span style="color: ${markColor}; font-size: 18px; font-weight: 700; display: inline-block; line-height: 1.4;">
                        ${subject.marks}
                      </span>
                      <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Pass: ${passMark.pass_mark}</div>
                    </td>
                    <td style="padding: 20px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
                      <span style="display: inline-block; padding: 6px 12px; font-size: 14px; font-weight: 600; line-height: 1.4; border-radius: 8px; background: ${statusBg}; color: ${statusColor};">
                        ${status}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Academic Summary Section -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px; border-radius: 20px; margin-bottom: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 30px 0; font-size: 20px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 1px; text-align: center; position: relative; line-height: 1.4;">
            <span style="background: white; padding: 10px 20px; position: relative; z-index: 1; display: inline-block;">Academic Summary</span>
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; z-index: 0;"></div>
          </h3>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
            ${result?.total !== null ? `
              <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                  <span style="font-size: 24px; font-weight: 700; color: white; line-height: 1;">∑</span>
                </div>
                <div style="font-size: 32px; font-weight: 700; color: #3b82f6; margin-bottom: 10px; line-height: 1.2;">${result.total}</div>
                <div style="font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Total Marks</div>
              </div>
            ` : ''}
            ${result?.grade ? `
              <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                  <span style="font-size: 24px; font-weight: 700; color: white; line-height: 1;">A+</span>
                </div>
                <div style="font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 10px; line-height: 1.2;">${result.grade}</div>
                <div style="font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Grade</div>
              </div>
            ` : ''}
            ${result?.rank ? `
              <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                  <span style="font-size: 24px; font-weight: 700; color: white; line-height: 1;">#</span>
                </div>
                <div style="font-size: 32px; font-weight: 700; color: #f59e0b; margin-bottom: 10px; line-height: 1.2;">${result.rank}</div>
                <div style="font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">Rank</div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Footer Section -->
        <div style="text-align: center; margin-top: 50px; padding-top: 40px; border-top: 2px solid #e2e8f0; position: relative;">
          <!-- Decorative Elements -->
          <div style="position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 100px; height: 2px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 1px;"></div>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 0; font-size: 16px; color: #64748b; font-weight: 500; line-height: 1.4;">Official Result Certificate</p>
          </div>
          
          <div style="margin-bottom: 10px;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.4;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(certificateElement);
      
      // Convert to image
      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      // Remove element
      document.body.removeChild(certificateElement);
      
      // Download as JPG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${result?.student_name}_certificate.jpg`;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({ 
            title: "Certificate Downloaded", 
            description: "Certificate saved as JPG image" 
          });
        }
      }, 'image/jpeg', 0.95);
      
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast({ 
        title: "Download Failed", 
        description: "Unable to generate certificate. Please try again." 
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



    // Fetch student result with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let resultData = null;
    
    while (retryCount < maxRetries && !resultData) {
      try {
        // Add timeout to the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const { data: data, error: err } = await supabase
          .from("student_results")
          .select("student_name, register_number, class, subjects, total, grade, rank")
          .eq("institution_id", institution.id)
          .eq("register_number", regNumber)
          .eq("secret_code", secretCode)
          .eq("published", true)
          .maybeSingle({ signal: controller.signal });
        
        clearTimeout(timeoutId);
        
        if (err) {
          throw err;
        }
        
        resultData = data;
        break;
      } catch (err) {
        retryCount++;
        console.log(`Result search retry ${retryCount}/${maxRetries} failed:`, err);
        
        if (retryCount < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
    }



    if (resultData) {

      setResult(resultData as ResultData);
      
      // Fetch pass marks for this institution
      if (institution?.id) {
        await fetchPassMarks(institution.id);
      }

    } else {

      // Show network error instead of "no result found"
      toast({ 
        title: "Network Error", 
        description: "Unable to connect to database. Please check your internet connection and try again.", 
        variant: "destructive" 
      });
      
      // Don't set searching to false immediately, allow user to retry
      setTimeout(() => setSearching(false), 2000);
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

      <header className="text-card-foreground border-0 shadow-lg sm:shadow-xl rounded-xl sm:rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm relative mx-auto max-w-4xl mt-4 mb-6 print:hidden">

        <div className="px-4 py-4 sm:py-6 flex flex-col items-center gap-2 sm:gap-3">

          {(institution?.logo_url || defaultLogoUrl) && (

            <div className="relative">

              <img 

                src={institution?.logo_url || defaultLogoUrl} 

                alt={institution?.name || "Institution"} 

                className="max-w-[80px] sm:max-w-[100px] h-auto object-contain drop-shadow-lg" 

                onError={(e) => {

                  const target = e.target as HTMLImageElement;

                  if (target.src !== defaultLogoUrl) {

                    target.src = defaultLogoUrl;

                  }

                }}

              />

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

      <main className="flex-1 flex items-center justify-center py-0 sm:py-16 px-4 print:py-4 relative">

        <div className="w-full max-w-4xl space-y-2 sm:space-y-8 print:space-y-1">

          {!result ? (

            <div className="space-y-10">

              {/* Search Card */}

              <Card className="border-0 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">

                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-200/50 pb-4 sm:pb-6">

                  <div className="text-center space-y-3 sm:space-y-4">

                    <div className="relative inline-flex items-center justify-center">

                      <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:shadow-xl">

                        <Search className="h-6 w-6 sm:h-8 sm:w-8 text-white" />

                      </div>

                      <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl opacity-20 blur-lg sm:blur-xl animate-pulse"></div>

                    </div>

                    <div className="space-y-1 sm:space-y-2 px-4">

                      <CardTitle className="text-xl sm:text-2xl font-bold text-white">Check Your Result</CardTitle>

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

            <div className="space-y-2 print:space-y-1 print:hidden" id="result-card">

              <Card className="border-0 shadow-lg sm:shadow-xl rounded-xl sm:rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm print:shadow-none print:border-2 print:border-black">

                <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-8 print:p-3 print:space-y-3">

                  {Array.isArray(result.subjects) && result.subjects.length > 0 && (

                    <div className="space-y-6">

                      <div className="flex items-center gap-3 mb-4 sm:mb-6">

                        <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg sm:shadow-xl">

                          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />

                        </div>

                        <h3 className="text-base sm:text-xl font-bold text-slate-900">Subject-wise Performance</h3>

                      </div>

                      <div className="rounded-lg sm:rounded-xl border border-slate-200/50 overflow-hidden shadow-lg sm:shadow-xl">

                        {/* Mobile Card Layout */}

                        <div className="sm:hidden divide-y divide-slate-200">

                          {result.subjects.map((s: any, i: number) => {
                            // Find the pass mark for this subject and class
                            const passMark = passMarks.find(pm => 
                              pm.subject === s.name && pm.class === result.class
                            );
                            
                            // If no pass mark is set, show as "Not Set" and fail by default
                            if (!passMark) {
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
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-full blur opacity-75"></div>
                                        <span className="relative inline-flex items-center px-3 py-1 rounded-full text-base font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
                                          {s.marks}
                                        </span>
                                      </div>
                                      <span className="text-xs text-red-600 font-medium">Pass Mark Not Set</span>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                                      FAIL
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Use the custom pass mark to determine pass/fail
                            const status = s.marks >= passMark.pass_mark ? 'pass' : 'fail';

                            

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

                                      <div className={`absolute inset-0 bg-gradient-to-r ${
                                        status === 'pass' 
                                          ? 'from-emerald-400 to-teal-500' 
                                          : 'from-red-400 to-red-500'
                                      } rounded-full blur opacity-75`}></div>

                                      <span className={`relative inline-flex items-center px-3 py-1 rounded-full text-base font-bold bg-gradient-to-r ${
                                        status === 'pass' 
                                          ? 'from-emerald-500 to-teal-600' 
                                          : 'from-red-500 to-red-600'
                                      } text-white shadow-lg`}>

                                        {s.marks}

                                      </span>

                                    </div>

                                    <span className={`text-xs font-medium ${
                                      status === 'pass' ? 'text-emerald-600' : 'text-red-600'
                                    }`}>Pass: {passMark.pass_mark}</span>

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

                            <TableHeader className="bg-gradient-to-r from-slate-100 to-slate-200 border-b-2 border-slate-300">

                              <TableRow>

                                <TableHead className="text-sm font-bold text-slate-800 uppercase tracking-wider px-6 sm:px-8 py-4 sm:py-5">Subject</TableHead>

                                <TableHead className="text-sm font-bold text-slate-800 uppercase tracking-wider px-6 sm:px-8 py-4 sm:py-5 text-right">Marks Obtained</TableHead>

                                <TableHead className="text-sm font-bold text-slate-800 uppercase tracking-wider px-6 sm:px-8 py-4 sm:py-5 text-center">Status</TableHead>

                              </TableRow>

                            </TableHeader>

                            <TableBody className="divide-y divide-slate-200/60">

                              {result.subjects.map((s: any, i: number) => {
                            // Find the pass mark for this subject and class
                            const passMark = passMarks.find(pm => 
                              pm.subject === s.name && pm.class === result.class
                            );
                            
                            // If no pass mark is set, show as "Not Set" and fail by default
                            if (!passMark) {
                              return (
                                <TableRow key={i} className="hover:bg-slate-50">
                                  <TableCell className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
                                        <BookOpen className="h-4 w-4 text-indigo-600" />
                                      </div>
                                      <span className="font-semibold text-slate-900">{s.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-full blur opacity-75"></div>
                                        <span className="relative inline-flex items-center px-3 py-1 rounded-full text-base font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
                                          {s.marks}
                                        </span>
                                      </div>
                                      <span className="text-xs text-red-600 font-medium">Pass Mark Not Set</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-4 py-4">
                                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                                      FAIL
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            
                            // Use the custom pass mark to determine pass/fail
                            const status = s.marks >= passMark.pass_mark ? 'pass' : 'fail';

                                

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

                                          <div className={`absolute inset-0 bg-gradient-to-r ${
                                            status === 'pass' 
                                              ? 'from-emerald-400 to-teal-500' 
                                              : 'from-red-400 to-red-500'
                                          } rounded-full blur opacity-75`}></div>

                                          <span className={`relative inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-base sm:text-lg font-bold bg-gradient-to-r ${
                                            status === 'pass' 
                                              ? 'from-emerald-500 to-teal-600' 
                                              : 'from-red-500 to-red-600'
                                          } text-white shadow-lg`}>

                                            {s.marks}

                                          </span>

                                        </div>

                                        <span className={`text-xs sm:text-sm font-medium ${
                                          status === 'pass' ? 'text-emerald-600' : 'text-red-600'
                                        }`}>Pass: {passMark.pass_mark}</span>

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

                  

                  <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 border-t border-slate-200 pt-8 sm:pt-10">

                    {result.total != null && (

                      <Card className="border-0 shadow-md sm:shadow-lg rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 group hover:shadow-lg sm:hover:shadow-xl transition-all duration-300">

                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">

                          <div className="relative mb-3 sm:mb-4">

                            <div className="mx-auto p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">

                              <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />

                            </div>

                            <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl opacity-20 blur-md sm:blur-lg"></div>

                          </div>

                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Total Marks</p>

                          <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{result.total}</p>

                        </CardContent>

                      </Card>

                    )}

                    {result.grade && (

                      <Card className="border-0 shadow-md sm:shadow-lg rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 group hover:shadow-lg sm:hover:shadow-xl transition-all duration-300">

                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">

                          <div className="relative mb-3 sm:mb-4">

                            <div className="mx-auto p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">

                              <Award className="h-4 w-4 sm:h-6 sm:w-6 text-white" />

                            </div>

                            <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl opacity-20 blur-md sm:blur-lg"></div>

                          </div>

                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Grade</p>

                          <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{result.grade}</p>

                        </CardContent>

                      </Card>

                    )}

                    {result.rank && (

                      <Card className="border-0 shadow-md sm:shadow-lg rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 group hover:shadow-lg sm:hover:shadow-xl transition-all duration-300">

                        <CardContent className="p-4 sm:p-6 lg:p-8 text-center">

                          <div className="relative mb-3 sm:mb-4">

                            <div className="mx-auto p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">

                              <Crown className="h-4 w-4 sm:h-6 sm:w-6 text-white" />

                            </div>

                            <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl opacity-20 blur-md sm:blur-lg"></div>

                          </div>

                          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-1">Rank</p>

                          <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{result.rank}</p>

                        </CardContent>

                      </Card>

                    )}

                  </div>

                </CardContent>

              </Card>

      {/* Action Buttons */}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center print:hidden mt-8">

            <Button 

              onClick={handleDownload} 

              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-500 h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl w-full sm:w-auto"

            >

              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative flex items-center gap-3 sm:gap-4">

                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">

                  <FileDown className="h-5 w-5 sm:h-6 sm:w-6" />

                </div>

                <div className="text-left">

                  <span className="text-sm sm:text-base font-bold block">Download Certificate</span>

                  <span className="text-xs sm:text-sm opacity-90">Professional JPG Format</span>

                </div>

              </div>

              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></div>

            </Button>

            <Button 

              variant="outline" 

              onClick={() => setResult(null)} 

              className="gap-2 sm:gap-3 h-10 sm:h-12 px-4 sm:px-6 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 shadow-md hover:shadow-lg w-full sm:w-auto"

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

