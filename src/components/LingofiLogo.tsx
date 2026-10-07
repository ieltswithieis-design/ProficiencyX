import React, { useId } from "react";
import { motion } from "motion/react";

interface LingofiLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "white";
  className?: string;
}

export const LingofiLogo: React.FC<LingofiLogoProps> = ({
  size = "md",
  variant = "full",
  className = ""
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const coreGradId = `lfCoreGrad_${uid}`;
  const cyanPhotonId = `lfCyanPhoton_${uid}`;
  const cobaltBeamId = `lfCobaltBeam_${uid}`;

  const iconDimensions = {
    sm: "h-9 w-9 min-w-[36px]",
    md: "h-10 w-10 min-w-[40px] sm:h-11 sm:w-11 sm:min-w-[44px]",
    lg: "h-14 w-14 min-w-[56px]",
    xl: "h-20 w-20 min-w-[80px]"
  }[size];

  const titleSize = {
    sm: "text-lg tracking-wider",
    md: "text-xl sm:text-2xl tracking-wider",
    lg: "text-2xl sm:text-3xl tracking-wider",
    xl: "text-3xl sm:text-4xl tracking-wider"
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      {/* QUANTUM ORBITAL VECTOR CREST */}
      <motion.div
        whileHover={{ scale: 1.07 }}
        transition={{ duration: 0.2 }}
        className={`relative ${iconDimensions} shrink-0 rounded-xl border border-cyan-400/40 bg-[#050b16] shadow-[0_0_20px_rgba(0,240,255,0.22)] overflow-hidden cursor-pointer flex items-center justify-center`}
        title="LingoFi • Standardized Examination Interface"
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full block"
        >
          <defs>
            <linearGradient id={coreGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#071329" />
              <stop offset="100%" stopColor="#0c2247" />
            </linearGradient>

            <linearGradient id={cyanPhotonId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            <linearGradient id={cobaltBeamId} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#00f0ff" />
            </linearGradient>
          </defs>

          {/* Base Obsidian Chamber */}
          <rect width="120" height="120" rx="22" fill={`url(#${coreGradId})`} />

          {/* Outer Octagonal Technical Frame */}
          <polygon
            points="32,8 88,8 112,32 112,88 88,112 32,112 8,88 8,32"
            stroke={`url(#${cyanPhotonId})`}
            strokeWidth="2"
            strokeOpacity="0.65"
            fill="none"
          />

          {/* Inner Dashed Orbital Ring */}
          <circle
            cx="60"
            cy="60"
            r="42"
            stroke="#00f0ff"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            strokeOpacity="0.45"
          />

          {/* Precision Crosshair Ticks */}
          <line x1="60" y1="10" x2="60" y2="18" stroke="#00f0ff" strokeWidth="2" />
          <line x1="60" y1="102" x2="60" y2="110" stroke="#00f0ff" strokeWidth="2" />
          <line x1="10" y1="60" x2="18" y2="60" stroke="#00f0ff" strokeWidth="2" />
          <line x1="102" y1="60" x2="110" y2="60" stroke="#00f0ff" strokeWidth="2" />

          {/* Futuristic Geometric "L" Monogram */}
          <path
            d="M34 32 H46 V76 H68 L64 88 H34 Z"
            fill="#f8fafc"
          />

          {/* Photonic Laser Cyan "F" Monogram */}
          <path
            d="M54 32 H88 L84 43 H66 V54 H82 L79 64 H66 V88 H54 Z"
            fill={`url(#${cyanPhotonId})`}
          />

          {/* Top Telemetry Node */}
          <circle cx="84" cy="24" r="3" fill={`url(#${cobaltBeamId})`} />
        </svg>
      </motion.div>

      {/* Single Clean Brand Wordmark */}
      {variant !== "icon" && (
        <span
          className={`font-display font-bold uppercase ${titleSize} whitespace-nowrap bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent`}
        >
          LingoFi
        </span>
      )}
    </div>
  );
};
