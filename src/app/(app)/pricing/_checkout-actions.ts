"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function createCheckoutSession(
  priceId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to upgrade your subscription plan." };
    }

    // Insert or update subscription details directly in the user's Supabase subscriptions table!
    // This allows testing the payment flows in development prior to connecting production Stripe webhooks.
    const { error: subError } = await supabase.from("subscriptions").upsert({
      id: `sub_mock_${Date.now()}`,
      user_id: user.id,
      status: "active",
      price_id: priceId,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (subError) {
      console.warn("Could not insert mock subscription in Supabase:", subError.message);
    }

    const origin = (await headers()).get("origin") || "http://localhost:3000";
    return { url: `${origin}/estimator?checkout=success&plan=${priceId}` };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Internal server error occurred.",
    };
  }
}
