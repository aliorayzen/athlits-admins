"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { AthlitsLogo } from "@/components/athlits-logo";
import { useAuth } from "@/context/auth-context";
import { adminLogin } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  Check,
  AlertCircle,
  Clipboard,
  Lock,
} from "lucide-react";

type Step = "email" | "otp";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const SUPPORT_EMAIL = "support@orayzen.com";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getGreeting(hour: number): string {
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late?";
}

/* ── Reduced-motion detector ─────────────────────────────── */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getReducedMotionServerSnapshot(): boolean {
  return false;
}
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

/* ── Ticking clock ──────────────────────────────────────── *
 * getSnapshot must return a STABLE value between subscription ticks,
 * otherwise React re-renders infinitely (the snapshot "keeps changing"
 * every render). We cache cachedNow and only mutate it inside the
 * interval tick, guaranteeing render-to-render equality.
 */
let cachedNow = 0;
function subscribeSecondTick(cb: () => void): () => void {
  cachedNow = Date.now();
  cb();
  const id = setInterval(() => {
    cachedNow = Date.now();
    cb();
  }, 1000);
  return () => clearInterval(id);
}
function getNowSnapshot(): number {
  return cachedNow;
}
function getNowServerSnapshot(): number {
  return 0;
}
function useNow(): number {
  return useSyncExternalStore(
    subscribeSecondTick,
    getNowSnapshot,
    getNowServerSnapshot,
  );
}

function useExpiryCountdown(startedAt: number | null, minutes: number) {
  const now = useNow();
  return useMemo(() => {
    if (!startedAt || now === 0) return null;
    const expiresAt = startedAt + minutes * 60_000;
    const remainingMs = Math.max(0, expiresAt - now);
    const mm = Math.floor(remainingMs / 60_000);
    const ss = Math.floor((remainingMs % 60_000) / 1000);
    return {
      expired: remainingMs === 0,
      label: `${mm}:${ss.toString().padStart(2, "0")}`,
    };
  }, [startedAt, minutes, now]);
}

/* ── Time-aware greeting (hooked-ux: micro-recognition reward) ── */
function useGreeting(): string {
  const [greeting, setGreeting] = useState<string>("Welcome back");
  useEffect(() => {
    const update = () => setGreeting(getGreeting(new Date().getHours()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

/* ── OTP digit-box input ───────────────────────────────── */
interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  hasError: boolean;
  disabled: boolean;
}

function OtpInput({ value, onChange, hasError, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const reduceMotion = usePrefersReducedMotion();
  const inputShadow = "inset 0 1px 0 rgba(255,255,255,0.03)";

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (char.length > 1) {
        const pasted = char.replace(/\D/g, "").slice(0, OTP_LENGTH);
        onChange(pasted);
        const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
        inputsRef.current[focusIdx]?.focus();
        return;
      }
      if (char && !/^\d$/.test(char)) return;

      const digits = value.split("");
      digits[index] = char;
      const next = digits.join("").slice(0, OTP_LENGTH);
      onChange(next);

      if (char && index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        return;
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputsRef.current[index - 1]?.focus();
        return;
      }
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        e.preventDefault();
        inputsRef.current[index + 1]?.focus();
      }
    },
    [value],
  );

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const hasDig = Boolean(value[i]);
        const borderColor = disabled
          ? "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-4)]"
          : hasError
            ? "border-[var(--semantic-red)]"
            : hasDig
              ? "border-[rgba(0,212,170,0.25)] bg-[rgba(0,212,170,0.04)]"
              : "border-[var(--border)]";
        const style: React.CSSProperties = { boxShadow: inputShadow };
        if (hasDig && !reduceMotion) {
          style.animation = "digit-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
        }
        return (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ""}
            autoFocus={i === 0}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              handleChange(i, e.clipboardData.getData("text"));
            }}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={hasError}
            className={`h-14 w-12 rounded-[var(--radius)] border-[1.5px] bg-[var(--bg-1)] text-center font-mono text-[20px] font-bold text-[var(--text-1)] outline-none transition-all duration-200 focus:border-[var(--teal)] focus:bg-[rgba(0,212,170,0.03)] focus:ring-[3px] focus:ring-[rgba(0,212,170,0.1)] disabled:cursor-not-allowed ${borderColor}`}
            style={style}
          />
        );
      })}
    </div>
  );
}

