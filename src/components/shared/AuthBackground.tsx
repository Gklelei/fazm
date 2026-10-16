import Image from "next/image";

/**
 * Background for the sign-in, reset and change-password pages: a top-down
 * pitch in Fazam gold on navy, drawn as SVG (sharp on any screen, a few KB).
 * Wide screens see it across, phones see it standing upright.
 * Set AUTH_PHOTO to a file in /public (e.g. "/auth-photo.webp", ~1600px wide)
 * to show a real Fazam photo underneath, toned navy, with the pitch lines over it.
 */
const AUTH_PHOTO: string | null = null;

const LINE = "var(--brand-gold)";

/** Stripes, centre glow and markings of a 105 x 68 m pitch, drawn 1050 x 680. */
function Pitch({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="55%">
          <stop offset="0" stopColor={LINE} stopOpacity="0.16" />
          <stop offset="1" stopColor={LINE} stopOpacity="0" />
        </radialGradient>
      </defs>
      {!AUTH_PHOTO &&
        Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={i * 75} y="0" width="75" height="680" fill="white" opacity={i % 2 ? 0.025 : 0} />
        ))}
      <rect width="1050" height="680" fill={`url(#${id}-glow)`} />
      <g fill="none" stroke={LINE} strokeOpacity="0.28" strokeWidth="2.5">
        <rect x="25" y="25" width="1000" height="630" />
        <line x1="525" y1="25" x2="525" y2="655" />
        <circle cx="525" cy="340" r="91.5" />
        {[25, 1025].map((x) => {
          const d = x === 25 ? 1 : -1; // which end: boxes and arcs face the centre
          const sweep = d === 1 ? 1 : 0;
          return (
            <g key={x}>
              <rect x={d === 1 ? x : x - 165} y="138.5" width="165" height="403" />
              <rect x={d === 1 ? x : x - 55} y="248.5" width="55" height="183" />
              <path d={`M ${x + d * 165} 267 A 91.5 91.5 0 0 ${sweep} ${x + d * 165} 413`} />
              <path d={`M ${x} 303 l ${-d * 18} 0 l 0 74 l ${d * 18} 0`} strokeOpacity="0.4" />
              <path d={`M ${x} 35 A 10 10 0 0 ${1 - sweep} ${x + d * 10} 25`} />
              <path d={`M ${x + d * 10} 655 A 10 10 0 0 ${1 - sweep} ${x} 645`} />
            </g>
          );
        })}
      </g>
      <g fill={LINE} fillOpacity="0.4">
        <circle cx="525" cy="340" r="4" />
        <circle cx="135" cy="340" r="3.5" />
        <circle cx="915" cy="340" r="3.5" />
      </g>
    </>
  );
}

/** Darker top and bottom, so the card stands out. */
function Fade({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="black" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="black" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${id}-fade)`} />
    </>
  );
}

export function AuthBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-brand-navy">
      {AUTH_PHOTO && (
        <>
          <Image src={AUTH_PHOTO} alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/80" />
        </>
      )}
      <svg viewBox="0 0 1050 680" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full portrait:hidden">
        <Pitch id="auth-l" />
        <Fade id="auth-l" w={1050} h={680} />
      </svg>
      <svg viewBox="0 0 680 1050" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full landscape:hidden">
        <g transform="translate(680 0) rotate(90)">
          <Pitch id="auth-p" />
        </g>
        <Fade id="auth-p" w={680} h={1050} />
      </svg>
    </div>
  );
}
