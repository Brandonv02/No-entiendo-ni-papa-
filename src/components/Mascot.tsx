export type Mood = "happy" | "party" | "think" | "oops" | "sleepy";

const MOUTH: Record<Mood, string> = {
  happy: "M 40 64 Q 50 74 60 64",
  party: "M 38 62 Q 50 80 62 62 Z",
  think: "M 42 68 L 58 66",
  oops: "M 41 70 Q 50 62 59 70",
  sleepy: "M 44 68 Q 50 71 56 68",
};

/** Papito: una papa con ganas de aprender inglés. Dibujo original. */
export default function Mascot({ mood = "happy", size = 96, label }: { mood?: Mood; size?: number; label?: string }) {
  const eyesClosed = mood === "sleepy";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={mood === "oops" ? "anim-wobble" : mood === "party" ? "anim-pop" : undefined}
    >
      <ellipse cx="50" cy="94" rx="26" ry="4" fill="#2b1a0a" opacity="0.12" />
      <ellipse cx="57" cy="14" rx="9" ry="4.5" transform="rotate(-40 57 14)" fill="#4d9a3a" />
      <ellipse cx="50" cy="56" rx="33" ry="36" transform="rotate(-7 50 56)" fill="#e6b566" stroke="#b9792a" strokeWidth="3" />
      <circle cx="30" cy="72" r="3" fill="#c88a3d" />
      <circle cx="68" cy="75" r="2.5" fill="#c88a3d" />
      <circle cx="38" cy="30" r="2.2" fill="#c88a3d" />
      <circle cx="72" cy="38" r="2" fill="#c88a3d" />
      {eyesClosed ? (
        <>
          <path d="M 33 50 Q 40 55 47 50" stroke="#2b1a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 53 50 Q 60 55 67 50" stroke="#2b1a0a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="40" cy="50" r="7" fill="#fff" />
          <circle cx="60" cy="50" r="7" fill="#fff" />
          <circle cx={mood === "think" ? 42 : 41.5} cy={mood === "think" ? 47.5 : 51} r="3.2" fill="#2b1a0a" />
          <circle cx={mood === "think" ? 62 : 61.5} cy={mood === "think" ? 47.5 : 51} r="3.2" fill="#2b1a0a" />
        </>
      )}
      {mood === "oops" && <path d="M 33 40 L 46 43 M 67 40 L 54 43" stroke="#2b1a0a" strokeWidth="2.5" strokeLinecap="round" />}
      <circle cx="29" cy="62" r="4" fill="#f08a6b" opacity="0.8" />
      <circle cx="71" cy="62" r="4" fill="#f08a6b" opacity="0.8" />
      <path d={MOUTH[mood]} stroke="#2b1a0a" strokeWidth="3" fill={mood === "party" ? "#8a2f1c" : "none"} strokeLinecap="round" strokeLinejoin="round" />
      {mood === "party" && (
        <>
          <path d="M 36 22 L 50 4 L 64 22 Z" fill="#ef4444" />
          <circle cx="50" cy="4" r="3" fill="#fde68a" />
        </>
      )}
    </svg>
  );
}