/* ── Constellation (8-city signature moment) ──────────── */
function Constellation() {
  return (
    <div className="relative mt-16 h-12 w-full max-w-[520px]">
      <svg
        viewBox="0 0 520 48"
        fill="none"
        className="constellation-svg block h-full w-full"
      >
        <g opacity="0.12" stroke="#00d4aa" strokeWidth="1">
          <line x1="60" y1="28" x2="130" y2="18" />
          <line x1="130" y1="18" x2="200" y2="30" />
          <line x1="200" y1="30" x2="265" y2="14" />
          <line x1="265" y1="14" x2="330" y2="26" />
          <line x1="330" y1="26" x2="395" y2="18" />
          <line x1="395" y1="18" x2="445" y2="32" />
          <line x1="445" y1="32" x2="490" y2="20" />
        </g>
        <g className="dots">
          <circle cx="60" cy="28" r="2.5" fill="#00d4aa" />
          <circle cx="130" cy="18" r="2.5" fill="#00d4aa" />
          <circle cx="200" cy="30" r="2.5" fill="#00d4aa" />
          <circle cx="265" cy="14" r="3" fill="#00d4aa" />
          <circle cx="330" cy="26" r="2.5" fill="#00d4aa" />
          <circle cx="395" cy="18" r="2.5" fill="#00d4aa" />
          <circle cx="445" cy="32" r="2.5" fill="#00d4aa" />
          <circle cx="490" cy="20" r="2.5" fill="#00d4aa" />
        </g>
      </svg>
      <div className="mt-2.5 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-4)]">
        Operating{" "}
        <strong className="font-semibold text-[var(--text-3)]">8 cities</strong>{" "}
        ·{" "}
        <strong className="font-semibold text-[var(--text-3)]">
          24 venues
        </strong>{" "}
        · zero downtime today
      </div>
    </div>
  );
}

/* ── Disabled SSO button (Google / GitHub — "launching Q3") ─ */
function SsoButton({
  provider,
  icon,
}: {
  provider: "Google" | "GitHub";
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className="group relative flex items-center justify-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] px-4 py-3 text-[13px] font-medium text-[var(--text-3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] opacity-55 transition-opacity duration-200 hover:opacity-70 disabled:cursor-not-allowed"
    >
      {icon}
      <span className="flex-1 text-left">{provider}</span>
      <Lock className="h-3 w-3 opacity-70" />
    </button>
  );
}

