import "server-only";
import type { AdminCtx } from "./guard";

/** Append-only admin audit trail. Failures never block the admin action itself. */
export async function audit(ctx: AdminCtx, action: string, entityType: string, entityId: string | null, summary: string, details: Record<string, unknown> = {}) {
  const { error } = await ctx.supabase.from("admin_audit_log").insert({ actor_id: ctx.userId, action, entity_type: entityType, entity_id: entityId, summary, details });
  if (error) console.error("[audit] failed to record", action, error.message);
}
