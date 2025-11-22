import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password, inviteCode } = req.body;

  if (!email || !password || inviteCode !== process.env.INVITE_CODE) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "TM&CAM - OTP Verification",
    text: `Your OTP is ${otp}`
  });

  return res.status(200).json({ message: "OTP sent", otp });
}
