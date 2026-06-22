import React from "react";
import { motion } from "framer-motion";

export function ProgressBar({ value, showLabel = true }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F5EFE6] rounded-full overflow-hidden min-w-[40px]">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-primary rounded-full"
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-near-black tabular-nums whitespace-nowrap">{value}%</span>
      )}
    </div>
  );
}

const statusStyles = {
  "Certificato": "bg-[#F0FAE8] text-[#27500A] border-[#97C459]",
  "Pronto per l'esame": "bg-[#FAEEDA] text-[#633806] border-[#EF9F27]",
  "In corso": "bg-[#F1EFE8] text-[#444441] border-[#B4B2A9]",
  "Non iniziato": "bg-white text-[#766E66] border-[#E8E0D5]",
};

export function StatusPill({ status }) {
  const style = statusStyles[status] || statusStyles["In corso"];
  return (
    <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${style}`}>
      {status}
    </span>
  );
}

export function Avatar({ initials }) {
  return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5EFE6] text-[#5C5347] text-xs font-medium flex-shrink-0">
      {initials}
    </span>
  );
}