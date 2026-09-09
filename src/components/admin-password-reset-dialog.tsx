"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getApiErrorStatus } from "@/lib/api";
import { resetVenueAccountPassword, type PasswordResetResult } from "@/lib/admin-password-reset";

export function AdminPasswordResetDialog({ managerId, staffUserId, email, disabled, compact = false, onReset }: {
  managerId: string;
  staffUserId?: string;
  email: string;
  disabled?: boolean;
  compact?: boolean;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [error, setError] = useState("");
  const [stopped, setStopped] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const credential = useRef<PasswordResetResult | null>(null);

  function clearCredential() {
    if (credential.current) credential.current.temporaryPassword = "";
    credential.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearCredential();
    };
  }, []);

  function changeOpen(next: boolean) {
    if (inFlight.current) return;
    clearCredential();
    setResult(null);
    setError("");
    setStopped(false);
    setCopyStatus("");
    setOpen(next);
  }

  async function reset() {
    if (inFlight.current || result || stopped) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const data = await resetVenueAccountPassword(managerId, staffUserId);
      if (!mounted.current) {
        data.temporaryPassword = "";
        return;
      }
      credential.current = data;
      setResult(data);
    } catch (cause: unknown) {
      if (!mounted.current) return;
      const status = getApiErrorStatus(cause);
      setStopped(true);
      setError(status === 404
        ? "Venue manager not found"
        : status === 403 || status === 401
          ? "An admin session is required to reset passwords."
          : "Could not confirm the password reset. Check with the account holder before trying again.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  async function copy() {
    const current = credential.current;
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.temporaryPassword);
      if (mounted.current && credential.current === current) setCopyStatus("Copied");
    } catch {
      if (mounted.current && credential.current === current) setCopyStatus("Could not copy. Select and copy the password manually.");
    }
  }

  function close() {
    const wasReset = result !== null;
    changeOpen(false);
    if (wasReset) onReset?.();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => next ? changeOpen(true) : close()}>
      <DialogTrigger render={<Button type="button" variant="outline" size={compact ? "icon-sm" : "sm"} disabled={disabled} aria-label={`Reset password for ${email}`} title={compact ? "Reset password" : undefined} />}>
        <KeyRound className="h-3.5 w-3.5" />
        {!compact && "Reset password"}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending} className="border border-[var(--border)] bg-[var(--bg-1)] sm:max-w-lg">
        <DialogHeader className="pr-6">
          <DialogTitle>{result ? "Password reset" : "Reset password?"}</DialogTitle>
          <DialogDescription className="break-words">
            {result
              ? result.emailSent
                ? `Password reset. We emailed it to ${result.email}.`
                : "Password reset. Email could not be sent. Share this password now, before closing; this is the only copy."
              : `Reset password for ${email}? They will be signed out on all devices and must set a new password at next sign-in.`}
          </DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-3)]">Use this password only if the account holder cannot access their email. It cannot be viewed again after closing.</p>
            <p className="text-xs text-[var(--text-3)]">Temporary password for {result.email}</p>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-0)] p-3">
              <code className="min-w-0 flex-1 select-all break-all font-mono text-lg">{result.temporaryPassword}</code>
              <Button type="button" variant="outline" size="sm" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copy</Button>
            </div>
            <p role="status" className="text-xs text-[var(--text-3)]">{copyStatus}</p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-[var(--semantic-red)]">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={close}>{result || stopped ? "Close" : "Cancel"}</Button>
          {!result && !stopped && <Button type="button" variant="destructive" disabled={pending} onClick={reset}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{pending ? "Resetting..." : "Reset password"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
