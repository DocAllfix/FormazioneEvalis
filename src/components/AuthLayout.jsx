import React from "react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/monogram.png"
              alt="Evalis Academy"
              className="h-16 w-16 object-contain"
            />
            <span className="mt-3 h-px w-24 bg-[#A9791F]/40" />
            <span className="mt-2.5 text-[0.7rem] font-medium tracking-[0.4em] text-[#9A6F1E]">
              ACADEMY
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
