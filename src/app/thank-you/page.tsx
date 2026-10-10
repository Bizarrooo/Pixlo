import Link from "next/link";

export const metadata = {
  title: "Thank You | Pixlo",
  description: "Thank you for supporting Pixlo.",
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07070b] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-240px] right-[-100px] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-300/20 bg-violet-400/10 text-4xl shadow-[0_0_70px_rgba(139,92,246,0.16)]">
          💜
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-violet-300">Pixlo community</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Thank you for supporting Pixlo!</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-white/65">
          Your support means a lot. Donations help us improve Pixlo, build new features, and hopefully get our own custom domain one day.
        </p>
        <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/55">
          Every contribution helps us keep building. We appreciate you being part of Pixlo. ✨
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#07070b]"
        >
          Back to Pixlo <span aria-hidden="true">↗</span>
        </Link>
        <p className="mt-8 text-xs text-white/30">Made with care by Pixlo</p>
      </div>
    </main>
  );
}
