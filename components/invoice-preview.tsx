"use client";

import { useState } from "react";

import { buildInvoiceClipboardText } from "@/lib/invoice";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { TENT_PRICING, isTentType } from "@/lib/pricing";
import type { InvoiceSummary, SubmissionPayload } from "@/types/registration";

interface InvoicePreviewProps {
  title: string;
  subtitle: string;
  payerName: string;
  email: string;
  church: string;
  summary: InvoiceSummary | SubmissionPayload;
  showActions?: boolean;
}

function isSubmissionPayload(
  summary: InvoiceSummary | SubmissionPayload,
): summary is SubmissionPayload {
  return "reference" in summary;
}

export function InvoicePreview({
  title,
  subtitle,
  payerName,
  email,
  church,
  summary,
  showActions = true,
}: InvoicePreviewProps) {
  const [copied, setCopied] = useState(false);
  const accommodationLabel = isSubmissionPayload(summary)
    ? summary.accommodationLabel
    : summary.accommodationLabel;
  const people = isSubmissionPayload(summary)
    ? summary.people
    : summary.people.filter((person) => person.isStarted);
  const grandTotal = isSubmissionPayload(summary) ? summary.total : summary.grandTotal;
  const ageCounts = people.reduce(
    (counts, person) => {
      if (person.ageGroup === "adult") {
        counts.adults += 1;
      }

      if (person.ageGroup === "teen") {
        counts.teens += 1;
      }

      if (person.ageGroup === "child") {
        counts.children += 1;
      }

      return counts;
    },
    {
      adults: 0,
      teens: 0,
      children: 0,
    },
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      buildInvoiceClipboardText({
        payerName,
        email,
        church,
        summary,
      }),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="panel-surface invoice-print-surface p-6 sm:p-7" id="invoice-panel">
      <div className="flex flex-col gap-5">
        <div className="print-only border-b border-sand-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
            Camp Hope 2026
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
            Camp Meeting Invoice
          </h1>
          <p className="mt-2 text-sm text-sand-800">Faith to Follow</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="invoice-screen-heading">
            <span className="badge">{isSubmissionPayload(summary) ? "Saved" : "Live invoice"}</span>
            <h2 className="font-display mt-4 text-3xl font-semibold text-ink">
              {title}
            </h2>
            <p className="invoice-subtitle mt-2 max-w-xl text-sm text-sand-800">{subtitle}</p>
          </div>
          {showActions ? (
            <div className="print-hidden flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-sand-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                Print invoice
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
              >
                {copied ? "Copied" : "Copy summary"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="invoice-meta-card grid gap-4 rounded-[24px] border border-sand-200 bg-sand-50/80 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700">
              Primary payer
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {payerName.trim() || "Waiting for payer name"}
            </p>
            <p className="mt-1 text-sm text-sand-800">{email.trim() || "Waiting for email address"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700">Church</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {church.trim() || "Choose a church"}
            </p>
            {isSubmissionPayload(summary) ? (
              <>
                <p className="mt-1 text-sm text-sand-800">
                  Ref {summary.reference} • {formatDateTime(summary.submittedAt)}
                </p>
                <p className="mt-2 text-sm text-sand-800">Accommodation: {summary.accommodationLabel}</p>
                <p className="mt-2 text-sm text-sand-800">
                  Adults {summary.adultCount} • Teens {summary.teenCount} • Children {summary.childCount}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-sand-800">
                  {people.length > 0 ? `${people.length} person(s) in this invoice` : "Start adding people below"}
                </p>
                <p className="mt-2 text-sm text-sand-800">Accommodation: {accommodationLabel}</p>
                {people.length > 0 ? (
                  <p className="mt-2 text-sm text-sand-800">
                    Adults {ageCounts.adults} • Teens {ageCounts.teens} • Children {ageCounts.children}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {people.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-sand-300 bg-white/70 px-5 py-8 text-center">
            <p className="font-semibold text-ink">Your invoice will appear here.</p>
            <p className="mt-2 text-sm text-sand-700">
              Add a person, choose meals, and select an accommodation option to see the full cost breakdown.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {people.map((person, index) => {
              const personName = "displayName" in person ? person.displayName : person.name;
              const mealsSubtotal = person.selectedMeals.reduce((sum, meal) => sum + meal.price, 0);
              const tentSubtotal =
                isTentType(person.tentType) && TENT_PRICING[person.tentType]
                  ? TENT_PRICING[person.tentType].price
                  : person.total - mealsSubtotal;

              return (
                <article
                  key={`${personName}-${index}`}
                  className="invoice-person-card rounded-[24px] border border-sand-200 bg-white px-5 py-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-ink">{personName}</p>
                      <p className="mt-1 text-sm text-sand-700">{person.ageLabel}</p>
                    </div>
                    <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                      {formatCurrency(person.total)}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-sand-800">
                    {person.selectedMeals.length > 0 ? (
                      person.selectedMeals.map((meal) => (
                        <div key={meal.key} className="flex items-center justify-between gap-4">
                          <span>{meal.label}</span>
                          <span>{formatCurrency(meal.price)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <span>No meals selected</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span>{person.tentLabel}</span>
                      <span>{formatCurrency(tentSubtotal)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="invoice-total-card rounded-[24px] border border-brand-200 bg-brand-50 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Grand total
              </p>
              <p className="mt-1 text-sm text-brand-700">
                Meals and accommodation combined for all people covered.
              </p>
            </div>
            <p className="font-display text-3xl font-semibold text-brand-800">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
