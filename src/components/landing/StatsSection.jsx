import React, { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

const stats = [
  { value: 15, suffix: "+", label: "Corsi" },
  { value: 3, suffix: "", label: "Aree" },
  { value: 100, suffix: "%", label: "Verificabile" },
];

function AnimatedNumber({ value, suffix, duration = 1.2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, value, duration]);

  return <span ref={ref}>{display}{suffix}</span>;
}

export default function StatsSection() {
  return (
    <section className="w-full bg-near-black py-16 md:py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row items-center justify-center">
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && (
                <div className="hidden md:block w-px h-16 bg-[#E8E0D5]/20" />
              )}
              <div className="flex flex-col items-center px-8 md:px-12">
                <span className="font-heading text-[56px] md:text-[64px] text-primary leading-none">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </span>
                <span className="mt-2 text-[13px] text-[#766E66]">
                  {stat.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}