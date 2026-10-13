import Image from "next/image";

/**
 * Shown once while the app loads its settings. Club colours, the crest
 * inside a centre circle that draws itself, and a gold sweep beneath.
 */
const AppLoader = () => (
  <div
    role="status"
    aria-label="Loading Fazam"
    className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-brand-navy text-white"
  >
    {/* Halfway line across the screen, the crest sits on the centre spot */}
    <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />

    <div className="animate-loader-rise relative flex flex-col items-center">
      <div className="relative grid size-44 place-items-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 size-full text-brand-gold" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.8" />
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            pathLength={1}
            className="animate-pitch-draw"
          />
        </svg>
        <Image
          src="/Fazam Logo-BG.png"
          alt=""
          width={88}
          height={88}
          priority
          className="size-22 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        />
      </div>

      <p className="font-display mt-6 text-3xl font-bold tracking-[0.3em] uppercase">Fazam</p>
      <p className="mt-1 text-xs tracking-[0.35em] text-white/50 uppercase">Football Academy</p>

      <div className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="animate-loader-sweep h-full w-2/5 rounded-full bg-brand-gold" />
      </div>
    </div>
  </div>
);

export default AppLoader;
