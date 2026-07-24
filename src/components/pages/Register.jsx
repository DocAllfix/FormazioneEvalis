"use client";
import React, { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, User, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false); // signup ok → mostra "controlla la tua email"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setLoading(true);
    // callbackURL: dove better-auth reindirizza DOPO il click sul link di verifica.
    // /dashboard → il guard onboarding lo porta al bivio (/onboarding) al primo accesso.
    const { error } = await signUp.email({ name, email, password, callbackURL: "/dashboard" });
    setLoading(false);
    if (error) {
      setError(error.message || "Registrazione non riuscita");
      return;
    }
    // Con la verifica email attiva il signup NON crea sessione: non mandare l'utente al
    // dashboard (rimbalzerebbe al login "bentornato" senza spiegazioni). Mostra la conferma.
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        icon={Mail}
        title="Controlla la tua email"
        subtitle="Ti abbiamo inviato un link di conferma"
        footer={
          <>
            Hai già confermato?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Accedi
            </Link>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Abbiamo inviato un&apos;email di conferma a <strong className="text-near-black">{email}</strong>.
            Apri il link contenuto per attivare l&apos;account e accedere.
          </p>
          <p>Non la trovi? Controlla nella cartella spam.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Crea il tuo account"
      subtitle="Registrati per iniziare"
      footer={
        <>
          Hai già un account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Accedi
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome e cognome</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Mario Rossi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              Creazione account...
            </>
          ) : (
            "Crea account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
