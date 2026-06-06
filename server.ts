/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory state
let currentOTP: string | null = null;
let otpTimestamp: number | null = null;
let REGISTERED_EMAIL = "";
let isFrenchVerified = false;

interface MockEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  code: string;
  isRead: boolean;
}

let simulatedEmails: MockEmail[] = [
  {
    id: "system-welcome",
    from: "Global Gateway Security <security@globalportal.inc>",
    to: "your-email@example.com",
    subject: "Welcome to your Secure Global Multi-Language Portal Instance",
    body: `<h3>Welcome to Global Gateway!</h3>
<p>This sandbox inbox represents your real-time secure communication line. When you attempt to switch the platform language to French (Français), compliance rules require us to issue a one-time passcode (OTP) for validated access control.</p>
<p>Input your target Gmail address above, then click "Generate OTP Code". If SMTP environment variables are configured in the platform Settings, a security e-mail will be dispatched surely. Otherwise, you can retrieve the verification OTP code instantly right inside this integrated browser sandbox!</p>
<p>Best regards,<br/>The Global Security Protocol Team</p>`,
    timestamp: new Date().toLocaleTimeString(),
    code: "",
    isRead: false,
  }
];

// Lazy Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// REST API Endpoints

// 1. Get status
app.get("/api/auth-status", (req, res) => {
  res.json({
    email: REGISTERED_EMAIL,
    isFrenchVerified,
  });
});

// 2. Clear verified status (for testing purposes)
app.post("/api/reset-auth", (req, res) => {
  isFrenchVerified = false;
  REGISTERED_EMAIL = "";
  currentOTP = null;
  otpTimestamp = null;
  res.json({ success: true, isFrenchVerified, email: "" });
});

// 3. Get simulated inbox
app.get("/api/get-emails", (req, res) => {
  res.json({ emails: simulatedEmails });
});

// 4. Mark email as read
app.post("/api/mark-as-read", (req, res) => {
  const { id } = req.body;
  simulatedEmails = simulatedEmails.map((email) =>
    email.id === id ? { ...email, isRead: true } : email
  );
  res.json({ success: true });
});

