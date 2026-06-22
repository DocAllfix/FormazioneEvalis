import React from "react";

const standards = [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "ISO 27001",
  "ISO 22000",
  "ISO 50001",
];

export default function ISOStrip() {
  return (
    <div className="w-full bg-near-black border-y border-[#3D2E1E]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-5">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <span className="text-[11px] font-medium text-primary uppercase tracking-[0.16em] whitespace-nowrap">
            Standard di riferimento
          </span>
          <div className="hidden md:block w-px h-4 bg-[#3D2E1E]" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-8">
            {standards.map((s) => (
              <span
                key={s}
                className="text-primary font-heading text-sm tracking-wide"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}