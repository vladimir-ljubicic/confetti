"use client";

import { useEffect, useRef } from "react";
import {
  MARK_CANONICAL_SIZE,
  MARK_FLECKS,
  MARK_SPARKS,
  markSparkOrigin,
} from "@/lib/brand-mark";

type Variant = "static" | "animated" | "desaturated";

export function ConfettiMark({
  size = 14,
  variant = "static",
}: {
  size?: number;
  variant?: Variant;
}) {
  const animated = variant === "animated";
  const mark = useRef<HTMLSpanElement>(null);
  const px = (value: number) => Math.round((value * size) / MARK_CANONICAL_SIZE);

  // The entrance runs on the app load's clock rather than on this mark's mount:
  // its delays are pulled back by however much of it has already gone, so a
  // mark that comes up mid-entrance — the stand-in header handing over to the
  // loaded one — carries on where the last left off, and one that comes up
  // later carries on with the sway alone. Set here rather than rendered
  // because the server has no clock the browser's animations share.
  useEffect(() => {
    const node = mark.current;
    if (!animated || !node) return;
    node.style.setProperty("--entrance-shift", `${performance.now() / 1000}s`);
    node.classList.add("confetti-mark-animated");
  }, [animated]);

  return (
    <span ref={mark} aria-hidden className="relative block" style={{ width: size, height: size }}>
      {animated &&
        MARK_SPARKS.map((spark, i) => {
          const origin = markSparkOrigin(spark);
          return (
            <span
              key={`spark-${i}`}
              className={`confetti-spark absolute rounded-[1px] ${spark.color}`}
              style={
                {
                  left: px(origin.left),
                  top: px(origin.top),
                  width: px(spark.width),
                  height: px(spark.height),
                  "--bx": `${px(spark.bx)}px`,
                  "--by": `${px(spark.by)}px`,
                  "--burst-delay": `${spark.delay}s`,
                } as React.CSSProperties
              }
            />
          );
        })}
      {MARK_FLECKS.map((fleck, i) => (
        <span
          key={i}
          className={`confetti-fleck absolute rounded-[1px] ${
            variant === "desaturated" ? fleck.desaturated : fleck.color
          }`}
          style={
            {
              left: px(fleck.left),
              top: px(fleck.top),
              width: px(fleck.width),
              height: px(fleck.height),
              // Overridden while the animated variant's animations run; under
              // prefers-reduced-motion those are disabled and this settled
              // rotation shows instead.
              transform: `rotate(${fleck.rotation}deg)`,
              "--pop-delay": `${fleck.popDelay}s`,
              "--drift-duration": `${fleck.driftDuration}s`,
              "--drift-delay": `${fleck.driftDelay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