/* ── Main login page ───────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth();
  const reduceMotion = usePrefersReducedMotion();
  const greeting = useGreeting();
  const [fromParam, setFromParam] = useState<string | null>(null);

  // Read ?from= from the URL on mount. Avoids `useSearchParams` so we don't
  // trigger Next's CSR-bailout requirement for a Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setFromParam(params.get("from"));
  }, []);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_OTP_ATTEMPTS);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [emailShakeNonce, setEmailShakeNonce] = useState(0);
  const [otpShakeNonce, setOtpShakeNonce] = useState(0);
  const [resendBumpNonce, setResendBumpNonce] = useState(0);

  const lastAutoSubmitted = useRef<string>("");
  const screenRef = useRef<HTMLDivElement>(null);
  const emailPillRef = useRef<HTMLDivElement>(null);
  const otpWrapperRef = useRef<HTMLDivElement>(null);
  const resendButtonRef = useRef<HTMLButtonElement>(null);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email);
  const emailValid = email.length > 0 && isValidEmail(email);
  const expiry = useExpiryCountdown(otpSentAt, OTP_EXPIRY_MINUTES);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Parallax for constellation (sets CSS vars on the screen root)
  useEffect(() => {
    if (reduceMotion) return;
    const el = screenRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const handler = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const mx = (e.clientX / w - 0.5) * 2;
        const my = (e.clientY / h - 0.5) * 2;
        el.style.setProperty("--mx", mx.toFixed(3));
        el.style.setProperty("--my", my.toFixed(3));
        rafId = null;
      });
    };
    el.addEventListener("mousemove", handler);
    return () => {
      el.removeEventListener("mousemove", handler);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [reduceMotion]);

  // Pill shake (email error)
  useEffect(() => {
    if (!emailShakeNonce || reduceMotion) return;
    const el = emailPillRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation =
      "pill-shake 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97)";
  }, [emailShakeNonce, reduceMotion]);

  // OTP shake (verify error)
  useEffect(() => {
    if (!otpShakeNonce || reduceMotion) return;
    const el = otpWrapperRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation =
      "pill-shake 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97)";
  }, [otpShakeNonce, reduceMotion]);

  // Resend button bump
  useEffect(() => {
    if (!resendBumpNonce || reduceMotion) return;
    const el = resendButtonRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "resend-bump 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  }, [resendBumpNonce, reduceMotion]);

  const transitionTo = useCallback((nextStep: Step) => {
    setIsFading(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsFading(false);
    }, 200);
  }, []);

  const handleVerifyOtp = useCallback(
    async (codeOverride?: string) => {
      const code = codeOverride ?? otp;
      if (code.length < OTP_LENGTH) return;
      if (expiry?.expired) {
        setOtpError("Code expired. Request a new one.");
        return;
      }
      setIsLoading(true);
      setOtpError(null);
      try {
        await login(email, code, fromParam ?? undefined);
        toast.success("Welcome back");
      } catch {
        const remaining = Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(remaining);
        if (remaining === 0) {
          setOtpError(
            `Too many incorrect attempts. Email ${SUPPORT_EMAIL} to reset.`,
          );
        } else {
          setOtpError(
            `Incorrect code. ${remaining} ${remaining === 1 ? "try" : "tries"} left.`,
          );
        }
        setOtp("");
        lastAutoSubmitted.current = "";
        setOtpShakeNonce((n) => n + 1);
      } finally {
        setIsLoading(false);
      }
    },
    [otp, email, login, attemptsLeft, expiry?.expired, fromParam],
  );

  // Auto-submit once OTP reaches full length
  useEffect(() => {
    if (step !== "otp") return;
    if (otp.length !== OTP_LENGTH) return;
    if (lastAutoSubmitted.current === otp) return;
    if (isLoading) return;
    if (attemptsLeft === 0) return;
    lastAutoSubmitted.current = otp;
    void handleVerifyOtp(otp);
  }, [otp, step, isLoading, attemptsLeft, handleVerifyOtp]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailTouched(true);
      setEmailShakeNonce((n) => n + 1);
      return;
    }
    setIsLoading(true);
    setEmailSendError(null);
    try {
      await adminLogin({ email });
      transitionTo("otp");
      setResendCooldown(RESEND_COOLDOWN);
      setAttemptsLeft(MAX_OTP_ATTEMPTS);
      setOtpError(null);
      setOtpSentAt(Date.now());
      lastAutoSubmitted.current = "";
      toast.success("Login code sent");
    } catch {
      setEmailSendError(
        "We couldn't send a code to that email. Check it and try again.",
      );
      setEmailShakeNonce((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setResendBumpNonce((n) => n + 1);
    try {
      await adminLogin({ email });
      setResendCooldown(RESEND_COOLDOWN);
      setAttemptsLeft(MAX_OTP_ATTEMPTS);
      setOtpError(null);
      setOtpSentAt(Date.now());
      setOtp("");
      lastAutoSubmitted.current = "";
      toast.success("New code sent");
    } catch {
      toast.error("Failed to resend code");
    }
  }

  function handleOtpFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleVerifyOtp();
  }

  return (
    <div
      ref={screenRef}
      className="login-screen relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-0)] p-8"
    >
      {/* Radial aura glow — breathing (top-design: atmosphere) */}
      <div
        aria-hidden
        className="login-aura pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 800px 500px at 50% 45%, rgba(0,212,170,0.12) 0%, rgba(0,212,170,0.04) 30%, transparent 65%),
            radial-gradient(ellipse 400px 300px at 50% 30%, rgba(245,158,11,0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.45]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      {/* Top-left Athlits wordmark */}
      <Link
        href="/"
        className="group relative z-[2] inline-flex w-fit items-center gap-2.5 text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-2)] no-underline transition-colors duration-200 hover:text-[var(--text-1)]"
      >
        <AthlitsLogo
          size={26}
          className="h-[26px] w-[26px] drop-shadow-[0_0_10px_rgba(0,212,170,0.22)] transition-[filter] duration-200 group-hover:drop-shadow-[0_0_16px_rgba(0,212,170,0.4)]"
        />
        <span>Athlits</span>
      </Link>

      {/* Centered stage */}
      <div className="relative z-[1] flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-6 py-12">
        <div
          className="flex w-full max-w-[440px] flex-col items-center text-center transition-opacity duration-200"
          style={{ opacity: isFading ? 0 : 1 }}
        >
          {step === "email" ? (
            <>
              {/* Hero heading — time-aware greeting */}
              <h1
                className="animate-stagger-1 text-balance font-extrabold leading-[1.05] tracking-[-0.03em]"
                style={{
                  fontSize: "clamp(44px, 6vw, 56px)",
                  backgroundImage:
                    "linear-gradient(165deg, #ffffff 0%, #e6e8ec 45%, #a8e6d5 130%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {greeting}
              </h1>

              <p className="animate-stagger-2 mt-3.5 max-w-[360px] text-[15px] leading-[1.55] text-[var(--text-3)]">
                Your venues,{" "}
                <strong className="font-medium text-[var(--text-2)]">
                  one tap away
                </strong>
                .
              </p>

              {/* Email pill form */}
              <form
                onSubmit={handleRequestOtp}
                className="animate-stagger-3 mt-9 w-full max-w-[380px]"
                noValidate
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-4)]">
                    Work email
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[var(--text-4)]">
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-1)] px-1.5 text-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]">
                      ⏎
                    </span>
                    to continue
                  </span>
                </div>

                <div
                  ref={emailPillRef}
                  className={`relative flex w-full items-center rounded-full border bg-[var(--bg-1)] py-1.5 pl-5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200 focus-within:-translate-y-px focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_0_3px_rgba(0,212,170,0.1),0_0_32px_-4px_rgba(0,212,170,0.35)] ${
                    emailError || emailSendError
                      ? "border-[var(--semantic-red)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_14px_-4px_rgba(244,63,94,0.3)] focus-within:border-[var(--semantic-red)]"
                      : "border-[var(--border)] focus-within:border-[rgba(0,212,170,0.35)]"
                  }`}
                >
                  <input
                    type="email"
                    placeholder="you@athlits.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailSendError) setEmailSendError(null);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    required
                    autoFocus
                    autoComplete="email"
                    aria-invalid={Boolean(emailError)}
                    className="min-w-0 flex-1 border-none bg-transparent py-3 text-[15px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)]"
                  />
                  {emailValid && (
                    <Check
                      className="mr-2 h-[18px] w-[18px] shrink-0 text-[var(--teal)]"
                      strokeWidth={3}
                      style={
                        reduceMotion
                          ? undefined
                          : {
                              animation:
                                "check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            }
                      }
                    />
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-label="Send login code"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--teal),#00b894)] text-[#060a0e] shadow-[0_0_16px_-4px_rgba(0,212,170,0.35)] transition-all duration-200 hover:-translate-y-px hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_0_24px_-4px_rgba(0,212,170,0.5)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>

                {emailError && (
                  <p
                    className="mt-2 text-left text-xs text-[var(--semantic-red)]"
                    role="alert"
                  >
                    Enter a valid email address
                  </p>
                )}
                {emailSendError && !emailError && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--semantic-red)]/40 bg-[var(--semantic-red)]/10 px-3 py-2 text-left text-xs text-[var(--semantic-red)] shadow-[0_4px_12px_-4px_rgba(244,63,94,0.25)]"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{emailSendError}</span>
                  </div>
                )}
              </form>

              {/* Divider */}
              <div className="animate-stagger-4 mb-5 mt-9 flex w-full max-w-[380px] items-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-4)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                or continue with
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {/* SSO row (disabled placeholders) */}
              <div className="animate-stagger-5 grid w-full max-w-[380px] grid-cols-2 gap-3">
                <SsoButton
                  provider="Google"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  }
                />
                <SsoButton
                  provider="GitHub"
                  icon={
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  }
                />
              </div>

              <div className="animate-stagger-5 mt-2.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--text-4)]">
                SSO · launching Q3
              </div>

              {/* Constellation signature */}
              <div className="animate-stagger-6">
                <Constellation />
              </div>

              {/* Help footer */}
              <div className="animate-stagger-6 mt-10 text-center text-[11px] text-[var(--text-4)]">
                Need access?{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group inline-flex items-center gap-1.5 font-medium text-[var(--text-3)] no-underline transition-colors duration-200 hover:text-[var(--teal-text)]"
                  style={{
                    borderBottom: "1px dashed var(--border-strong)",
                    paddingBottom: "2px",
                  }}
                >
                  <Mail className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-px group-hover:scale-110" />
                  Email support
                </a>
              </div>
            </>
          ) : (
            <>
              {/* OTP: Verify heading */}
              <h1
                className="animate-stagger-1 text-balance font-extrabold leading-[1.1] tracking-[-0.03em]"
                style={{
                  fontSize: "clamp(40px, 5.5vw, 52px)",
                  backgroundImage:
                    "linear-gradient(165deg, #ffffff 0%, #e6e8ec 45%, #a8e6d5 130%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Verify
              </h1>

              <p className="animate-stagger-2 mt-3.5 max-w-[380px] text-[14px] leading-[1.55] text-[var(--text-3)]">
                We sent a 6-digit code to{" "}
                <span className="break-all font-semibold text-[var(--text-1)]">
                  {email}
                </span>
              </p>

              <form
                onSubmit={handleOtpFormSubmit}
                className="animate-stagger-3 mt-9 w-full max-w-[380px]"
                noValidate
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-4)]">
                    6-digit code
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[var(--text-4)]">
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--bg-1)] px-1.5 text-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]">
                      ⌘V
                    </span>
                    to paste
                  </span>
                </div>

                <div ref={otpWrapperRef}>
                  <OtpInput
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (otpError) setOtpError(null);
                    }}
                    hasError={Boolean(otpError)}
                    disabled={isLoading || attemptsLeft === 0}
                  />
                </div>

                {/* Expiry + paste hint */}
                <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--text-4)]">
                  <span className="inline-flex items-center gap-2">
                    <Clipboard className="h-3 w-3" />
                    Paste code from email
                  </span>
                  {expiry && (
                    <span
                      className={`tabular-nums ${
                        expiry.expired ? "text-[var(--semantic-red)]" : ""
                      }`}
                    >
                      {expiry.expired
                        ? "Code expired"
                        : `Expires in ${expiry.label}`}
                    </span>
                  )}
                </div>

                {otpError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--semantic-red)]/40 bg-[var(--semantic-red)]/10 px-3 py-2 text-left text-xs text-[var(--semantic-red)] shadow-[0_4px_12px_-4px_rgba(244,63,94,0.25)]"
                  >
                    {attemptsLeft === 0 ? (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Digit counter / verifying / ready + resend */}
                <div className="mt-5 flex items-center justify-between text-xs text-[var(--text-4)]">
                  <span>
                    {otp.length < OTP_LENGTH ? (
                      <span className="tabular-nums">
                        {otp.length} / {OTP_LENGTH} digits
                      </span>
                    ) : isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verifying
                      </span>
                    ) : (
                      <span
                        className="text-[var(--semantic-green)]"
                        style={
                          reduceMotion
                            ? undefined
                            : {
                                animation:
                                  "check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                              }
                        }
                      >
                        Ready to verify
                      </span>
                    )}
                  </span>
                  <button
                    ref={resendButtonRef}
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className={`text-xs font-medium transition-all disabled:opacity-60 ${
                      resendCooldown > 0
                        ? "text-[var(--text-4)]"
                        : "text-[var(--teal-text)] hover:text-[var(--teal)]"
                    }`}
                    style={
                      resendCooldown === 0 && !reduceMotion
                        ? { animation: "ready-pulse 2s ease-in-out 3" }
                        : undefined
                    }
                  >
                    {resendCooldown > 0 ? (
                      <span className="tabular-nums">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      "Resend code"
                    )}
                  </button>
                </div>

                {/* Back link */}
                <button
                  type="button"
                  onClick={() => {
                    setOtp("");
                    setOtpError(null);
                    setOtpSentAt(null);
                    lastAutoSubmitted.current = "";
                    transitionTo("email");
                  }}
                  className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-transparent py-2 text-sm font-medium text-[var(--text-3)] transition-colors duration-200 hover:bg-[var(--bg-1)] hover:text-[var(--text-1)]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  Back to email
                </button>
              </form>

              {/* Help footer */}
              <div className="animate-stagger-6 mt-10 text-center text-[11px] text-[var(--text-4)]">
                Didn&apos;t get it?{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group inline-flex items-center gap-1.5 font-medium text-[var(--text-3)] no-underline transition-colors duration-200 hover:text-[var(--teal-text)]"
                  style={{
                    borderBottom: "1px dashed var(--border-strong)",
                    paddingBottom: "2px",
                  }}
                >
                  <Mail className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-px group-hover:scale-110" />
                  Email support
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
