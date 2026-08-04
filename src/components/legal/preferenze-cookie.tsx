"use client";

// Il link che riapre il banner. Senza, la scelta non sarebbe revocabile — ed e' uno dei
// requisiti espliciti: il consenso dev'essere ritirabile con la stessa facilita' con cui e'
// stato dato, in qualsiasi momento.

export function PreferenzeCookie({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("evalis:riapri-consenso"))}
      className={className}
    >
      Preferenze cookie
    </button>
  );
}
