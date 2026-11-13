import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface LookupRequest {
  institution_id: string;
  register_number: string;
  secret_code: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: LookupRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const institutionId = typeof body?.institution_id === "string" ? body.institution_id.trim() : "";
  const registerNumber = typeof body?.register_number === "string" ? body.register_number.trim() : "";
  const secretCode = typeof body?.secret_code === "string" ? body.secret_code.trim() : "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(institutionId);

  if (!isUuid || !registerNumber || registerNumber.length > 120 || !secretCode || secretCode.length > 200) {
    return jsonResponse({ error: "Provide a valid institution, register number, and secret code." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Student lookup service is missing its required configuration.");
    return jsonResponse({ error: "The result service is unavailable." }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await adminClient
      .from("student_results")
      .select("student_name, register_number, class, subjects, total, grade, rank, institutions!inner(status)")
      .eq("institution_id", institutionId)
      .eq("institutions.status", "active")
      .eq("register_number", registerNumber)
      .eq("secret_code", secretCode)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Student result lookup query failed:", error.message);
      return jsonResponse({ error: "The result service is unavailable." }, 500);
    }

    const { error: logError } = await adminClient.from("access_logs").insert({
      institution_id: institutionId,
      register_number: registerNumber,
    });
    if (logError) console.error("Student result access log could not be saved:", logError.message);

    return jsonResponse({ result: data });
  } catch (error) {
    console.error("Student result lookup failed:", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "The result service is unavailable." }, 500);
  }
});