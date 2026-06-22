import { motion, useReducedMotion } from "framer-motion";

export default function ScrollReveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.5, delay, ease: "easeOut" }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}