'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import LiveQuestionsSection from '@/components/LiveQuestionsSection';

const purple = '#672DB7';

const featureCards = [
  {
    title: '1–5 Answers',
    description: 'Answer questions on a 1 to 5 scale',
    icon: (
      <svg className="h-5 w-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Me & Them',
    description: 'Answer for yourself and what you want in a match',
    icon: (
      <svg className="h-5 w-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: 'Importance',
    description: 'Rate how much each question matters to you from 1–5',
    icon: (
      <svg className="h-5 w-5 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    title: 'Open to All',
    description: 'Stay flexible when any answer works for you',
    icon: <ToggleIcon color={purple} />,
  },
  {
    title: 'Required',
    description: 'Choose the questions a potential match must answer',
    icon: <ToggleIcon color="#18181B" />,
  },
  {
    title: 'Share Answer',
    description: 'Decide which answers other members can see',
    icon: <ToggleIcon color="#18181B" />,
  },
  {
    title: 'Overall',
    description: 'Your mutual compatibility in one clear view',
    icon: <ScoreRing percentage={87} />,
  },
  {
    title: 'Compatible with Me',
    description: 'How well they fit what you are looking for',
    icon: <ScoreRing percentage={92} />,
  },
  {
    title: "I'm Compatible with",
    description: 'How well you fit what they are looking for',
    icon: <ScoreRing percentage={83} />,
  },
];

const productFeatures = [
  {
    number: '01',
    title: 'Two sides to every answer',
    description: 'Tell us where you stand and what you hope to find. Compatibility is calculated in both directions instead of treating attraction as one-sided.',
  },
  {
    number: '02',
    title: 'Your priorities set the signal',
    description: 'Rate importance, stay open to all when you are flexible, and mark the questions you need another person to answer.',
  },
  {
    number: '03',
    title: 'Three scores, not one mystery number',
    description: 'See overall compatibility, how well they fit your preferences, and how well you fit theirs before deciding what comes next.',
  },
  {
    number: '04',
    title: 'More than a profile card',
    description: 'Approve people, like with an optional note, match, chat, and get to know the community through questions and posts.',
  },
];

const steps = [
  {
    step: 'Build your profile',
    description: 'Add your details and up to five photos. Your first photo becomes your main profile image.',
  },
  {
    step: 'Answer what matters',
    description: 'Start with ten core topics, then answer more questions and refine your preferences whenever you want.',
  },
  {
    step: 'Discover with context',
    description: 'Browse people using compatibility, distance, age, activity, and required-question filters.',
  },
  {
    step: 'Connect intentionally',
    description: 'Approve, like, match, and move into a conversation when the interest is mutual.',
  },
];

const faqs = [
  {
    question: 'How does compatibility work?',
    answer: 'For each question, you can answer for yourself and for the person you are looking for. CompatibleFirst compares both directions, factors in the importance you chose, and returns an overall score plus a score for each direction.',
  },
  {
    question: 'What does “required” mean?',
    answer: 'Required questions are chosen by you. They identify answers you need from a potential match, and you can use them to see who has completed your requirements and whose requirements you still need to answer.',
  },
  {
    question: 'Can I change my answers and preferences?',
    answer: 'Yes. You can revisit questions, change your answers, adjust importance, update what you are looking for, and choose whether an answer is shared.',
  },
  {
    question: 'What happens after I like someone?',
    answer: 'A mutual like creates a match. From there, you can start a private conversation. You can also approve profiles first if you want to organize people before liking them.',
  },
  {
    question: 'Can I control who sees what I share?',
    answer: 'Yes. Answer-sharing controls let you decide what is visible, and feed posts can be shared with everyone, approved people, people you liked, or matches.',
  },
  {
    question: 'How do I create an account?',
    answer: 'Choose Get started, create your account, verify your email, add your profile details and photos, and complete the core questions.',
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    posthog.capture('landing_page_viewed');
  }, []);

  const trackCta = (label: string, location: string) => {
    posthog.capture('cta_clicked', { cta_label: label, location });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FCFBFD] text-[#18151D]">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#FCFBFD]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CompatibleFirst home">
            <Image src="/assets/mmlogox.png" alt="" width={38} height={38} priority className="h-9 w-9 object-contain" />
            <Wordmark className="text-[17px]" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#5F5967] md:flex" aria-label="Main navigation">
            <a href="#features" className="transition-colors hover:text-[#18151D]">Features</a>
            <a href="#questions" className="transition-colors hover:text-[#18151D]">Questions</a>
            <a href="#how-it-works" className="transition-colors hover:text-[#18151D]">How it works</a>
            <a href="#faq" className="transition-colors hover:text-[#18151D]">FAQ</a>
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              href="/auth/login"
              className="rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-black/[0.04]"
              onClick={() => trackCta('log_in', 'header')}
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full bg-[#18151D] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              onClick={() => trackCta('get_started', 'header')}
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-black/[0.06] bg-[#FCFBFD] px-5 pb-5 pt-3 md:hidden">
            <nav className="space-y-1 text-sm font-medium" aria-label="Mobile navigation">
              {[
                ['#features', 'Features'],
                ['#questions', 'Questions'],
                ['#how-it-works', 'How it works'],
                ['#faq', 'FAQ'],
              ].map(([href, label]) => (
                <a key={href} href={href} className="block rounded-xl px-3 py-3 hover:bg-black/[0.04]" onClick={() => setMobileOpen(false)}>{label}</a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/auth/login" className="rounded-full border border-black/10 bg-white px-4 py-3 text-center text-sm font-semibold">Log in</Link>
              <Link href="/auth/register" className="rounded-full bg-[#18151D] px-4 py-3 text-center text-sm font-semibold text-white">Get started</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative isolate">
          <div className="absolute inset-x-0 top-0 -z-10 h-[820px] bg-[radial-gradient(circle_at_78%_18%,rgba(103,45,183,0.17),transparent_35%),radial-gradient(circle_at_18%_30%,rgba(214,190,255,0.45),transparent_31%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 md:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:pb-32">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#672DB7]/15 bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#672DB7] shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#672DB7]" />
                Compatibility in both directions
              </div>
              <h1 className="mt-6 text-[3rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[4rem] lg:text-[4.6rem]">
                Meet people who fit what <span className="text-[#672DB7]">matters.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#625C69]">
                CompatibleFirst looks beyond a photo. Answer for who you are and who you are looking for, then see where compatibility works for both of you.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#672DB7] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(103,45,183,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#59259F]"
                  onClick={() => trackCta('get_started', 'hero')}
                >
                  Get started
                  <ArrowIcon />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 py-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white">
                  See how it works
                </a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#4F4957]">
                {['Two-sided answers', 'Required-question controls', 'Clear compatibility scores'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#672DB7]/10 text-[#672DB7]"><CheckIcon /></span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <ProductGridPreview />
          </div>
        </section>

        <LiveQuestionsSection />

        <section id="features" className="border-y border-black/[0.06] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#672DB7]">Designed for clarity</p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A better answer than endless swiping.</h2>
                <p className="mt-5 max-w-md text-base leading-7 text-[#6B6571]">Photos still matter. They just are not the only information you get before choosing who deserves your time.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {productFeatures.map((feature) => (
                  <article key={feature.number} className="group min-h-[265px] rounded-[28px] border border-black/[0.07] bg-[#FCFBFD] p-7 transition-all hover:-translate-y-1 hover:border-[#672DB7]/20 hover:shadow-[0_20px_50px_rgba(45,26,64,0.08)]">
                    <span className="font-mono text-xs font-semibold text-[#672DB7]">{feature.number}</span>
                    <h3 className="mt-14 text-2xl font-semibold tracking-[-0.03em]">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#6B6571]">{feature.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#672DB7]/10 bg-[#F5F1FA] text-[#18151D]">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#672DB7]">How it works</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">From profile to conversation, with more context at every step.</h2>
            </div>

            <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((item, index) => (
                <li key={item.step} className="rounded-[24px] border border-[#672DB7]/10 bg-white p-7 shadow-[0_12px_35px_rgba(66,39,87,0.06)] lg:min-h-[285px]">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#672DB7]/10 text-sm font-semibold text-[#672DB7]">{index + 1}</span>
                  <h3 className="mt-12 text-xl font-semibold">{item.step}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6B6571]">{item.description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[24px] bg-[#672DB7] px-7 py-7 sm:flex-row sm:items-center sm:px-9">
              <div>
                <p className="text-lg font-semibold text-white">Ready to see compatibility differently?</p>
                <p className="mt-1 text-sm text-white/70">Create your profile and begin answering what matters.</p>
              </div>
              <Link
                href="/auth/register"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#672DB7] transition-transform hover:-translate-y-0.5"
                onClick={() => trackCta('create_profile', 'how_it_works')}
              >
                Create your profile
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#FCFBFD]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-32">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#672DB7]">The details</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Questions, answered.</h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-[#6B6571]">Everything here reflects the current CompatibleFirst experience.</p>
            </div>

            <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {faqs.map((item) => (
                <details key={item.question} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <span className="relative h-6 w-6 shrink-0 rounded-full border border-black/10 bg-white">
                      <span className="absolute left-1/2 top-1/2 h-px w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#18151D]" />
                      <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[#18151D] transition-transform group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[#6B6571]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:pb-32">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#EEE5FA] px-6 py-16 text-center sm:px-10 lg:py-20">
            <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#672DB7]/10 blur-2xl" />
            <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-white/70 blur-2xl" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Compatibility Comes First</h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#625C69]">Build a profile that says more, discover people with context, and make your next connection with clearer expectations.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#672DB7] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                  onClick={() => trackCta('get_started', 'bottom_cta')}
                >
                  Get started
                  <ArrowIcon />
                </Link>
                <Link href="/auth/login" className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.07] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <Image src="/assets/mmlogox.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
              <Wordmark />
            </Link>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#6B6571]" aria-label="Footer navigation">
              <a href="#features" className="hover:text-[#672DB7]">Features</a>
              <a href="#questions" className="hover:text-[#672DB7]">Questions</a>
              <a href="#how-it-works" className="hover:text-[#672DB7]">How it works</a>
              <Link href="/privacy" className="hover:text-[#672DB7]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#672DB7]">Terms</Link>
              <a href="mailto:hello@matchmatical.com" className="hover:text-[#672DB7]">Contact</a>
            </nav>
          </div>
          <div className="mt-8 flex flex-col justify-between gap-2 border-t border-black/[0.07] pt-6 text-xs text-[#817B86] sm:flex-row">
            <p>© {new Date().getFullYear()} CompatibleFirst. All rights reserved.</p>
            <p>Compatibility-based matchmaking for more intentional connections.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductGridPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[650px] lg:mx-0">
      <div className="absolute -inset-6 -z-10 rounded-[48px] bg-white/35 blur-xl" />
      <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_35px_90px_rgba(52,31,75,0.18)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <Image src="/assets/mmlogox.png" alt="" width={27} height={27} className="h-7 w-7 object-contain" />
            <Wordmark className="text-sm" />
          </div>
          <span className="rounded-full bg-[#F1EAFB] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#672DB7]">How it works</span>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {[
            ['How it works', featureCards.slice(0, 3)],
            ['Question controls', featureCards.slice(3, 6)],
            ['Compatibility', featureCards.slice(6, 9)],
          ].map(([label, cards]) => (
            <div key={label as string}>
              <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#672DB7] sm:text-[10px]">{label as string}</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {(cards as typeof featureCards).map((card) => (
                  <div key={card.title} className="flex min-h-[150px] flex-col items-start rounded-2xl bg-[#F7F6F8] p-3 sm:min-h-[142px] sm:p-4">
                    <div className="mb-2.5 origin-left scale-90 sm:mb-3 sm:scale-100">{card.icon}</div>
                    <h3 className="text-[11px] font-bold leading-tight text-[#201D24] sm:text-sm">{card.title}</h3>
                    <p className="mt-1 text-[9px] leading-[1.35] text-[#77717E] sm:text-[11px] sm:leading-[1.45]">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-[-0.02em] ${className}`}>
      <span className="text-[#18151D]">Compatible</span><span className="text-[#672DB7]">First</span>
    </span>
  );
}

function ToggleIcon({ color }: { color: string }) {
  return (
    <div className="relative h-5 w-9 rounded-full" style={{ backgroundColor: color }}>
      <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
    </div>
  );
}

function ScoreRing({ percentage }: { percentage: number }) {
  return (
    <div className="relative h-9 w-9">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E2E8" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={purple} strokeWidth="2.5" strokeDasharray="100" strokeDashoffset={100 - percentage} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[8px] font-black text-[#672DB7]">{percentage}%</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}
