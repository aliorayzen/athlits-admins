"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CredentialsMessageProps {
  name: string;
  email: string;
  tempPassword: string;
  accountType: "venue-manager" | "staff";
  className?: string;
}

export function buildCredentialsMessage({
  name,
  email,
  tempPassword,
  accountType,
}: Omit<CredentialsMessageProps, "className">): string {
  const englishRole = accountType === "venue-manager" ? "venue manager" : "venue staff";
  const arabicRole = accountType === "venue-manager" ? "مدير المنشأة" : "موظف المنشأة";

  return `Hello ${name},
These are your Athlits ${englishRole} credentials:
Email: ${email}
Temporary password: ${tempPassword}
Please change the temporary password after signing in.

مرحباً ${name}،
هذه بيانات الدخول الخاصة بك كـ ${arabicRole} على Athlits:
البريد الإلكتروني: ${email}
كلمة المرور المؤقتة: ${tempPassword}
يرجى تغيير كلمة المرور المؤقتة بعد تسجيل الدخول.`;
}

export function CredentialsMessage({
  name,
  email,
  tempPassword,
  accountType,
  className,
}: CredentialsMessageProps) {
  const [copied, setCopied] = useState(false);
  const message = useMemo(
    () => buildCredentialsMessage({ name, email, tempPassword, accountType }),
    [accountType, email, name, tempPassword],
  );

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Credential message copied");
    } catch {
      toast.error("Could not copy the message. Select the text and copy it manually.");
    }
  }

  return (
    <section
      aria-labelledby="credentials-message-title"
      className={cn(
        "rounded-lg border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.07)] p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[rgba(16,185,129,0.12)] text-[var(--semantic-green)]">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h2 id="credentials-message-title" className="text-[13.5px] font-semibold text-[var(--text-1)]">
              Account created. Copy the login message now.
            </h2>
            <p className="mt-1 text-[11.5px] leading-5 text-[var(--text-3)]">
              The temporary password is shown here so you can send it securely to the user.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyMessage()}
          className="h-8 border-[rgba(16,185,129,0.24)] bg-[var(--bg-0)] text-[var(--text-1)] hover:bg-[var(--bg-2)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[var(--semantic-green)]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy message"}
        </Button>
      </div>
      <pre
        dir="auto"
        tabIndex={0}
        className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-0)] p-3 font-mono text-[11.5px] leading-[1.65] text-[var(--text-2)] selection:bg-[var(--teal-subtle)]"
      >
        {message}
      </pre>
    </section>
  );
}
