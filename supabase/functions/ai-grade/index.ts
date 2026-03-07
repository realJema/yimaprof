import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a strict but fair exam grader for Cameroon secondary school exams. You grade student answers against expected answers/rubrics.

Rules:
- Award partial credit when the student demonstrates partial understanding
- Be strict about factual accuracy
- Consider both French and English answers
- If the student answer is empty or completely irrelevant, give 0 points
- The score must be between 0 and maxPoints (inclusive)
- Provide brief, constructive feedback in the same language as the question (1-2 sentences)
- Focus feedback on what was correct/incorrect and what was missing`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json();
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build the user prompt with all questions
    const questionsPrompt = questions.map((q: any, i: number) => 
      `Question ${i + 1} (${q.maxPoints} points):\n${q.questionText}\n\nExpected Answer:\n${q.expectedAnswer}\n${q.rubric ? `\nRubric:\n${q.rubric}` : ''}\n\nStudent Answer:\n${q.studentAnswer || '(no answer)'}`
    ).join('\n\n---\n\n');

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
          { role: "user", content: `Grade the following ${questions.length} question(s):\n\n${questionsPrompt}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "grade_answers",
              description: "Submit grades for all student answers",
              parameters: {
                type: "object",
                properties: {
                  grades: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        questionIndex: { type: "number", description: "0-based index of the question" },
                        score: { type: "number", description: "Points awarded (0 to maxPoints)" },
                        maxPoints: { type: "number", description: "Maximum possible points" },
                        feedback: { type: "string", description: "Brief feedback on the answer" },
                      },
                      required: ["questionIndex", "score", "maxPoints", "feedback"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["grades"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "grade_answers" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return structured grades" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grades = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify(grades), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-grade error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
