import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SmartphoneIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  Loader2Icon,
  ArrowLeftIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const BANNER_KEY = "dr_new_login_banner";
const BANNER_EXPIRY = 3 * 24 * 60 * 60 * 1000;

export function PhoneLoginGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, sendCode, verifyCode } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Loader2Icon className="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">正在验证身份...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return <PhoneLoginForm sendCode={sendCode} verifyCode={verifyCode} />;
}

// ---- Banner ----

function NewLoginBanner() {
  const [visible, setVisible] = useState(() => {
    const stored = localStorage.getItem(BANNER_KEY);
    if (stored) {
      const expiry = parseInt(stored, 10);
      return Date.now() < expiry;
    }
    localStorage.setItem(BANNER_KEY, String(Date.now() + BANNER_EXPIRY));
    return true;
  });

  if (!visible) return null;

  return (
    <div className="w-full max-w-sm mb-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-accent/60 border border-primary/10 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <SmartphoneIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">手机号登录</p>
          <p className="text-xs text-muted-foreground mt-0.5">测试验证码：1234</p>
        </div>
        <button onClick={() => setVisible(false)} className="text-muted-foreground hover:text-foreground p-1">
          <span className="text-xs">关闭</span>
        </button>
      </div>
    </div>
  );
}

// ---- Login Form ----

function PhoneLoginForm({
  sendCode,
  verifyCode,
}: {
  sendCode: (phone: string) => Promise<{ success: boolean; error?: string; debugCode?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [debugCode, setDebugCode] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);

  const handleSendCode = useCallback(async () => {
    if (!isPhoneValid || isSending || countdown > 0) return;
    setIsSending(true);
    setError("");
    try {
      const result = await sendCode(phone);
      if (result.success) {
        if (result.debugCode) setDebugCode(result.debugCode);
        setStep("code");
        setCountdown(60);
      } else {
        setError(result.error || "发送失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setIsSending(false);
    }
  }, [phone, isPhoneValid, isSending, countdown, sendCode]);

  const handleVerify = useCallback(async () => {
    if (code.length < 4 || isVerifying) return;
    setIsVerifying(true);
    setError("");
    try {
      const result = await verifyCode(phone, code);
      if (!result.success) {
        setError(result.error || "验证码错误");
      }
      // Success: AuthContext updates isAuthenticated → PhoneLoginGate re-renders → auto-redirect
    } catch {
      setError("网络错误");
    } finally {
      setIsVerifying(false);
    }
  }, [phone, code, isVerifying, verifyCode]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 md:px-8 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 rounded-full bg-warning/[0.03] blur-3xl" />
      </div>

      <NewLoginBanner />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 rounded-3xl bg-primary/15 blur-xl scale-125" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/85 flex items-center justify-center shadow-[0_8px_32px_rgba(79,70,229,0.2)]">
              <span className="text-primary-foreground text-3xl font-black tracking-tight">R</span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-[32px] font-black tracking-tight text-foreground"
          >
            Daily Review
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-muted-foreground text-[15px] mt-2.5 leading-relaxed"
          >
            记录每日工作，AI 智能复盘
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card rounded-[24px] border border-border/80 shadow-lg overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-colors", step === "phone" ? "bg-primary text-primary-foreground shadow-sm" : "bg-success text-success-foreground")}>
                {step === "code" ? <CheckCircle2Icon className="w-4 h-4" /> : "1"}
              </div>
              <div className="flex-1 h-1 bg-border rounded-full relative overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0 bg-primary rounded-full" initial={{ width: "0%" }} animate={{ width: step === "code" ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </div>
              <div className={cn("flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-colors", step === "code" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground")}>2</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center font-medium">{step === "phone" ? "输入手机号" : "输入验证码"}</p>
          </div>

          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div key="phone" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">手机号</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-accent/60 flex items-center justify-center">
                        <SmartphoneIcon className="w-4 h-4 text-primary" />
                      </div>
                      <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); setError(""); }} onKeyDown={(e) => e.key === "Enter" && isPhoneValid && handleSendCode()} placeholder="请输入手机号" className="w-full pl-14 pr-4 py-3.5 bg-muted/40 border border-border rounded-xl text-foreground text-[15px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-card transition-colors" autoComplete="tel" inputMode="numeric" autoFocus />
                    </div>
                  </div>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/15">
                      <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </motion.div>
                  )}
                  <button onClick={handleSendCode} disabled={!isPhoneValid || isSending} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm hover:shadow-md">
                    {isSending ? <><Loader2Icon className="w-4 h-4 animate-spin" />发送中...</> : <>获取验证码<ArrowRightIcon className="w-4 h-4" /></>}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="code" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.3 }} className="space-y-5">
                  <button onClick={() => { setStep("phone"); setCode(""); setError(""); setDebugCode(""); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                    <ArrowLeftIcon className="w-3.5 h-3.5" />更换手机号
                  </button>
                  <div className="flex items-center gap-3 px-4 py-3 bg-accent/30 rounded-xl border border-primary/10">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <SmartphoneIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1 **** $2")}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">验证码</label>
                      <button onClick={handleSendCode} disabled={countdown > 0} className="text-xs font-semibold text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors">
                        {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送"}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-accent/60 flex items-center justify-center">
                        <ShieldCheckIcon className="w-4 h-4 text-primary" />
                      </div>
                      <input type="text" inputMode="numeric" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && handleVerify()} placeholder="请输入验证码（测试：1234）" className="w-full pl-14 pr-4 py-3.5 bg-muted/40 border border-border rounded-xl text-foreground text-[15px] tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-card transition-colors" autoComplete="one-time-code" autoFocus />
                    </div>
                  </div>
                  {debugCode && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent/40 border border-primary/15">
                      <span className="text-xs text-primary/70 font-medium">测试验证码：</span>
                      <span className="text-sm font-mono font-bold text-primary tracking-widest">{debugCode}</span>
                    </div>
                  )}
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/15">
                      <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </motion.div>
                  )}
                  <button onClick={handleVerify} disabled={code.length < 4 || isVerifying} className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm hover:shadow-md">
                    {isVerifying ? <><Loader2Icon className="w-4 h-4 animate-spin" />验证中...</> : <>登录<ArrowRightIcon className="w-4 h-4" /></>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-xs text-muted-foreground mt-8">
          登录即表示同意服务条款和隐私政策
        </motion.p>
      </motion.div>
    </div>
  );
}
