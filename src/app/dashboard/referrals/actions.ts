"use server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/admin/guard";

const MSG: Record<string, string> = {
  below_minimum_payout: "You haven't reached the minimum payout yet.",
  invalid_upi_id: "Enter a valid UPI ID, like name@bank.",
  invalid_bank_details: "Enter your bank account details (8–200 characters).",
  invalid_method: "Choose a payout method.",
};

export async function requestPayout(_prev: unknown, form: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const method = String(form.get("method") ?? "");
  const identifier = String(form.get("identifier") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_referral_payout", { _method: method, _identifier: identifier });
  if (error) {
    const key = Object.keys(MSG).find((k) => error.message.includes(k));
    return { ok: false, error: key ? MSG[key] : "Couldn't create the payout request." };
  }
  revalidatePath("/dashboard/referrals");
  return { ok: true, data: null, message: "Payout requested. We'll pay it out and add the transaction reference here." };
}
