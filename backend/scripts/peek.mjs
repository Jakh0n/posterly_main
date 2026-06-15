import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = {}; for (const l of raw.split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m) env[m[1]]=m[2].trim();}
const a = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const { data } = await a.from("campaigns").select("id,status,error,product_image_url").eq("id","c465b89b-2db6-40ce-aa84-568952b8eab8").single();
console.log(JSON.stringify(data,null,2));
console.log("--- fetch product image url ---");
const res = await fetch(data.product_image_url);
console.log("img status", res.status, "content-type", res.headers.get("content-type"));
