import React, { useState } from "react";
import { motion } from "framer-motion";

// Sunset pastel aesthetic (peach · rose · lavender · amber)
// Modern, airy, and soft. B2B-first copy with consumer-friendly tone.

const WAITLIST_ENDPOINT = "#"; // replace with API Gateway URL for Lambda

function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Large soft wash */}
      <div className="absolute -top-40 left-1/2 h-[90vmax] w-[90vmax] -translate-x-1/2 rounded-full bg-gradient-to-br from-rose-50 via-amber-50 to-fuchsia-50 blur-3xl" />
      {/* Iridescent blobs */}
      <div className="absolute left-[10%] top-[20%] h-80 w-80 animate-blob rounded-full bg-gradient-to-br from-rose-200 via-orange-100 to-amber-200 opacity-70 mix-blend-screen blur-2xl" />
      <div className="absolute right-[12%] top-[8%] h-96 w-96 animate-blob animation-delay-2000 rounded-full bg-gradient-to-br from-pink-200 via-violet-100 to-fuchsia-200 opacity-60 mix-blend-screen blur-2xl" />
      <div className="absolute bottom-[10%] left-[20%] h-[28rem] w-[28rem] animate-blob animation-delay-4000 rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-rose-200 opacity-50 mix-blend-screen blur-3xl" />
      {/* Subtle film grain */}
      <div className="absolute inset-0 grain" />
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">{children}</div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/40 bg-white/70 backdrop-blur-xl">
      <Shell>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-rose-300 via-pink-300 to-amber-300 shadow-sm ring-1 ring-black/5" />
            MoMoney
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
            <a href="#brokerages" className="hover:text-slate-900">For Brokerages</a>
            <a href="#users" className="hover:text-slate-900">For Users</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#waitlist" className="rounded-full border border-rose-300/50 px-4 py-2 font-medium text-rose-700 hover:bg-rose-50">Join Waitlist</a>
          </nav>
        </div>
      </Shell>
    </header>
  );
}

