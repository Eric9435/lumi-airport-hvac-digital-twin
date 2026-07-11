"use client";

import { motion } from "framer-motion";
import { Fan } from "lucide-react";

interface AnimatedFanProps {
  running: boolean;
  speedPercent: number;
  size?: number;
}

export function AnimatedFan({
  running,
  speedPercent,
  size = 68,
}: AnimatedFanProps) {
  const normalizedSpeed = Math.min(100, Math.max(0, speedPercent));

  const rotationDuration = running
    ? Math.max(0.25, 2.4 - normalizedSpeed * 0.019)
    : 0;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70">
      <motion.div
        animate={
          running
            ? {
                rotate: 360,
              }
            : {
                rotate: 0,
              }
        }
        transition={
          running
            ? {
                duration: rotationDuration,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              }
            : {
                duration: 0.25,
              }
        }
      >
        <Fan
          size={size}
          className={
            running
              ? "text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.8)]"
              : "text-slate-600"
          }
        />
      </motion.div>

      <span className="absolute -bottom-6 text-xs font-medium text-slate-400">
        {normalizedSpeed}%
      </span>
    </div>
  );
}
