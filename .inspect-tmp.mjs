import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).replace(/^"|"$/g,"")];}));
const get = async (p) => { const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` } }); return r.ok ? r.json() : `${r.status} ${await r.text()}`; };
const os = await get("orders?select=id,created_at,updated_at,status,amount,list_amount,test_mode,failure_reason,provider_order_id,provider_txn_id,verified_by,paid_at,user_id,course_id&order=created_at.desc&limit=6");
console.log(os);
