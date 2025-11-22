import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS FIX
  res.setHeader("Access-Control-Allow-Origin", "https://drnttps.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, inviteCode } = req.body;

    if (!email || !password || inviteCode !== "810632") {
      return res.status(400).json({ message: "Invalid data" });
    }

    // Create OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Setup Gmail Transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "NTTPS Verification Code",
      text: `Your OTP is ${otp}`,
    });

    return res.json({ message: "OTP sent", otp }); // optional: don't send otp in production
  } catch (err) {
    console.error("OTP error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}
