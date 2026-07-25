// api/verify-otp.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://drnttps.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const { email, otp } = req.body;

    const { data } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    const row = data?.[0];
    if (!row) return res.status(400).json({ message: "OTP expired" });
    if (row.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    if (new Date(row.expires_at) < new Date())
      return res.status(400).json({ message: "OTP expired" });

    await supabase.from("users").insert({
      email: row.email,
      password_hash: row.password_hash,
    });

    await supabase.from("pending_users").delete().eq("email", email);

    return res.json({ message: "Registration complete" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
}