function Hero() {
  return (
    <Shell>
      <section className="relative overflow-hidden py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center rounded-full border border-rose-300/40 bg-white/70 px-3 py-1 text-xs font-medium text-rose-700 backdrop-blur-xl">
            Activation platform for retail brokerages
          </span>
          <h1 className="mt-5 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-4xl font-extrabold leading-tight text-transparent sm:text-5xl md:text-6xl">
            Lower CAC waste. Higher activation. Confident first trades.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            MoMoney adds an interactive onboarding layer that turns curious sign‑ups into confident, retained investors — improving funded‑account rate, first‑deposit size, and long‑term activity.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#waitlist" className="group inline-flex items-center rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-200/50 ring-1 ring-black/5">
              Request early access
              <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a href="#how" className="rounded-full border border-rose-300/40 bg-white/70 px-5 py-3 font-semibold text-rose-700 backdrop-blur-xl hover:bg-white/90">
              See how it works
            </a>
          </div>
        </motion.div>

        {/* Product preview card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-12 max-w-5xl rounded-2xl border border-white/50 bg-white/60 p-2 backdrop-blur-xl shadow-[0_12px_60px_-20px_rgba(244,114,182,0.35)]"
        >
          <div className="rounded-xl bg-white/80 p-5 ring-1 ring-black/5">
            <div className="flex h-[360px] items-center justify-center rounded-lg bg-gradient-to-b from-rose-50 via-white to-amber-50 text-slate-500">
              <div className="flex flex-col items-center">
                <div className="mb-2 h-10 w-10 rounded-full bg-gradient-to-br from-rose-300 via-pink-300 to-amber-300" />
                <p className="text-sm">Onboarding tiles & pre‑trade confidence checks</p>
                <p className="text-xs text-slate-400">(swap in product screenshots later)</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </Shell>
  );
}

function Item({ children }) {
  return (
    <li className="flex items-start gap-2 text-left text-slate-700">
      <span className="mt-1 inline-grid h-5 w-5 place-items-center rounded-full border border-rose-300/60 text-[10px] text-rose-700">✓</span>
      {children}
    </li>
  );
}

function SplitValue() {
  return (
    <Shell>
      <section id="brokerages" className="grid gap-6 py-12 md:grid-cols-2">
        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 backdrop-blur-xl shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">For Brokerages</h3>
          <p className="mt-1 text-slate-600">Plug‑in activation experiences that meet beginners at the right step: first deposit, first trade, and beyond.</p>
          <ul className="mt-4 grid gap-2">
            <Item><b>Lower CAC</b> by converting more installs into funded accounts.</Item>
            <Item><b>+Activation</b>: reduce KYC and onboarding drop‑offs.</Item>
            <Item><b>+First trade</b>: remove hesitation with in‑flow guidance.</Item>
            <Item><b>+Retention</b>: habit loops & goal‑based nudges keep users active.</Item>
            <Item>Works alongside your brand — white‑label or co‑brand.</Item>
          </ul>
        </div>
        <div id="users" className="rounded-2xl border border-white/50 bg-white/70 p-6 backdrop-blur-xl shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">For Humans (your users)</h3>
          <p className="mt-1 text-slate-600">Clear, friendly walkthroughs that build confidence without jargon — so taking the first step feels safe and simple.</p>
          <ul className="mt-4 grid gap-2">
            <Item>Understand basics in‑context, not in a textbook.</Item>
            <Item>Make a plan: deposit, diversify, and review risk before placing an order.</Item>
            <Item>Practice flows and get instant feedback.</Item>
            <Item>Own your pace — no accounts connected until you choose to.</Item>
          </ul>
        </div>
      </section>
    </Shell>
  );
}

function Outcomes() {
  const data = [
    { label: "CAC Efficiency", value: "↓ 25–40%", sub: "less waste from non‑depositors*" },
    { label: "Funded accounts", value: "+15–30%", sub: "uplift from guided flows*" },
    { label: "First trade rate", value: "+20–35%", sub: "faster time‑to‑first‑trade*" },
    { label: "Retention", value: "+10–25%", sub: "improved 30/90‑day activity*" }
  ];
  return (
    <Shell>
      <section className="py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-white/50 bg-white/70 p-5 text-center backdrop-blur-xl shadow-sm"
            >
              <div className="text-sm text-slate-600">{m.label}</div>
              <div className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-3xl font-extrabold text-transparent">{m.value}</div>
              <div className="text-xs text-slate-500">{m.sub}</div>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">*Placeholder ranges based on internal tests and industry benchmarks. Your results may vary.</p>
      </section>
    </Shell>
  );
}

function Steps() {
  const steps = [
    { title: "Embed", desc: "Use our SDK to add modular experiences to your app or web — no redesign needed. Works with your auth, analytics, and brand." },
    { title: "Guide", desc: "Trigger context‑aware tiles during onboarding: explain KYC, nudge deposits, simulate a first order, and remove hesitation." },
    { title: "Measure", desc: "Track funded‑account rate, first‑trade time, and retained activity with clean attribution — see CAC efficiency move." }
  ];
  return (
    <Shell>
      <section id="how" className="py-8">
        <h3 className="text-center text-2xl font-semibold text-slate-900">How it works</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-white/50 bg-white/70 p-5 backdrop-blur-xl shadow-sm"
            >
              <div className="mb-2 inline-grid h-7 w-7 place-items-center rounded-full border border-rose-300/60 text-sm font-semibold text-rose-700">
                {i + 1}
              </div>
              <div className="text-lg font-semibold text-slate-900">{s.title}</div>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function Waitlist() {
  const [state, setState] = useState({ status: "idle", msg: "" });
  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    setState({ status: "loading", msg: "" });
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Network error");
      setState({ status: "success", msg: "Added to waitlist ✓" });
      form.reset();
    } catch (err) {
      setState({ status: "error", msg: "Could not submit. Try again." });
    }
  }
  return (
    <Shell>
      <section id="waitlist" className="py-14">
        <div className="rounded-2xl border border-white/50 bg-white/70 p-6 text-center backdrop-blur-xl shadow-[0_12px_60px_-20px_rgba(244,114,182,0.35)]">
          <span className="inline-flex items-center rounded-full border border-rose-300/50 bg-white/80 px-3 py-1 text-xs font-medium text-rose-700">Early Access</span>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">Try MoMoney with your onboarding</h3>
          <p className="mx-auto mt-1 max-w-2xl text-slate-600">We’re partnering with select brokerages to pilot activation tiles. Join the waitlist — we’ll reach out with integration details.</p>
          <form onSubmit={handleSubmit} className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            <input required type="email" name="email" placeholder="Work email" className="min-w-[220px] flex-1 rounded-full border border-slate-200/80 bg-white/90 px-4 py-3 text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300" />
            <input type="text" name="company" placeholder="Company" className="min-w-[180px] rounded-full border border-slate-200/80 bg-white/90 px-4 py-3 text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300" />
            <button disabled={state.status === "loading"} className="rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-200/50 disabled:opacity-70">
              {state.status === "loading" ? "Submitting…" : "Join waitlist"}
            </button>
          </form>
          {state.msg && <p className="mt-2 text-sm text-slate-600">{state.msg}</p>}
          <p className="mt-3 text-xs text-slate-400">By joining, you agree to our Privacy Policy.</p>
        </div>
      </section>
    </Shell>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/50 bg-white/70 py-8 text-center text-slate-600 backdrop-blur-xl">
      <Shell>
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-rose-300 via-pink-300 to-amber-300 ring-1 ring-black/5" />
            MoMoney
          </div>
          <div>© {new Date().getFullYear()} MoMoney. All rights reserved.</div>
        </div>
      </Shell>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-slate-900">
      <AnimatedBackground />
      <Nav />
      <Hero />
      <SplitValue />
      <Outcomes />
      <Steps />
      <Waitlist />
      <Footer />

      {/* local styles for animations and grain */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-25px, 15px) scale(0.98); }
        }
        .animate-blob { animation: blob 18s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .grain { 
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100%' height='100%'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.02'/></svg>");
          background-size: cover; background-repeat: no-repeat; 
        }
      `}</style>
    </div>
  );
}