// 5. Generate secure OTP and mail it
app.post("/api/generate-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  // Bind session dynamically to the newly requested email
  REGISTERED_EMAIL = email;

  // Generate a random 6-digit passcode
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  currentOTP = otpCode;
  otpTimestamp = Date.now();

  const newEmail: MockEmail = {
    id: `otp-${Date.now()}`,
    from: "Language Changer Security <security@globalportal.inc>",
    to: REGISTERED_EMAIL,
    subject: `🚨 Security Alert: OTP code for French language access - ${otpCode}`,
    body: `
      <div style="font-family: sans-serif; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Locale Access Verification</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">A request was made to activate <strong>French (Français)</strong> language settings on your account.</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">To ensure security and validate compliance, please use the 6-digit transactional passcode below to authorize this session.</p>
        
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0;">
          <small style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Verification Passcode</small>
          <div style="font-family: monospace; font-size: 32px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.15em; margin-top: 6px;">${otpCode}</div>
          <small style="color: #64748b; font-size: 11px; display: block; margin-top: 4px;">Valid for the next 5 minutes</small>
        </div>
        
        <p style="color: #ef4444; font-size: 12px; line-height: 1.4;">If you did not authorize this language preference change, please safely ignore this email.</p>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <small style="color: #94a3b8; font-size: 11px;">Ref ID: ACT-${Date.now() % 100000} | Global Multi-Language Portal Node 3000</small>
      </div>
    `,
    timestamp: new Date().toLocaleTimeString(),
    code: otpCode,
    isRead: false,
  };

  // Add to our simulated database of emails (add to top of inbox list)
  simulatedEmails.unshift(newEmail);

  // SMTP outbound setup
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS;

  let emailSentViaSmtp = false;
  let smtpErrorMessage = "";

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"Language Changer Security" <${smtpUser}>`,
        to: REGISTERED_EMAIL,
        subject: `🚨 Security Alert: OTP code for French language access - ${otpCode}`,
        text: `Your 6-digit verification code is: ${otpCode}. It is valid for the next 5 minutes.`,
        html: newEmail.body,
      };

      await transporter.sendMail(mailOptions);
      emailSentViaSmtp = true;
    } catch (err: any) {
      console.error("[SMTP] Failed to send email via real SMTP:", err);
      smtpErrorMessage = err.message || JSON.stringify(err);
    }
  }

  if (emailSentViaSmtp) {
    res.json({
      success: true,
      message: `A secure 6-digit passcode has been sent to ${REGISTERED_EMAIL}! Please check your email inbox (and spam folder) to verify. (Also available in the Sandbox Email logs below)`,
    });
  } else {
    let warning = `A secure 6-digit passcode was successfully logged.`;
    if (smtpUser && smtpPass && smtpErrorMessage) {
      warning += ` (SMTP error: ${smtpErrorMessage}).`;
    } else {
      warning += ` (To receive real emails on Gmail, set SMTP_USER and SMTP_PASS in Settings!).`;
    }
    res.json({
      success: true,
      message: `${warning} Please retrieve your verification OTP code from the Sandbox Email logs at the bottom of the screen!`,
    });
  }
});

// 6. Verify OTP code
app.post("/api/verify-otp", (req, res) => {
  const { code, email } = req.body;
  
  if (!email || email !== REGISTERED_EMAIL) {
    res.status(400).json({ error: "The provided email address does not match the active pending code request session." });
    return;
  }

  if (!currentOTP || !otpTimestamp) {
    res.status(400).json({ error: "No pending OTP request exists for this account." });
    return;
  }

  // Check expiration (5 minutes)
  const isExpired = Date.now() - otpTimestamp > 5 * 60 * 1000;
  if (isExpired) {
    currentOTP = null;
    otpTimestamp = null;
    res.status(400).json({ error: "The provided verification OTP has expired. Please generate a new code." });
    return;
  }

  if (code === currentOTP) {
    isFrenchVerified = true;
    currentOTP = null; // Consume the OTP
    otpTimestamp = null;
    res.json({
      success: true,
      message: "Security clearance granted. Your session is now authorized for French locale-specific views.",
    });
  } else {
    res.status(400).json({
      error: "Verification failed: The security code entered is incorrect.",
    });
  }
});

// 7. Dynamic Translation using Gemini API proxy
app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    res.status(400).json({ success: false, error: "Text and targetLanguage are required." });
    return;
  }

  // Map LanguageCodes to Names
  const langNames: Record<string, string> = {
    en: "English",
    es: "Spanish / Español",
    hi: "Hindi / हिन्दी",
    pt: "Portuguese / Português",
    zh: "Chinese / 中文",
    fr: "French / Français",
  };

  const targetLangName = langNames[targetLanguage] || targetLanguage;

  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Graceful local fallback if API key is not present or configured
      const fallbackTranslations: Record<string, string> = {
        en: `[EN: ${text}]`,
        es: `[ES: ${text} - Traducido]`,
        hi: `[HI: ${text} - अनुवादित]`,
        pt: `[PT: ${text} - Traduzido]`,
        zh: `[ZH: ${text} - 翻译]`,
        fr: `[FR: ${text} - Traduit]`,
      };
      const fallbackText = fallbackTranslations[targetLanguage] || `[${targetLanguage}]: ${text}`;
      res.json({
        success: true,
        translatedText: fallbackText,
        detectedLanguage: "English (Simulated Local Fallback - No Gemini Secret Key Set)",
      });
      return;
    }

    const systemPrompt = `You are a professional multi-language localization assistant. Translate the following text exactly and elegantly into the target language requested. Do not return any introduction, greetings, or conversational filler. Return ONLY the translated output.
Target Language: ${targetLangName}
Input Text to Translate: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
    });

    const translatedText = response.text?.trim() || "";
    res.json({
      success: true,
      translatedText,
    });
  } catch (error: any) {
    console.error("Gemini Translation Endpoint Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to trigger neural translation gateway",
    });
  }
});

// Serve Frontend

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static compiled UI in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HTTP Server] Global Portal backend initialized active on port ${PORT}`);
  });
}

startServer();
