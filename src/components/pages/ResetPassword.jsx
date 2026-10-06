"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

// Il token di reset vale un'ora e basta a cambiare la password: appena letto lo togliamo
// dall'indirizzo (cronologia, schede condivise, strumenti di statistica) e lo teniamo solo per
// questa scheda, così ricaricare la pagina non rompe il link.
const CHIAVE_TOKEN = "evalis-reset-token";

function leggiTokenSalvato() {
  try {
    return window.sessionStorage.getItem(CHIAVE_TOKEN);
  } catch {
    return null;
  }
}

function salvaToken(t) {
  try {
    if (t) window.sessionStorage.setItem(CHIAVE_TOKEN, t);
    else window.sessionStorage.removeItem(CHIAVE_TOKEN);
  } catch {
    /* archiviazione non disponibile: il token resta solo in memoria */
  }
}

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetToken, setResetToken] = useState(() => searchParams.get("token"));
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const dallIndirizzo = searchParams.get("token");
    if (dallIndirizzo) {
      salvaToken(dallIndirizzo);
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setResetToken(leggiTokenSalvato());
    }
    setPronto(true);
    // solo al primo caricamento: dopo, l'indirizzo è già stato ripulito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword,
      token: resetToken,
    });
    setLoading(false);
    if (error) {
      setError(error.message || "Impossibile reimpostare la password");
      return;
    }
    salvaToken(null);
    router.push("/login");
  };

  if (!resetToken && !pronto) return null;

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Link non valido"
        subtitle="Questo link di reimpostazione è mancante o non valido"
        footer={
          <Link href="/recupera-password" className="text-primary font-medium hover:underline">
            Richiedi un nuovo link
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          Il link che hai usato sembra incompleto. Richiedi una nuova email di
          reimpostazione password.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Nuova password"
      subtitle="Inserisci la tua nuova password"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nuova password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Conferma password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reimpostazione...
            </>
          ) : (
            "Reimposta password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
