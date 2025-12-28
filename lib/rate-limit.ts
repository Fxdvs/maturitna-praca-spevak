import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

const RATE_LIMIT = 3; // Max 3 requests
const RATE_WINDOW = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export async function checkRateLimit(
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt?: Date }> {
  try {
    // Get existing rate limit record
    const { data: existingLimit, error: fetchError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("ip_address", ipAddress)
      .eq("endpoint", endpoint)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Rate limit fetch error:", fetchError);
      return { allowed: true, remaining: RATE_LIMIT }; // Fail open
    }

    const now = new Date();

    // If no existing record, create one
    if (!existingLimit) {
      await supabase.from("rate_limits").insert({
        ip_address: ipAddress,
        endpoint: endpoint,
        request_count: 1,
        first_request_at: now,
        last_request_at: now,
      });

      return { allowed: true, remaining: RATE_LIMIT - 1 };
    }

    // Check if window has expired
    const firstRequestTime = new Date(existingLimit.first_request_at);
    const timeSinceFirst = now.getTime() - firstRequestTime.getTime();

    if (timeSinceFirst > RATE_WINDOW) {
      // Window expired, reset counter
      await supabase
        .from("rate_limits")
        .update({
          request_count: 1,
          first_request_at: now,
          last_request_at: now,
        })
        .eq("ip_address", ipAddress)
        .eq("endpoint", endpoint);

      return { allowed: true, remaining: RATE_LIMIT - 1 };
    }

    // Check if limit exceeded
    if (existingLimit.request_count >= RATE_LIMIT) {
      const resetAt = new Date(firstRequestTime.getTime() + RATE_WINDOW);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    await supabase
      .from("rate_limits")
      .update({
        request_count: existingLimit.request_count + 1,
        last_request_at: now,
      })
      .eq("ip_address", ipAddress)
      .eq("endpoint", endpoint);

    return {
      allowed: true,
      remaining: RATE_LIMIT - existingLimit.request_count - 1,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    return { allowed: true, remaining: RATE_LIMIT }; // Fail open on errors
  }
}

export function getClientIp(req: Request): string {
  // Try to get IP from various headers
  const headers = req.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a placeholder (development)
  return "unknown";
}
