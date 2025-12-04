import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Supabase connection
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1️⃣ CHECK IF EMAIL EXISTS
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    return res
      .status(404)
      .json({ message: "This email is not registered in our system." });
  }

  // 2️⃣ GENERATE OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3️⃣ SAVE OTP IN pending_users TABLE
  await supabase.from("pending_users").upsert({
    email,
    otp,
    created_at: new Date().toISOString(),
  });

  // 4️⃣ SEND MAIL
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
    text: `Your OTP is: ${otp}`,
    html: `<h2>Your OTP is:</h2><h1>${otp}</h1>`,
  });

  return res.status(200).json({ message: "OTP sent successfully!" });
}
