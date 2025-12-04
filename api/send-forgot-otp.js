import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "https://drnttps.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Supabase connection
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🔍 1. CHECK IF EMAIL EXISTS
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    return res.status(404).json({
      message: "This email is not registered in our system.",
    });
  }

  // 🔢 2. GENERATE OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 💾 3. SAVE OTP IN pending_users TABLE
  await supabase.from("pending_users").upsert({
    email,
    otp,
    created_at: new Date().toISOString(),
  });

  // 📧 4. SEND EMAIL
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: "NTTPS Admin <no-reply@nttps.com>",
    to: email,
    subject: "Password Reset OTP",
    html: `<h2>Your OTP is:</h2><h1>${otp}</h1>`,
  });

  return res.status(200).json({ message: "OTP sent successfully!" });
}
