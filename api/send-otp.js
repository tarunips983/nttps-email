// api/send-otp.js
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const INVITE_CODE = "810632";

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
    const { email, password, inviteCode } = req.body || {};

    if (!email || !password || !inviteCode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (inviteCode !== INVITE_CODE) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    // 1) check if user already exists
    const { data: existing, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email);

    if (checkError) {
      console.error("Supabase check error:", checkError);
      return res.status(500).json({ message: "Database error" });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: "Already registered" });
    }

    // 2) create OTP + hash password
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // 3) upsert into pending_users
    const { error: upsertError } = await supabase
      .from("pending_users")
      .upsert(
        {
          email,
          password_hash: passwordHash,
          otp,
          expires_at: expiresAt,
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return res.status(500).json({ message: "Failed to save OTP" });
    }

    // 4) send email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"NTTPS Admin" <${EMAIL_USER}>`,
      to: email,
      subject: "Your NTTPS Admin OTP",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("send-otp error:", err);
    return res
      .status(500)
      .json({ message: "Failed to send OTP", error: err.toString() });
  }
};
