
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
const [mobileOpen, setMobileOpen] = useState(false);
const [faqOpen, setFaqOpen] = useState<number | null>(null);

return ( <div className="min-h-screen bg-white text-gray-900">
<header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"> <div className="mx-auto max-w-7xl px-6 py-4"> <div className="flex items-center justify-between">
{/* Logo \*/} <div className="flex items-center"> <Image
             src="/assets/mmlogox.png"
             alt="Matchmatical"
             width={40}
             height={40}
             className="w-10 h-10"
             priority
           /> <span className="sr-only">Matchmatical</span> </div>

   
        {/* Right side icons + actions (visual parity with login header) */}
        <div className="flex items-center space-x-3">
          

          <Link
            href="/auth/login"
            className="hidden md:inline-flex text-sm font-medium px-4 py-2 rounded-md border border-gray-200 hover:border-gray-300"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="hidden md:inline-flex text-sm font-medium px-4 py-2 rounded-md bg-[#672DB7] text-white hover:bg-[#5a2a9e]"
          >
            Get started
          </Link>

          {/* Hamburger menu */}
          <button
            className="md:hidden p-2"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(v => !v)}
          >
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden mt-3 border-t border-gray-200 pt-3 space-y-2">
          <a href="#features" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>How it works</a>
          <a href="#science" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>The Math</a>
          <a href="#testimonials" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>Stories</a>
          <a href="#faq" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>FAQ</a>
          <Link href="/auth/login" className="block px-1 py-2" onClick={() => setMobileOpen(false)}>Log out</Link>
          <div className="flex gap-2 pt-2">
            <Link href="/auth/login" className="flex-1 text-center text-sm font-medium px-4 py-2 rounded-md border border-gray-200">Log in</Link>
            <Link href="/auth/register" className="flex-1 text-center text-sm font-medium px-4 py-2 rounded-md bg-[#672DB7] text-white hover:bg-[#5a2a9e]">Get started</Link>
          </div>
        </div>
      )}
    </div>
  </header>

  {/* Hero */}
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F5F1FF] via-white to-white" />
    <div className="absolute -top-36 -right-24 h-96 w-96 rounded-full bg-[#672DB7]/10 blur-3xl" />
    <div className="absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-[#672DB7]/10 blur-3xl" />

    <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700">
            <span className="inline-block h-2 w-2 rounded-full bg-[#672DB7]" />
            Math-based matching, two‑sided questions, clear scores
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-semibold leading-tight">
            Date smarter with <span className="text-[#672DB7]">Matchmatical</span>
          </h1>
          <p className="mt-4 text-gray-600 md:text-lg">
            Answer 14 mandatory questions on a 1–6 scale (6 = open to all). Each question has a Me value and a Looking value.
            We normalize, apply your per‑question importance, and compute three scores: Overall, Me→Them, and Them→Me.
          </p>

          <form
            className="mt-8 flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => { e.preventDefault(); window.location.href = '/auth/register'; }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email for waitlist"
              className="w-full sm:max-w-sm rounded-md border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#672DB7]/50"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-[#672DB7] px-6 py-3 text-white font-medium hover:bg-[#5a2a9e] transition-colors"
            >
              Join the waitlist
            </button>
          </form>

          <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
              Explainable scores
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
              No black‑box math
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4A4.5 4.5 0 0 1 12 6.09 4.5 4.5 0 0 1 17.5 4C20 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              Safety-first UX
            </div>
          </div>
        </div>

        {/* Mock preview */}
        <div className="relative">
          <div className="rounded-2xl border border-gray-200 bg-white/70 shadow-xl p-4 md:p-6">
            <div className="rounded-xl bg-gradient-to-br from-[#672DB7]/10 to-gray-50 p-4">
              <Image
                src="/assets/cart.jpg"
                alt="App preview"
                width={1200}
                height={900}
                className="rounded-lg border border-gray-200"
              />
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 hidden md:block">
            <div className="rounded-xl bg-white border border-gray-200 shadow-md px-4 py-3">
              <p className="text-sm font-medium">Your Compatibility</p>
              <p className="text-2xl font-semibold text-[#672DB7]">92%</p>
              <p className="text-xs text-gray-500">High alignment in values & routines</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* Features */}
  <section id="features" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-semibold">What makes us different</h2>
      <p className="mt-3 text-gray-600">
        Two‑sided questions (Me and Looking), 1–6 scale with “open to all”, per‑question importance, and transparent scoring.
      </p>
    </div>

    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        {
          title: 'Two‑sided questions',
          desc: 'Every prompt has Me and Looking inputs so preferences and expectations both count.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        },
        {
          title: 'Per‑question importance',
          desc: 'Mark what matters more. The algorithm respects your weights when computing scores.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M3 17h6v2H3v-2zm0-6h12v2H3V11zm0-6h18v2H3V5z"/></svg>
        },
        {
          title: '14 mandatory seeds',
          desc: 'Admin‑curated core questions start everyone with signal. Users can add more later.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M3 3h18v2H3zM7 9h14v2H7zM3 15h18v2H3zM7 21h14v2H7z"/></svg>
        },
        {
          title: 'Safety Toolkit',
          desc: 'Photo verification, report flows, and first-meet check-ins for peace of mind.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"/></svg>
        },
        {
          title: 'Contextual Profiles',
          desc: 'Beyond photos: goals, rhythms, non-negotiables, and values—front and center.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg>
        },
        {
          title: 'Privacy by Design',
          desc: 'Minimal collection, clear controls, no third-party ad trackers. Your data, your rules.',
          icon: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true"><path d="M12 1l9 4v6c0 5.5-3.8 10.7-9 12-5.2-1.3-9-6.5-9-12V5l9-4z"/></svg>
        }
      ].map((f, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow bg-white">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#672DB7]/10 text-[#672DB7]">
            {f.icon}
          </div>
          <h3 className="mt-4 font-semibold">{f.title}</h3>
          <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
        </div>
      ))}
    </div>
  </section>

  {/* How it works */}
  <section id="how-it-works" className="bg-gray-50">
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold">How it works</h2>
        <p className="mt-3 text-gray-600">Answer. Weight. Match—with three scores you can explain.</p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {[
          {
            step: '01',
            title: 'Answer 14 questions',
            desc: 'Mandatory, admin‑curated. 1–6 scale where 6 = open to all. More prompts can be added later.',
          },
          {
            step: '02',
            title: 'Set importance per question',
            desc: 'Tell us what matters more. We normalize Me vs Looking and apply your weights.',
          },
          {
            step: '03',
            title: 'See three scores',
            desc: 'Overall, your compatibility with what they’re looking for, and theirs with you—plus clear rationale.',
          }
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="text-sm font-mono text-[#672DB7]">Step {s.step}</div>
            <h3 className="mt-2 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link href="/auth/register" className="inline-flex items-center rounded-md bg-[#672DB7] px-6 py-3 text-white font-medium hover:bg-[#5a2a9e]">
          Reserve your spot
        </Link>
      </div>
    </div>
  </section>

  {/* The Math / Science */}
  <section id="science" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-semibold">The math behind the match</h2>
        <p className="mt-3 text-gray-600">
          Each question has two inputs: your Me answer and your Looking answer. We compare your Looking to their Me (and vice‑versa),
          normalize 1–6 scales (with 6 treated as open to all), apply your importance weights, and compute three scores.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#672DB7]" /> Adjustable weights to reflect your priorities.</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#672DB7]" /> Conflict detection (e.g., timeline mismatches, non-negotiables).</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#672DB7]" /> Readable explanations with actionable insights.</li>
        </ul>
        <div className="mt-8 flex gap-3">
          <a href="#faq" className="inline-flex items-center rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50">Read FAQ</a>
          <Link href="/auth/register" className="inline-flex items-center rounded-md bg-[#672DB7] px-5 py-2.5 text-white font-medium hover:bg-[#5a2a9e]">Get early access</Link>
        </div>
      </div>

      <div className="relative">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <h3 className="font-semibold">Sample score breakdown</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Overall compatibility', value: 0.92 },
              { label: 'Me → Them (what they\'re looking for)', value: 0.89 },
              { label: 'Them → Me (what I\'m looking for)', value: 0.90 },
              { label: 'Questions used', value: 0.70 },
            ].map((row, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-medium">{Math.round(row.value * 100)}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-[#672DB7]"
                    style={{ width: `${row.value * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <p><span className="font-medium">Why this works:</span> weights reflect your priorities; explanations show exactly where you align and where you don’t.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* Testimonials */}
  <section id="testimonials" className="bg-gray-50">
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold">What our early users say</h2>
        <p className="mt-3 text-gray-600">Real feedback from real dates.</p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {[
          { name: 'Sam & Ana', quote: 'We both wanted faith-forward dating. The score breakdown made next steps obvious.' },
          { name: 'Jordan', quote: 'Finally a profile that explains the “why” behind a match. Less small talk, more signal.' },
          { name: 'Maya', quote: 'Dealbreakers handled up front—saved time and awkwardness. 10/10 experience.' },
        ].map((t, i) => (
          <figure key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
            <blockquote className="text-sm text-gray-700">“{t.quote}”</blockquote>
            <figcaption className="mt-4 text-sm font-medium">{t.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>

  {/* CTA */}
  <section className="relative">
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#672DB7] to-[#5a2a9e]" />
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 text-white">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold">Ready to date with clarity?</h2>
          <p className="mt-3 text-white/90">
            Join the waitlist to get early access and help shape the future of values-aligned dating.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-[#672DB7] font-medium hover:bg-gray-100"
          >
            Join the waitlist
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-white/70 px-6 py-3 font-medium hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  </section>

  {/* FAQ */}
  <section id="faq" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-semibold">Frequently asked questions</h2>
      <p className="mt-3 text-gray-600">Short answers, no fluff.</p>
    </div>

    <div className="mt-10 max-w-3xl mx-auto divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {[
        {
          q: 'What makes Matchmatical different?',
          a: 'Explainable, values-aligned matching with adjustable weights so you stay in control of what matters.',
        },
        {
          q: 'Is my data private?',
          a: 'Yes. We minimize collection, provide clear controls, and do not sell data to third-party advertisers.',
        },
        {
          q: 'Can I change my priorities later?',
          a: 'Anytime. Re-weight values, update goals, and your score recalculates instantly.',
        },
        {
          q: 'When can I try it?',
          a: 'We’re onboarding waitlist users in waves. Join the list to get early access invites.',
        },
      ].map((item, i) => (
        <details
          key={i}
          className="group p-4"
          open={faqOpen === i}
          onToggle={(e) => {
            const isOpen = (e.target as HTMLDetailsElement).open;
            setFaqOpen(isOpen ? i : null);
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="font-medium">{item.q}</span>
            <span className="ml-4 rounded-md border border-gray-200 p-1">
              <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a1 1 0 01.894.553l6 12A1 1 0 0116 17H4a1 1 0 01-.894-1.447l6-12A1 1 0 0110 3zm0 4.618L5.382 15h9.236L10 7.618z" clipRule="evenodd" />
              </svg>
            </span>
          </summary>
          <p className="mt-2 text-sm text-gray-600">{item.a}</p>
        </details>
      ))}
    </div>
  </section>

  {/* Footer */}
  <footer className="border-t border-gray-200">
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Image src="/assets/mmlogox.png" alt="Matchmatical" width={32} height={32} className="w-8 h-8" />
            <span className="font-semibold">Matchmatical</span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            A math-based dating app for people who want clarity, not chaos.
          </p>
        </div>
        <div>
          <h4 className="font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><a href="#features" className="hover:text-[#672DB7]">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-[#672DB7]">How it works</a></li>
            <li><a href="#science" className="hover:text-[#672DB7]">The Math</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link href="/privacy" className="hover:text-[#672DB7]">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-[#672DB7]">Terms</Link></li>
            <li><a href="mailto:hello@matchmatical.com" className="hover:text-[#672DB7]">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Matchmatical. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-[#672DB7]">Twitter</a>
          <a href="#" className="hover:text-[#672DB7]">Instagram</a>
          <a href="#" className="hover:text-[#672DB7]">TikTok</a>
        </div>
      </div>
    </div>
  </footer>
</div>

);
}
