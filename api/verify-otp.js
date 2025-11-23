// api/verify-otp.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://drnttps.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: "Missing email or OTP" });
    }

    // 1) load pending record
    const { data: rows, error: fetchError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (fetchError) {
      console.error("Supabase fetch pending error:", fetchError);
      return res.status(500).json({ message: "Database error" });
    }

    const pending = rows && rows[0];
    if (!pending) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const now = Date.now();
    const expires = new Date(pending.expires_at).getTime();

    if (pending.otp !== otp || now > expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // 2) create user in users table
    const { error: insertError } = await supabase.from("users").insert({
      email: pending.email,
      password_hash: pending.password_hash,
    });

    if (insertError) {
      console.error("Supabase insert user error:", insertError);
      return res.status(500).json({ message: "Failed to create user" });
    }

    // 3) delete pending row
    await supabase.from("pending_users").delete().eq("email", email);

    return res.json({ message: "Registration complete" });
  } catch (err) {
    console.error("verify-otp error:", err);
    return res
      .status(500)
      .json({ message: "Verification failed", error: err.toString() });
  }
};
