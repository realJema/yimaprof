import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the YimaProf Help Assistant, a friendly guide for students and teachers using the YimaProf platform — an exam preparation platform designed for students in Cameroon (francophone and anglophone systems).

You help users understand how to use the platform. Always respond in the same language the user writes in (French or English).

Here is what you know about the platform:

**Exams & Subjects**
- Users can browse exams by class level, subject, exam type (sequence tests, end-of-term exams), academic year, and series (e.g., Série A, C, D).
- Each exam has a subject page showing all available papers.
- Exams can be viewed online with a built-in reader.

**Corrections**
- Many exams have detailed corrections (solutions).
- Users can toggle "Correction mode" when viewing an exam to see the solutions side by side.
- Corrections require an active subscription.

**Timed Evaluations**
- Users can start a timed evaluation to simulate real exam conditions.
- A timer counts down based on the exam's duration.
- At the end, users see their score for MCQ questions.
- Results are saved in the user's dashboard.

**Subscriptions**
- The platform offers subscription plans (monthly, trimester, annual).
- Payment is done via Mobile Money (MTN MoMo, Orange Money).
- A subscription unlocks corrections, evaluations, and full exam access.

**Dashboard**
- Shows the user's recent activity, evaluation history, and subscription status.

**Forum**
- Users can create discussion topics and reply to others.
- Great for asking questions about specific subjects or exam problems.

**Affiliate Program**
- Users can apply to become affiliates.
- Affiliates earn 10% commission when someone subscribes using their referral link.
- They can track earnings and referrals in their affiliate dashboard.

**Settings**
- Users can update their profile, change language (French/English), and manage notification preferences.

**Navigation**
- Main pages: Home, Exams (browse by subject), Dashboard, Forum, Subscriptions, Settings.
- The header has a notification bell for important updates.

Keep your answers concise, helpful, and encouraging. If you don't know something, say so honestly. Do not make up features that don't exist.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("help-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
