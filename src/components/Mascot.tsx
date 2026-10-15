import { useId } from "react";
import type { Mood } from "@/lib/mascot";

export type { Mood };

const INK = "#2b1a0a";

const MOUTH: Record<Mood, string> = {
  wave: "M 50 108 Q 60 120 70 108",
  happy: "M 50 108 Q 60 119 70 108",
  cheer: "M 47 106 Q 60 128 73 106 Z",
  party: "M 47 106 Q 60 128 73 106 Z",
  think: "M 53 113 L 68 111",
  hint: "M 51 110 Q 60 117 69 109",
  oops: "M 51 117 Q 60 107 69 117",
  cool: "M 49 108 Q 60 121 71 108",
  sleepy: "M 54 113 Q 60 117 66 113",
};

/** Brazo: contorno oscuro + relleno claro, con mano redonda. */
function Arm({ d, hand, className }: { d: string; hand: [number, number]; className?: string }) {
  return (
    <g className={className}>
      <path d={d} stroke="#8f5a1c" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d={d} stroke="#e2ae62" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx={hand[0]} cy={hand[1]} r="5.2" fill="#e2ae62" stroke="#8f5a1c" strokeWidth="2" />
    </g>
  );
}

function Arms({ mood }: { mood: Mood }) {
  switch (mood) {
    case "wave":
      return (
        <>
          <Arm d="M 24 104 Q 12 112 10 124" hand={[10, 124]} />
          <Arm d="M 98 100 Q 112 88 112 66" hand={[112, 66]} className="wave-arm" />
        </>
      );
    case "cheer":
    case "party":
      return (
        <>
          <Arm d="M 24 100 Q 8 88 8 64" hand={[8, 64]} />
          <Arm d="M 98 100 Q 114 88 114 64" hand={[114, 64]} />
        </>
      );
    case "think":
      return (
        <>
          <Arm d="M 24 106 Q 14 116 14 128" hand={[14, 128]} />
          <Arm d="M 98 108 Q 100 120 84 118" hand={[78, 117]} />
        </>
      );
    case "hint":
      return (
        <>
          <Arm d="M 24 106 Q 14 116 14 128" hand={[14, 128]} />
          <Arm d="M 98 100 Q 114 92 110 72" hand={[110, 72]} />
          <path d="M 110 66 L 110 56" stroke="#8f5a1c" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "oops":
      return (
        <>
          <Arm d="M 22 100 Q 10 90 18 76" hand={[18, 76]} />
          <Arm d="M 100 100 Q 112 90 104 76" hand={[104, 76]} />
        </>
      );
    default:
      return (
        <>
          <Arm d="M 24 104 Q 12 112 10 124" hand={[10, 124]} />
          <Arm d="M 98 104 Q 110 112 112 124" hand={[112, 124]} />
        </>
      );
  }
}

/** Sombrero vueltiao: copa y ala crema con bandas y rombos negros. */
function Hat() {
  return (
    <g transform="rotate(-5 60 56)">
      {/* ala */}
      <ellipse cx="60" cy="57" rx="50" ry="12.5" fill="#f3e6bf" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="60" cy="57" rx="43" ry="9.8" fill="none" stroke={INK} strokeWidth="3.2" strokeDasharray="7 4" />
      <ellipse cx="60" cy="57" rx="34" ry="7" fill="none" stroke={INK} strokeWidth="1.6" />
      <ellipse cx="60" cy="57" rx="26" ry="4.8" fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="3 3" />
      {/* copa */}
      <path d="M 40 56 L 42 31 Q 60 20 78 31 L 80 56 Q 60 63 40 56 Z" fill="#f3e6bf" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M 41.4 38 Q 60 44 78.6 38 L 78.2 43 Q 60 49 41.8 43 Z" fill={INK} />
      <path d="M 40.8 49 Q 60 55 79.2 49 L 79.6 54 Q 60 60.5 40.4 54 Z" fill={INK} />
      {[47, 53.5, 60, 66.5, 73].map((cx) => (
        <path key={cx} d={`M ${cx} 44.2 l 3 3 l -3 3 l -3 -3 Z`} fill={INK} />
      ))}
      <path d="M 46 33 Q 60 27 74 33" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

export default function Mascot({ mood = "happy", size = 96, label }: { mood?: Mood; size?: number; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const closed = mood === "sleepy";
  const happyEyes = mood === "cheer" || mood === "party";
  const lookUp = mood === "think" || mood === "hint";
  return (
    <svg
      width={size}
      height={Math.round((size * 140) / 120)}
      viewBox="0 0 120 140"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={mood === "oops" ? "anim-wobble" : mood === "party" || mood === "cheer" ? "anim-pop" : "anim-bob"}
      focusable="false"
    >
      <defs>
        <radialGradient id={`b${uid}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#f6d594" />
          <stop offset="55%" stopColor="#e2ae62" />
          <stop offset="100%" stopColor="#b9792a" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="136" rx="30" ry="4" fill={INK} opacity="0.14" />
      {/* piernas y zapatos */}
      <path d="M 46 128 L 46 136" stroke="#8f5a1c" strokeWidth="9" strokeLinecap="round" />
      <path d="M 74 128 L 74 136" stroke="#8f5a1c" strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="43" cy="137" rx="9" ry="4.2" fill="#c0392b" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="77" cy="137" rx="9" ry="4.2" fill="#c0392b" stroke={INK} strokeWidth="1.8" />
      <Arms mood={mood} />
      {/* cuerpo de papa */}
      <path d="M 60 54 C 92 52 108 78 104 104 C 100 128 80 134 60 134 C 40 134 20 128 16 104 C 12 78 28 56 60 54 Z" fill={`url(#b${uid})`} stroke="#8f5a1c" strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="32" cy="116" rx="3.4" ry="2.4" fill="#a96a22" opacity="0.55" />
      <ellipse cx="90" cy="120" rx="3" ry="2.2" fill="#a96a22" opacity="0.55" />
      <ellipse cx="28" cy="88" rx="2.4" ry="1.8" fill="#a96a22" opacity="0.5" />
      <ellipse cx="94" cy="86" rx="2.2" ry="1.7" fill="#a96a22" opacity="0.5" />
      {/* cara */}
      {closed ? (
        <>
          <path d="M 40 92 Q 47 97 54 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 66 92 Q 73 97 80 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : happyEyes ? (
        <>
          <path d="M 40 94 Q 47 85 54 94" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M 66 94 Q 73 85 80 94" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="47" cy="92" r="8.2" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <circle cx="73" cy="92" r="8.2" fill="#fff" stroke={INK} strokeWidth="1.6" />
          <circle cx={lookUp ? 49 : 48} cy={lookUp ? 89 : 93} r="3.6" fill={INK} />
          <circle cx={lookUp ? 75 : 74} cy={lookUp ? 89 : 93} r="3.6" fill={INK} />
          <circle cx={lookUp ? 50.2 : 49.2} cy={lookUp ? 87.8 : 91.8} r="1.1" fill="#fff" />
          <circle cx={lookUp ? 76.2 : 75.2} cy={lookUp ? 87.8 : 91.8} r="1.1" fill="#fff" />
        </>
      )}
      {mood === "cool" && (
        <g>
          <rect x="36" y="85" width="22" height="14" rx="6" fill={INK} />
          <rect x="62" y="85" width="22" height="14" rx="6" fill={INK} />
          <path d="M 58 90 L 62 90" stroke={INK} strokeWidth="2.5" />
          <path d="M 40 88 L 46 88" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
      {(mood === "oops" || mood === "think") && <path d={mood === "oops" ? "M 38 80 L 53 84 M 82 80 L 67 84" : "M 38 82 L 53 80 M 67 80 L 82 83"} stroke={INK} strokeWidth="2.6" strokeLinecap="round" />}
      <circle cx="35" cy="106" r="5" fill="#f08a6b" opacity="0.7" />
      <circle cx="85" cy="106" r="5" fill="#f08a6b" opacity="0.7" />
      <path d={MOUTH[mood]} stroke={INK} strokeWidth="3" fill={mood === "cheer" || mood === "party" ? "#8a2f1c" : "none"} strokeLinecap="round" strokeLinejoin="round" />
      {mood === "oops" && <path d="M 100 66 q 4 7 0 10 q -4 -3 0 -10 Z" fill="#7dd3fc" stroke="#0369a1" strokeWidth="1" />}
      {mood === "sleepy" && (
        <text x="96" y="62" fontSize="14" fontWeight="800" fill={INK} opacity="0.6">
          z
        </text>
      )}
      {mood === "party" && (
        <>
          <circle cx="14" cy="40" r="3" fill="#ef4444" />
          <circle cx="108" cy="34" r="3" fill="#3b82f6" />
          <circle cx="20" cy="22" r="2.4" fill="#22c55e" />
          <circle cx="100" cy="16" r="2.4" fill="#f59e0b" />
        </>
      )}
      {mood === "hint" && <circle cx="110" cy="44" r="6" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />}
      <Hat />
    </svg>
  );
}
