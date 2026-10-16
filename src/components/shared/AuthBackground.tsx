import Image from "next/image";

/**
 * Faint pitch markings for the blue brand panel on the auth pages. Lines are
 * drawn in currentColor, so the parent sets their colour and strength.
 * `vertical` stands the pitch upright for tall panels.
 * Set AUTH_PHOTO to a file in /public (e.g. "/auth-photo.webp", ~1600px wide)
 * to show a real Fazam photo underneath, tinted in the brand blue.
 */
const AUTH_PHOTO: string | null = null;

/** Markings of a 105 x 68 m pitch, drawn 1050 x 680. */
function Markings() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="25" y="25" width="1000" height="630" />
      <line x1="525" y1="25" x2="525" y2="655" />
      <circle cx="525" cy="340" r="91.5" />
      {[25, 1025].map((x) => {
        const d = x === 25 ? 1 : -1; // which end: boxes and arcs face the centre
        return (
          <g key={x}>
            <rect x={d === 1 ? x : x - 165} y="138.5" width="165" height="403" />
            <rect x={d === 1 ? x : x - 55} y="248.5" width="55" height="183" />
            <path d={`M ${x + d * 165} 267 A 91.5 91.5 0 0 ${d === 1 ? 1 : 0} ${x + d * 165} 413`} />
          </g>
        );
      })}
    </g>
  );
}

export function AuthBackground({ vertical = false }: { vertical?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {AUTH_PHOTO && (
        <>
          <Image src={AUTH_PHOTO} alt="" fill priority sizes="50vw" className="object-cover object-center" />
          <div className="absolute inset-0 bg-[#405AA7]/85" />
        </>
      )}
      <svg
        viewBox={vertical ? "0 0 680 1050" : "0 0 1050 680"}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        style={{ color: "rgb(255 255 255 / 0.08)" }}
      >
        {vertical ? (
          <g transform="translate(680 0) rotate(90)">
            <Markings />
          </g>
        ) : (
          <Markings />
        )}
      </svg>
    </div>
  );
}
