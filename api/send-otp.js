// api/send-otp.js
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password, inviteCode } = req.body;

    if (!email || !password || !inviteCode)
      return res.status(400).json({ message: "Missing fields" });

    if (inviteCode !== "810632")
      return res.status(400).json({ message: "Invalid invite code" });

    // Check already registered
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email);

    if (existing?.length)
      return res.status(409).json({ message: "Already registered" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(password, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("pending_users").upsert({
      email,
      password_hash: hash,
      otp,
      expires_at: expires,
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NTTPS Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    return res.json({ message: "OTP sent" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error", error: e.message });
  }
}
