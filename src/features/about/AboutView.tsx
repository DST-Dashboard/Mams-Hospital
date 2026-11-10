"use client";

import { PageFrame } from "@/features/shell/PageFrame";
import { Card } from "@/components/ui/primitives";
import { SystemDiagram } from "./SystemDiagram";
import { Methodology } from "./Methodology";
import { Glossary } from "./Glossary";
import { ICON } from "@/components/ui/icons";

export function AboutView() {
  return (
    <PageFrame tab="admin">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        {/* Header Block */}
        <div style={{ textAlign: "center", marginBottom: "var(--sp-8)" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "var(--data-600)",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "var(--sp-2)",
            }}
          >
            MAMS HOSPITAL · OVERHEAD TANK MANAGEMENT SYSTEM
          </div>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 900,
              fontFamily: "var(--f-display)",
              color: "var(--brand-800)",
              margin: 0,
            }}
          >
            Real-Time Rooftop Water Monitoring
          </h1>
          <p
            style={{
              maxWidth: "760px",
              margin: "var(--sp-3) auto 0",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "var(--tx-muted)",
            }}
          >
            Continuous, sub-second visibility into rooftop water reserves across clinical wings, ensuring hospital taps never run dry during critical operations.
          </p>
        </div>

        {/* Section 1: The Analogy */}
        <div style={{ marginBottom: "var(--sp-8)" }}>
          <Card
            eyebrow={{ icon: ICON.info, text: "WHAT THE SYSTEM DOES" }}
            title="The Five Glasses and a Ruler"
          >
            <div style={{ fontSize: "15px", lineHeight: 1.8, color: "var(--tx-body)" }}>
              <p>
                Imagine five tall glasses of water standing on a high rooftop, hidden from view. Instead of climbing up a rickety ladder with a stick three times a day to check how full each glass is, we place a tiny digital ruler pointing downwards from the top rim of every glass.
              </p>
              <p>
                Every five minutes, the ruler bounces a gentle sound wave off the water surface, calculates how far down the water has dropped, and whispers that number through the air across the hospital to our screens.
              </p>
              <p style={{ margin: 0 }}>
                If someone turns on a tap in the emergency ward or a pump begins filling a tank, the digital ruler notices within seconds. You always know whether a tank is brimming, draining, or approaching empty—long before any surgical ward feels the loss.
              </p>
            </div>
          </Card>
        </div>

        {/* Section 2: How It Works & System Diagram */}
        <div id="how-it-works" style={{ marginBottom: "var(--sp-8)" }}>
          <Card
            eyebrow={{ icon: ICON.diagram, text: "HOW IT WORKS" }}
            title="Physical to Cloud Architecture"
            footnote="Ultrasonic bounce signals are translated to LoRaWAN packets and delivered to the hospital dashboard in 1 to 2 seconds."
          >
            <SystemDiagram />
          </Card>
        </div>

        {/* Section 3: How Distance Becomes Level (Gradient Card) */}
        <div style={{ marginBottom: "var(--sp-8)" }}>
          <div
            style={{
              background: "var(--g-ocean)",
              borderRadius: "var(--r-2xl)",
              padding: "36px 40px",
              color: "#ffffff",
              boxShadow: "var(--sh-shell)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--gold-500)",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "var(--sp-2)",
              }}
            >
              MATHEMATICAL CONVERSION
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", margin: "0 0 var(--sp-4) 0" }}>
              How Sensor Distance Becomes Water Level
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-6)", alignItems: "center" }}>
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#e2edf7" }}>
                <p>
                  The sensor on the tank lid measures <strong>distance downwards to the water</strong>. When the tank is full, the water is close to the sensor (smaller distance). When the tank drains, the distance increases:
                </p>
                <div style={{ background: "rgba(255, 255, 255, 0.1)", borderRadius: "var(--r-md)", padding: "var(--sp-3)", fontFamily: "var(--f-mono)", fontSize: "13px", margin: "var(--sp-3) 0" }}>
                  <div>Level (cm) = Tank Height (H) − Distance</div>
                  <div>Fill % = (Level / Height) × 100%</div>
                  <div>Volume (L) = π × R² × Level / 1,000</div>
                </div>
                <strong style={{ color: "var(--gold-500)" }}>
                  Core Rule: Larger sensor distance strictly means less water.
                </strong>
              </div>

              {/* Worked Example */}
              <div style={{ background: "rgba(0, 31, 63, 0.4)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "var(--r-xl)", padding: "var(--sp-5)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: "var(--sp-2)" }}>
                  Worked Calibration Example
                </div>
                <div className="ops-dl-grid" style={{ color: "#ffffff", fontSize: "13px" }}>
                  <div className="ops-dl-dt" style={{ color: "#becfd6" }}>Tank Geometry</div>
                  <div className="ops-dl-dd">Cylinder: H 300 cm, R 100 cm</div>

                  <div className="ops-dl-dt" style={{ color: "#becfd6" }}>Measured Distance</div>
                  <div className="ops-dl-dd">202 cm down from lid</div>

                  <div className="ops-dl-dt" style={{ color: "#becfd6" }}>Calculated Level</div>
                  <div className="ops-dl-dd">300 − 202 = <strong>98 cm</strong></div>

                  <div className="ops-dl-dt" style={{ color: "#becfd6" }}>Calculated Volume</div>
                  <div className="ops-dl-dd">π × 100² × 98 / 1000 = <strong>3,079 Litres</strong></div>

                  <div className="ops-dl-dt" style={{ color: "#becfd6" }}>Percent Full</div>
                  <div className="ops-dl-dd">98 / 300 = <strong>32.7 %</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Methodology */}
        <div style={{ marginBottom: "var(--sp-8)" }}>
          <Methodology />
        </div>

        {/* Section 5: Technical Glossary */}
        <div style={{ marginBottom: "var(--sp-8)" }}>
          <Glossary />
        </div>
      </div>
    </PageFrame>
  );
}

