// Trattamento visivo per categoria (famiglia calda Ambra). Usato come fallback quando
// il corso non ha un'immagine, e per i badge/accent. Niente colori fuori brand.

import { Award, BookOpen, HardHat, Landmark, Wrench, type LucideIcon } from "lucide-react";

export type CategoryVisual = { label: string; gradient: string; Icon: LucideIcon };

const MAP: Record<string, CategoryVisual> = {
  auditor: { label: "Auditor ISO", gradient: "from-[#EA5A0C] to-[#B23E08]", Icon: Award },
  mestieri: { label: "Mestieri e professioni", gradient: "from-[#C2410C] to-[#7C2D12]", Icon: Wrench },
  bancario: { label: "Settore bancario", gradient: "from-[#B45309] to-[#78350F]", Icon: Landmark },
  sicurezza: { label: "Sicurezza", gradient: "from-[#E0520C] to-[#9A3412]", Icon: HardHat },
};

const DEFAULT: CategoryVisual = { label: "Corso", gradient: "from-[#9A6B3F] to-[#5C4327]", Icon: BookOpen };

export function categoryVisual(category: string | null): CategoryVisual {
  return (category && MAP[category]) || DEFAULT;
}
