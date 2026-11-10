"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="back-to-top fixed bottom-6 right-6 w-11 h-11 rounded-full bg-[var(--brand-800)] text-white shadow-[var(--sh-shell)] flex items-center justify-center z-[var(--z-toast)] hover:bg-[var(--brand-600)] transition-all duration-200"
    >
      <ArrowUp size={20} aria-hidden />
    </button>
  );
}

