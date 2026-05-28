import type { Metadata } from "next";
import Link from "next/link";

import { CAMP_FAQ_ITEMS } from "@/lib/camp-faqs";

export const metadata: Metadata = {
  title: "Camp Hope 2026 FAQs",
  description: "Frequently asked questions for Camp Hope 2026 registration.",
};

export default function FaqsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:30px_30px] opacity-20" />
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="panel-surface px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                Camp Hope 2026
              </p>
              <h1 className="font-display mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                Frequently asked questions
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-sand-800">
                If you are unclear on how to register, start here. When you are ready, return to
                the registration form and choose your church.
              </p>
            </div>
            <Link
              href="/#registration-start"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
            >
              Return to registration
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4" aria-label="Camp Hope registration questions">
          {CAMP_FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group rounded-[24px] border border-sand-200 bg-white/85 px-5 py-5 shadow-sm backdrop-blur-sm sm:px-6"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                <h2 className="font-display text-xl font-semibold text-ink">{item.question}</h2>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-lg leading-none text-brand-700 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-4 space-y-3 pr-8 text-sm leading-6 text-sand-800">
                {item.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            href="/#registration-start"
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
          >
            Return to registration
          </Link>
        </div>
      </div>
    </main>
  );
}
