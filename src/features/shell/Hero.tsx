"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, Bolt, Clock, Database, Radio } from "lucide-react";
import { HERO_COPY } from "@/lib/copy";
import { useDashboard } from "@/lib/hooks";

export function Hero() {
  const { data: dashboard } = useDashboard();
  const clockMode = dashboard?.clockMode ?? "anchored";
  const isDemo = clockMode === "anchored";

  const tanks = dashboard?.tanks || [];
  const simCount = tanks.filter((t) => t.simulated).length;
  const liveCount = tanks.length > 0 ? tanks.length - simCount : 1;

  // Particle generation
  const [particles, setParticles] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number }>>([]);
  useEffect(() => {
    const list = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 5 + 6,
      delay: Math.random() * 5,
    }));
    setParticles(list);
  }, []);

  return (
    <section className="hero relative min-h-[340px] flex items-center overflow-hidden bg-[var(--brand-950)] text-white select-none">
      {/* Layer 1 & 2: Background Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 75% 30%, rgba(0, 115, 188, 0.4) 0%, rgba(0, 77, 128, 0.6) 40%, rgba(0, 31, 63, 0.95) 100%)",
        }}
      />

      {/* Layer 3: Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white opacity-20 pointer-events-none"
            style={{
              left: `${p.left}%`,
              bottom: "-10px",
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `particleRise ${p.duration}s linear infinite ${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Layer 4: Content Wrapper */}
      <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 py-10 md:py-14 flex items-center justify-between flex-wrap gap-8">
        {/* Left: Text Block */}
        <div className="max-w-[700px] reveal-up">
          <div className="inline-block bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.30)] px-3 py-1 rounded-full backdrop-blur-sm text-[12px] font-bold tracking-[1px] uppercase mb-3.5">
            {isDemo ? HERO_COPY.badgeDemo : HERO_COPY.badgeLive}
          </div>

          <h1 className="font-display font-black text-[36px] sm:text-[46px] md:text-[56px] leading-[1.1] m-0 mb-2.5 text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            {HERO_COPY.headline}
          </h1>

          <p className="font-display text-[18px] sm:text-[22px] md:text-[24px] text-[var(--gold-500)] m-0 mb-4 leading-snug">
            {HERO_COPY.subheadline}
          </p>

          <p className="font-sans text-[15px] sm:text-[17.6px] leading-[1.6] text-white/90 m-0 mb-7">
            {HERO_COPY.description}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="#workspace"
              className="btn btn-cta"
            >
              <span>{HERO_COPY.viewTanks}</span>
              <ArrowDown size={16} aria-hidden />
            </a>

            <Link
              href="/about"
              className="btn btn-glass"
            >
              <span>{HERO_COPY.howItWorks}</span>
            </Link>
          </div>
        </div>

        {/* Right: Floating Glass Card */}
        <div className="hidden lg:block w-[380px] reveal-right">
          <div className="relative bg-[rgba(255,255,255,0.05)] backdrop-blur-[15px] border border-[rgba(255,255,255,0.20)] rounded-[20px] p-7 shadow-[var(--sh-glass)] animate-[float_6s_ease-in-out_infinite]">
            <div className="space-y-4 text-white text-[16px] font-medium">
              <div className="flex items-center gap-3.5">
                <Database size={24} className="text-[var(--gold-500)] flex-shrink-0" aria-hidden />
                <span>{tanks.length || 5} rooftop tanks monitored</span>
              </div>
              <div className="flex items-center gap-3.5">
                <Radio size={24} className="text-[var(--gold-500)] flex-shrink-0" aria-hidden />
                <span>{liveCount} live node · {simCount} simulated</span>
              </div>
              <div className="flex items-center gap-3.5">
                <Clock size={24} className="text-[var(--gold-500)] flex-shrink-0" aria-hidden />
                <span>~5 min between readings</span>
              </div>
              <div className="flex items-center gap-3.5">
                <Bolt size={24} className="text-[var(--gold-500)] flex-shrink-0" aria-hidden />
                <span>1–2 s from sensor to screen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 5: Wave Divider */}
      <div className="absolute -bottom-[2px] left-0 right-0 z-[3] overflow-hidden leading-none" aria-hidden>
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="block w-[calc(100%+1.3px)] h-[60px]"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.11,130.83,121.22,200.7,112.5,242.49,107.28,283.47,81.18,321.39,56.44Z"
            fill="var(--bg-page)"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes particleRise {
          from {
            transform: translateY(0);
            opacity: 0.3;
          }
          to {
            transform: translateY(-400px);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

