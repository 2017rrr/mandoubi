import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receiptPath, expectedAmount, orderId } = await req.json();

    if (!receiptPath || !expectedAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get a signed URL for the receipt image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receiptPath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error("Failed to get receipt URL: " + (signedUrlError?.message || "unknown"));
    }

    const imageUrl = signedUrlData.signedUrl;

    // Download the image and convert to base64 (chunked to avoid stack overflow)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download receipt image");
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binary);

    // Determine mime type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    const now = new Date();
    const bahrainTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const currentTime = bahrainTime.toISOString().replace("Z", "+03:00");

    const prompt = `You are a payment receipt verifier. The current time in Bahrain (UTC+3) is ${currentTime}. Analyze this BenefitPay receipt image and respond with JSON only, no markdown, no extra text: { "approved": true/false, "amount": number, "reason": "string" }. Approve ONLY if ALL conditions are met: 1) The recipient number is 39105085, 2) The amount matches or exceeds the expected amount of ${expectedAmount} BHD, 3) The receipt appears genuine, 4) The payment/transaction time shown on the receipt is within the last 1 hour from the current Bahrain time. If the payment time is older than 1 hour, reject with reason "الإيصال منتهي الصلاحية، يجب أن يكون الدفع خلال ساعة واحدة من إنشاء الطلب". Reject otherwise with reason in Arabic.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${contentType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI verification failed: " + errText);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (handle potential markdown wrapping)
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || content);
    } catch {
      console.error("Failed to parse AI response:", content);
      result = { approved: false, amount: 0, reason: "فشل في تحليل الإيصال، يرجى إعادة المحاولة" };
    }

    // If approved and orderId provided, update order
    if (result.approved && orderId) {
      await supabase
        .from("orders")
        .update({ payment_status: "confirmed", status: "pending" })
        .eq("id", orderId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
