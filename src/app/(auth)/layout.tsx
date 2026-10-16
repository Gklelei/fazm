import Image from "next/image";
import { AuthBackground } from "@/components/shared/AuthBackground";

/**
 * Sign-in, forgot, reset and change password share this frame: the Fazam
 * lockup (crest, gold bar, name) on the brand blue, and the form on a plain
 * panel. Wide screens put them side by side; phones stack a blue band over
 * the form. Public pages: nothing is read from the database here, and the
 * colours are the Fazam brand, not the academy theme colour.
 */
function Lockup({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-4 lg:gap-6">
      <Image
        src="/fazam-logo.webp"
        alt=""
        width={300}
        height={300}
        priority
        className={large ? "size-40 drop-shadow-xl" : "size-20 drop-shadow-lg"}
      />
      <span className={`w-1 shrink-0 rounded-full bg-[#FDD504] ${large ? "h-32" : "h-16"}`} />
      <p className={`font-bold leading-[0.92] tracking-tight uppercase ${large ? "text-5xl" : "text-2xl"}`}>
        Fazam
        <br />
        Football
        <br />
        Academy
      </p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground [--primary-foreground:white] [--primary:#405AA7] [--ring:#405AA7] dark:[--ring:#9DB1EE] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <header className="relative overflow-hidden bg-[#405AA7] text-white">
        <div className="lg:hidden">
          <AuthBackground />
        </div>
        <div className="hidden lg:block">
          <AuthBackground vertical />
        </div>

        <div className="relative flex justify-center px-6 pt-10 pb-16 lg:hidden">
          <Lockup />
        </div>

        <div className="relative hidden h-full flex-col justify-between p-14 lg:flex">
          <p className="text-sm font-semibold tracking-[0.25em] text-white/80 uppercase">Staff portal</p>
          <Lockup large />
          <p className="text-sm text-white/60">© {new Date().getFullYear()} Fazam Football Academy</p>
        </div>
      </header>

      <section className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-10 pb-8 sm:px-10 lg:mt-0 lg:rounded-none">
        <div className="flex flex-1 items-start justify-center sm:items-center">{children}</div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Trouble signing in? Ask the academy administrator.
        </p>
      </section>
    </main>
  );
}
