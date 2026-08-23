"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "../lib/api-client";
import { saveSession, type SessionUser } from "../lib/session";

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0")) return `+255${digits.slice(1)}`;
  return `+255${digits}`;
}

type Props = {
  open: boolean;
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
};

export default function AuthModal({ open, mode, onModeChange, onClose, onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhone(""); setPassword(""); setFirstName(""); setLastName(""); setEmail(""); setAgree(false); setError("");
  }, [open, mode]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register" && !agree) { setError("Tafadhali kubali Masharti ya Matumizi na Sera ya Faragha."); return; }
    setBusy(true); setError("");
    try {
      const identifier = normalizeIdentifier(phone);
      const body = mode === "login"
        ? { identifier, password }
        : { name: `${firstName} ${lastName}`.trim(), phone: identifier, ...(email ? { email: email.trim().toLowerCase() } : {}), password };
      const session = await apiRequest<{ user: SessionUser; accessToken: string; refreshToken: string }>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      saveSession(session);
      onSuccess(session.user);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.payload && typeof caught.payload === "object" && typeof (caught.payload as { message?: unknown }).message === "string"
        ? String((caught.payload as { message: string }).message)
        : mode === "login" ? "Imeshindikana kuingia. Hakikisha namba na nenosiri ni sahihi." : "Imeshindikana kufungua akaunti. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="booking-modal-backdrop sports-login-backdrop" role="presentation" onMouseDown={() => !busy && onClose()}>
      <section className="booking-modal sports-login-modal" role="dialog" aria-modal="true" aria-labelledby="sports-login-title" onMouseDown={e => e.stopPropagation()}>
        <header>
          <div className="sports-login-heading">
            <img className="sports-login-mark" src="/brand/icon/mb-mark-color.png" alt="" />
            <div><span>{mode === "login" ? "KARIBU TENA" : "ANZA SASA"}</span><h2 id="sports-login-title">{mode === "login" ? "Ingia kwenye MkwanjaBet" : "Fungua akaunti yako"}</h2></div>
          </div>
          <button aria-label="Close" onClick={onClose} disabled={busy}>×</button>
        </header>
        <form className="sports-login-form" onSubmit={submit}>
          {mode === "register" && (
            <div className="sports-login-two-col">
              <label><span>Jina la kwanza</span><input required minLength={2} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Mfano: Asha" /></label>
              <label><span>Jina la mwisho</span><input required minLength={2} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mfano: Salum" /></label>
            </div>
          )}
          <label><span>Namba ya simu</span><div className="phone-field"><b>+255</b><input required autoFocus={mode === "login"} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))} placeholder="7XX XXX XXX" /></div></label>
          {mode === "register" && <label><span>Barua pepe <small>(si lazima)</small></span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jina@example.com" /></label>}
          <label><span>Nenosiri</span><div className="password-field"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Angalau tarakimu 8" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ficha" : "Onyesha"}</button></div></label>
          {mode === "register" && (
            <label className="sports-login-check">
              <input required type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
              <span>Ninakubali <a href="/terms" target="_blank">Masharti ya Matumizi</a> na <a href="/privacy" target="_blank">Sera ya Faragha</a>.</span>
            </label>
          )}
          {error && <div className="booking-modal-error">{error}</div>}
          <button className="place-bet-btn sports-login-submit" type="submit" disabled={busy}>
            {busy ? (mode === "login" ? "Inaingia..." : "Inafungua akaunti...") : (mode === "login" ? "Ingia kwenye Akaunti" : "Fungua Akaunti")}
          </button>
          <p className="sports-login-switch">
            {mode === "login"
              ? <>Huna akaunti? <button type="button" onClick={() => onModeChange("register")}>Jiunge sasa</button></>
              : <>Tayari una akaunti? <button type="button" onClick={() => onModeChange("login")}>Ingia hapa</button></>}
          </p>
        </form>
      </section>
    </div>
  );
}
