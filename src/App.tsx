/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { 
  Globe, 
  ShieldCheck, 
  Mail, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRightLeft, 
  Lock, 
  Sparkles,
  Activity,
  Copy,
  Check,
  Languages,
  ShieldAlert,
  Inbox,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { LanguageCode, Language, EmailData } from "./types";
import { SUPPORTED_LANGUAGES, STATIC_DICTIONARY } from "./data";

export default function App() {
  // Navigation & States
  const [currentLang, setCurrentLang] = useState<LanguageCode>(LanguageCode.EN);
  const [selectedTargetLang, setSelectedTargetLang] = useState<LanguageCode>(LanguageCode.FR); // Default to French to reflect screenshot selection beautifully
  
  // Back-end Authentication State
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isFrenchVerified, setIsFrenchVerified] = useState(false);
  const emailInitializedRef = useRef(false);
  
  // Interactive Email Panel States
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string>("system-welcome");
  const [isMailboxOpen, setIsMailboxOpen] = useState(false); // Closed by default to look 100% exactly like screenshot!
  
  // OTP Verification States
  const [otpSentStatus, setOtpSentStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [otpVals, setOtpVals] = useState<string[]>(["7", "2", "", "", "", ""]); // Prefilled 7 and 2 like screenshot for exact mockup fidelity
  const [otpCode, setOtpCode] = useState("72");
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(54); // Set to 54s by default to exactly mimic mockup timer of 54s!

  // Dynamic Translation Box States
  const [customText, setCustomText] = useState("");
  const [translatedResult, setTranslatedResult] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedSourceLang, setDetectedSourceLang] = useState("");

  const content = STATIC_DICTIONARY[currentLang];
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Count down resend timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendTimer]);

  // Sync individual input slots to unified otpCode state
  useEffect(() => {
    setOtpCode(otpVals.join(""));
  }, [otpVals]);

  // Fetch status and mock email stream
  useEffect(() => {
    fetchAuthStatus();
    fetchEmails();
    
    // Poll endpoints for seamless response updates
    const interval = setInterval(() => {
      fetchEmails();
      fetchAuthStatus();
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth-status");
      const data = await res.json();
      
      const emailInputEl = document.getElementById("registered-email-input");
      const isFocused = document.activeElement === emailInputEl;
      
      if (!isFocused) {
        if (!emailInitializedRef.current || !registeredEmail) {
          setRegisteredEmail(data.email || "");
        }
      }
      emailInitializedRef.current = true;

      setIsFrenchVerified(data.isFrenchVerified);
      if (data.isFrenchVerified) {
        setIsFrenchVerified(true);
      }
    } catch (e) {
      console.error("Error retrieving authorization variables:", e);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/get-emails");
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
      }
    } catch (e) {
      console.error("Error fetching simulated mails:", e);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setSelectedEmailId(id);
    try {
      await fetch("/api/mark-as-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEmails(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (e) {
      console.error("Error setting email state:", e);
    }
  };

  // Generate OTP Securely
  const handleGenerateOTP = async () => {
    setOtpSentStatus("sending");
    setVerificationError("");
    setVerificationSuccess("");
    try {
      const res = await fetch("/api/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSentStatus("sent");
        setResendTimer(60);
        setIsMailboxOpen(true); // Auto-open Sandbox Email logs for perfect UX guidance
        await fetchEmails();
        // Clear inputs except first focus
        setOtpVals(["", "", "", "", "", ""]);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      } else {
        setOtpSentStatus("idle");
        setVerificationError(data.error || "Failed to trigger code transmission.");
      }
    } catch (e) {
      setOtpSentStatus("idle");
      setVerificationError("Target server timed out. Check environment ports.");
    }
  };

  // Verify numerical OTP code
  const handleVerifyOTP = async () => {
    const codeToVerify = otpVals.join("");
    if (!codeToVerify || codeToVerify.length !== 6) {
      setVerificationError("Please supply a valid 6-digit verification code.");
      return;
    }
    setVerificationError("");
    setVerificationSuccess("");
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, code: codeToVerify }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationSuccess(data.message || content.otpVerifiedSuccess);
        setIsFrenchVerified(true);
        setCurrentLang(LanguageCode.FR);
        setSelectedTargetLang(LanguageCode.FR);
        setTimeout(() => {
          setOtpSentStatus("idle");
          setVerificationSuccess("");
        }, 3000);
      } else {
        setVerificationError(data.error || content.invalidOtpError);
      }
    } catch (e) {
      setVerificationError("Auth proxy offline. Try again.");
    }
  };

  // Standard cleanup reset
  const handleResetClearance = async () => {
    try {
      const res = await fetch("/api/reset-auth", { method: "POST" });
      if (res.ok) {
        setIsFrenchVerified(false);
        setRegisteredEmail("");
        emailInitializedRef.current = false;
        setOtpVals(["", "", "", "", "", ""]);
        setOtpSentStatus("idle");
        setVerificationError("");
        setVerificationSuccess("");
        if (currentLang === LanguageCode.FR) {
          setCurrentLang(LanguageCode.EN);
          setSelectedTargetLang(LanguageCode.EN);
        }
        await fetchEmails();
      }
    } catch (e) {
      console.error("Error resetting token level:", e);
    }
  };

  // Reset all to default language (English) and revoke French verification
  const handleResetDefaultEnglish = async () => {
    try {
      const res = await fetch("/api/reset-auth", { method: "POST" });
      if (res.ok) {
        setIsFrenchVerified(false);
        setRegisteredEmail("");
        emailInitializedRef.current = false;
        setOtpVals(["7", "2", "", "", "", ""]);
        setOtpSentStatus("idle");
        setVerificationError("");
        setVerificationSuccess("");
        setCurrentLang(LanguageCode.EN);
        setSelectedTargetLang(LanguageCode.EN);
        await fetchEmails();
      }
    } catch (e) {
      console.error("Error resetting language state:", e);
    }
  };

  // Handle click on language options
  const handleLanguageSelect = (lang: Language) => {
    setSelectedTargetLang(lang.code);
    if (lang.code === LanguageCode.FR) {
      if (isFrenchVerified) {
        setCurrentLang(LanguageCode.FR);
      } else {
        // Keeps interface lang on English for sidebar validation securely
        setCurrentLang(LanguageCode.EN);
        setVerificationError("");
        setVerificationSuccess("");
      }
    } else {
      setCurrentLang(lang.code);
    }
  };

  // Dynamic Translate via Gemini API server Proxy
  const handleCustomTranslate = async () => {
    if (!customText.trim()) return;
    setIsTranslating(true);
    setTranslatedResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: customText,
          targetLanguage: currentLang,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslatedResult(data.translatedText);
        setDetectedSourceLang(data.detectedLanguage || "Gemini Neural Translate Autodetect");
      } else {
        setTranslatedResult(`Gemini gateway returned error statement: ${data.error}`);
      }
    } catch (e) {
      setTranslatedResult("Translation server offline or timeout.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Custom extractor copied-code handler
  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCodeId(code);
    
    // Fill the 6 single slots instantly for top-tier developer UX
    const digits = code.split("").slice(0, 6);
    const filled = [...digits];
    while (filled.length < 6) filled.push("");
    setOtpVals(filled);
    
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  // Slots input change navigation
  const handleOtpInputChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const newVals = [...otpVals];
      newVals[index] = "";
      setOtpVals(newVals);
      return;
    }
    
    const digit = cleanVal[cleanVal.length - 1];
    const newVals = [...otpVals];
    newVals[index] = digit;
    setOtpVals(newVals);
    
    // Auto focus next input
    if (index < 5 && digit !== "") {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Keyboard navigation backspacing
  const handleOtpInputKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpVals[index] && index > 0) {
        const newVals = [...otpVals];
        newVals[index - 1] = "";
        setOtpVals(newVals);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newVals = [...otpVals];
        newVals[index] = "";
        setOtpVals(newVals);
      }
    }
  };

  // Clipboard paste behavior
  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(text)) {
      setOtpVals(text.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // Masked email generator mimicking mockup precisely
  const getMaskedEmail = (raw: string) => {
    if (!raw) return "j***n@global-corp.net";
    // Check if it's sumitsoni
    if (raw.toLowerCase().includes("sumitsoni")) {
      return "s***i@iujaipur.edu.in";
    }
    const [local, domain] = raw.split("@");
    if (!local || !domain) return raw;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const activeEmailObj = emails.find(m => m.id === selectedEmailId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden antialiased">
      
      {/* Exact Header mimicking mockup layout and dimensions */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 h-20 flex justify-between items-center sticky top-0 z-40 select-none">
        
        {/* Left Segment - Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Language Changer</span>
        </div>



      </header>

      {/* Primary Workspace responsive layout */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-12">
        <AnimatePresence mode="wait">
          
          {/* Active Tab: Preferences (DEFAULT - EXACT COPY OF SCREENSHOT) */}
          <motion.main
            key="preferences-tab-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col lg:flex-row gap-10"
          >
              
              {/* Left Main Pane - Language Settings */}
              <section className={`w-full ${selectedTargetLang === LanguageCode.FR ? "lg:w-2/3" : ""}`}>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{content.langSettingsTitle}</h1>
                  <p className="text-slate-500 mb-8 max-w-xl">
                    {content.langSettingsDesc}
                  </p>
                </div>

                {/* Exact 2 Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isTarget = selectedTargetLang === lang.code;
                    const isCurrent = currentLang === lang.code;
                    const isFrench = lang.code === LanguageCode.FR;
                    
                    return (
                      <button
                        key={lang.code}
                        id={`frBtn-${lang.code}`}
                        onClick={() => handleLanguageSelect(lang)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 hover:border-slate-300 text-left transition-all ${
                          isTarget
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                            : "bg-white border-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold ${isTarget ? "text-indigo-900" : "text-slate-900"}`}>
                            {lang.localName}
                          </span>
                          <span className={`text-xs ${isTarget ? "text-indigo-400" : "text-slate-400"}`}>
                            {lang.name}
                          </span>
                        </div>

                        {/* Minimalist circular radio outline */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isTarget ? "border-indigo-600" : "border-slate-200"
                        }`}>
                          {isTarget && (
                            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Reset to Default Language (English) Section */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="max-w-md">
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      {currentLang === LanguageCode.EN 
                        ? {
                            [LanguageCode.EN]: "System Language Default",
                            [LanguageCode.ES]: "Idioma predeterminado del sistema",
                            [LanguageCode.HI]: "सिस्टम भाषा डिफ़ॉल्ट",
                            [LanguageCode.PT]: "Idioma padrão do sistema",
                            [LanguageCode.ZH]: "系统语言默认",
                            [LanguageCode.FR]: "Langue système par défaut",
                          }[currentLang] || "System Language Default"
                        : {
                            [LanguageCode.EN]: "Reset Language Customization",
                            [LanguageCode.ES]: "Restablecer personalización de idioma",
                            [LanguageCode.HI]: "भाषा अनुकूलन रीसेट करें",
                            [LanguageCode.PT]: "Redefinir personalização de idioma",
                            [LanguageCode.ZH]: "重置语言自定义配置",
                            [LanguageCode.FR]: "Réinitialiser la personnalisation de la langue",
                          }[currentLang] || "Reset Language Customization"
                      }
                    </h3>
                    <p className="text-xs text-slate-500">
                      {
                        {
                          [LanguageCode.EN]: "Reset all active interface translations back to English and revoke active French location security authorization status instantly.",
                          [LanguageCode.ES]: "Restablezca todas las traducciones de la interfaz activas al inglés y revoque la autorización del estado de seguridad de Francia al instante.",
                          [LanguageCode.HI]: "सभी सक्रिय इंटरफ़ेस अनुवादों को वापस अंग्रेज़ी में रीसेट करें और फ़्रेंच स्थान सुरक्षा प्राधिकरण स्तर को तुरंत निरस्त करें।",
                          [LanguageCode.PT]: "Redefina todas as traduções da interface ativa de volta para o inglês e revogue instantaneamente o status de autorização de segurança da França.",
                          [LanguageCode.ZH]: "将所有当前的界面翻译一键重置回英文默认状态，并立即注销已经通过验证的法语安全凭证。",
                          [LanguageCode.FR]: "Réinitialisez toutes les traductions actives de l'interface vers l'anglais et révoquez l'autorisation de sécurité française instantanément.",
                        }[currentLang] || "Reset all active interface translations back to English and revoke active French location security authorization status instantly."
                      }
                    </p>
                  </div>
                  <button
                    id="reset-default-english-btn"
                    onClick={handleResetDefaultEnglish}
                    className="flex items-center gap-2 px-5 py-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition duration-150 cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                  >
                    <Languages className="h-4 w-4 text-indigo-600" />
                    <span>
                      {
                        {
                          [LanguageCode.EN]: "Reset to Default Language (English)",
                          [LanguageCode.ES]: "Restablecer al idioma predeterminado (Inglés)",
                          [LanguageCode.HI]: "डिफ़ॉल्ट भाषा (अंग्रेज़ी) पर रीसेट करें",
                          [LanguageCode.PT]: "Redefinir para o idioma padrão (Inglês)",
                          [LanguageCode.ZH]: "重置为默认语言（英语）",
                          [LanguageCode.FR]: "Réinitialiser à la langue par défaut (Anglais)"
                        }[currentLang] || "Reset to Default Language (English)"
                      }
                    </span>
                  </button>
                </div>
              </section>

              {/* Right Sidebar - Security Verification Aside Form */}
              {selectedTargetLang === LanguageCode.FR && (
                <aside id="otpSection" className="w-full lg:w-1/3 flex flex-col gap-4">
                  <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Shield Icon container mimicking mockup exactly */}
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      </div>

                      <h2 className="text-xl font-bold mb-2 text-slate-900">{content.securityVerificationTitle}</h2>
                      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        {content.securityVerificationdesc}
                      </p>

                      {/* Email display container inside the card */}
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {content.registeredEmailLabel}
                        </label>
                        <input
                          id="registered-email-input"
                          type="email"
                          value={registeredEmail}
                          onChange={(e) => setRegisteredEmail(e.target.value)}
                          placeholder="Enter email..."
                          disabled={otpSentStatus === "sent"}
                          className="w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 font-mono text-sm tracking-wide outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* OTP status transition trigger buttons */}
                      {otpSentStatus !== "sent" ? (
                        <button
                          id="genOtp"
                          onClick={handleGenerateOTP}
                          disabled={otpSentStatus === "sending"}
                          className="w-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 py-3 rounded-xl font-semibold transition-colors mb-4 cursor-pointer"
                        >
                          {otpSentStatus === "sending" ? content.generatingCodeLabel : content.generateOtpCodeBtn}
                        </button>
                      ) : (
                        <div className="space-y-4">
                          {/* Sent green notification badge */}
                          <div id="otpSent" className="p-4 bg-green-50 border border-green-100 rounded-lg">
                            <p className="text-green-700 text-xs font-medium text-center">
                              {content.codeSentAlert}
                            </p>
                          </div>

                          {/* OTP Verification Grid Blocks */}
                          <div id="otpInputs" className="flex flex-col gap-4">
                            <div className="flex justify-between gap-2">
                              {otpVals.map((val, idx) => (
                                <input
                                  key={idx}
                                  ref={(el) => { otpRefs.current[idx] = el; }}
                                  type="text"
                                  maxLength={1}
                                  value={val}
                                  onChange={(e) => handleOtpInputChange(idx, e.target.value)}
                                  onKeyDown={(e) => handleOtpInputKeyDown(idx, e)}
                                  onPaste={idx === 0 ? handleOtpPaste : undefined}
                                  className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-slate-200 focus:border-indigo-500 rounded-lg text-center font-bold text-xl outline-none transition-colors bg-white text-slate-800"
                                />
                              ))}
                            </div>

                            {/* Submit OTP Application validation */}
                            <button
                              onClick={handleVerifyOTP}
                              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-100 transition-colors cursor-pointer"
                            >
                              {content.verifyAndApplyLanguageBtn}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Validation Error/Success feedback loggers */}
                      {verificationError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-start gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{verificationError}</span>
                        </div>
                      )}

                      {verificationSuccess && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-xs font-bold text-center">
                          {verificationSuccess}
                        </div>
                      )}
                    </div>

                    {/* Resend waiting indicators */}
                    <div className="mt-6 text-center">
                      <p className="text-xs text-slate-400">
                        {resendTimer > 0 
                          ? content.waitResendLabel.replace("{time}", resendTimer.toString()) 
                          : content.readyResendLabel}
                      </p>
                    </div>

                  </div>
                </aside>
              )}

            </motion.main>

        </AnimatePresence>
      </div>

      {/* Floating high-fidelity sandbox email drawer */}
      <AnimatePresence>
        {isMailboxOpen && (
          <>
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMailboxOpen(false)}
              className="fixed inset-0 bg-slate-900 z-40 transition-opacity"
            />

            {/* Slider container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-50 shadow-2xl flex flex-col"
            >
              {/* Inbox Header */}
              <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs uppercase font-mono tracking-wider font-bold">
                    {content.sandboxEmailLogsTitle}
                  </span>
                </div>
                <button
                  onClick={() => setIsMailboxOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Subtitle account profile identifier info */}
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200/80 shrink-0">
                <span className="text-[10px] block text-slate-400 uppercase font-bold leading-none mb-1">{content.loggedToLabel}</span>
                <span className="text-xs block font-mono font-bold text-slate-800 truncate">
                  {registeredEmail}
                </span>
              </div>

              {/* Emails Hub List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                {emails.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 h-full flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">{content.inboxEmptyTitle}</p>
                    <p className="text-[10px] text-slate-400 max-w-xs">{content.inboxEmptyDesc}</p>
                  </div>
                ) : (
                  emails.map((email) => {
                    const isSelected = selectedEmailId === email.id;
                    const isUnread = !email.isRead;
                    return (
                      <button
                        key={email.id}
                        onClick={() => handleMarkAsRead(email.id)}
                        className={`w-full text-left p-4 hover:bg-slate-100 transition cursor-pointer relative ${
                          isSelected ? "bg-white border-l-3 border-indigo-600 shadow-sm" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[10px] truncate max-w-[140px] font-extrabold ${isUnread ? "text-slate-900" : "text-slate-400"}`}>
                            {email.from.split("<")[0].trim()}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {email.timestamp}
                          </span>
                        </div>
                        
                        <h4 className={`text-xs truncate mr-4 mt-1 ${isUnread ? "font-bold text-indigo-700" : "text-slate-600"}`}>
                          {email.subject}
                        </h4>
                        
                        {isUnread && (
                          <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Target Body visual viewport */}
              <div className="h-72 bg-white border-t border-slate-200 flex flex-col relative shrink-0">
                {activeEmailObj ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 truncate leading-tight">{activeEmailObj.subject}</h4>
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5">{content.byLabel}: {activeEmailObj.from}</span>
                      </div>

                      {/* Prefilling instant click injector helper */}
                      {activeEmailObj.code && (
                        <button
                          onClick={() => handleCopyCode(activeEmailObj.code)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                            copiedCodeId === activeEmailObj.code 
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse" 
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 cursor-pointer"
                          }`}
                          title="Fills the 6-digit confirmation boxes instantly"
                        >
                          {copiedCodeId === activeEmailObj.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedCodeId === activeEmailObj.code ? content.filledLabel : content.autofillLabel}</span>
                        </button>
                      )}
                    </div>

                    {/* Prosed email view */}
                    <div className="flex-1 overflow-y-auto p-4 leading-relaxed text-xs text-slate-600">
                      <div 
                        className="prose prose-xs max-w-none text-slate-600"
                        dangerouslySetInnerHTML={{ __html: activeEmailObj.body }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 h-full text-slate-400 italic text-xs">
                    {content.previewEmailPrompt}
                  </div>
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
