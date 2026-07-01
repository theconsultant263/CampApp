"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useFieldArray, useForm } from "react-hook-form";

import { InvoicePreview } from "@/components/invoice-preview";
import { PersonCard } from "@/components/person-card";
import { SectionCard } from "@/components/section-card";
import {
  ADMIN_EMAIL,
  CAMP_DATES_LABEL,
  CAMP_LOCATION,
  CAMP_NAME,
  CAMP_START_ISO,
  CAMP_THEME,
  PAYMENT_DEADLINE_LABEL,
  REGISTRATION_CLOSED_MESSAGE,
  REGISTRATION_IS_CLOSED,
} from "@/lib/camp-details";
import { formatCurrency } from "@/lib/format";
import {
  TENT_PRICING,
  calculateInvoiceSummary,
  createEmptyPerson,
  resolveChurchName,
} from "@/lib/pricing";
import { createDefaultRegistrationValues, registrationSchema } from "@/lib/schema";
import type {
  RegistrationFormValues,
  SubmissionApiResponse,
  SubmissionPayload,
  TentType,
} from "@/types/registration";
import { CHURCH_OPTIONS } from "@/types/registration";

const CLIENT_SUBMISSION_TIMEOUT_MS = 30_000;

async function readSubmissionResponse(response: Response): Promise<SubmissionApiResponse> {
  const text = await response.text();

  if (!text) {
    return {
      success: false,
      error: "The registration server returned an empty response. Please try again.",
    };
  }

  try {
    return JSON.parse(text) as SubmissionApiResponse;
  } catch {
    return {
      success: false,
      error: "The registration server returned an unexpected response. Please try again.",
    };
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || /abort|timeout/i.test(error.message));
}

function getSubmitErrorMessage(error: unknown) {
  if (isAbortError(error)) {
    return "The registration is taking longer than expected. Please wait a minute, check whether the confirmation email or sheet entry arrived, and try again only if it is missing.";
  }

  if (error instanceof TypeError && /failed to fetch|load failed|network/i.test(error.message)) {
    return "We could not reach the registration server. Please check your connection and try again.";
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong while submitting. Please try again.";
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  status: "counting" | "started";
}

const COUNTDOWN_UNITS: Array<{
  key: keyof Omit<CountdownParts, "status">;
  label: string;
}> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

const MUSIC_LINEUP = [
  {
    name: "Camp Hope: Hiram Koopmann",
    detail: "Cape Town saxophonist will open Camp.",
  },
  {
    name: "The Gumbo's",
    detail: "Husband and wife vocal duo.",
  },
  {
    name: "Church @ 33 Praise Team",
    detail: "Leading congregational praise and worship.",
  },
  {
    name: "The Tombs Family",
    detail: "A family in service.",
  },
];

const POSTERS = [
  {
    src: "/posters/camp-meeting-speakers.jpeg",
    alt: "Camp Hope Camp Meeting 2026 speaker poster",
    title: "Camp Meeting 2026",
    width: 1079,
    height: 1080,
  },
  {
    src: "/posters/voices-of-worship.jpeg",
    alt: "Voices of Worship poster for Camp Hope 2026",
    title: "Voices of Worship",
    width: 1111,
    height: 1280,
  },
  {
    src: "/posters/faith-to-follow-afm.jpeg",
    alt: "Faith to Follow AFM and Abundant Life camp program poster",
    title: "Faith to Follow",
    width: 1290,
    height: 1465,
  },
];

function getCountdownParts(): CountdownParts {
  const remainingMilliseconds = new Date(CAMP_START_ISO).getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(remainingMilliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    status: remainingMilliseconds <= 0 ? "started" : "counting",
  };
}

function formatCountdownValue(value: number, key: keyof Omit<CountdownParts, "status">) {
  if (key === "days") {
    return value.toString();
  }

  return value.toString().padStart(2, "0");
}

function CampCountdown() {
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdownParts());

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="print-hidden mb-5 rounded-[24px] border border-brand-200 bg-ink px-4 py-4 text-sand-50 shadow-panel sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sand-200">
            {countdown?.status === "started" ? "Camp Meeting is underway" : "Camp opens in"}
          </p>
          <p className="font-display mt-1 text-2xl font-semibold sm:text-3xl">
            {CAMP_DATES_LABEL}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Countdown to Camp Hope">
          {COUNTDOWN_UNITS.map(({ key, label }) => (
            <div
              key={key}
              className="min-w-0 rounded-2xl border border-sand-50/15 bg-white/10 px-3 py-3 text-center"
            >
              <span className="font-display block text-2xl font-semibold leading-none sm:text-3xl">
                {countdown ? formatCountdownValue(countdown[key], key) : "--"}
              </span>
              <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-sand-200 sm:text-xs">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FinalStageContentProps {
  closedSubmitMessage: string | null;
  onClosedSubmit: () => void;
}

function FinalStageContent({
  closedSubmitMessage,
  onClosedSubmit,
}: FinalStageContentProps) {
  return (
    <div className="print-hidden grid gap-6 lg:gap-8">
      <div id="registration-start" className="scroll-mt-8">
        <SectionCard
          title="Registration is now closed"
          description="See you at Camp Meeting. Please use the details below for final payments and admin follow-up."
          className="border-brand-200"
        >
          <div className="space-y-6">
            <div className="rounded-[24px] border border-brand-200 bg-brand-50/80 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Final registration status
              </p>
              <p className="font-display mt-2 text-2xl font-semibold text-ink">
                {REGISTRATION_CLOSED_MESSAGE}
              </p>
              <p className="mt-2 text-sm leading-6 text-sand-800">
                If you still need help with an existing registration or payment, contact the admin
                team at{" "}
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4"
                >
                  {ADMIN_EMAIL}
                </a>
                .
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="border-l-2 border-brand-300 pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Payments
                </p>
                <p className="mt-2 font-semibold text-ink">
                  Settle all outstanding payments before {PAYMENT_DEADLINE_LABEL}.
                </p>
              </div>
              <div className="border-l-2 border-brand-300 pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Admin email
                </p>
                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="mt-2 block break-words font-semibold text-ink underline decoration-brand-300 underline-offset-4"
                >
                  {ADMIN_EMAIL}
                </a>
              </div>
              <div className="border-l-2 border-brand-300 pl-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Camp details
                </p>
                <p className="mt-2 font-semibold text-ink">{CAMP_DATES_LABEL}</p>
                <p className="text-sm text-sand-700">{CAMP_LOCATION}</p>
              </div>
            </div>

            <form
              className="flex flex-col gap-3 border-t border-sand-200 pt-5 sm:flex-row sm:items-center sm:justify-between"
              onSubmit={(event) => {
                event.preventDefault();
                onClosedSubmit();
              }}
            >
              <p className="text-sm leading-6 text-sand-800">
                Pressing submit now will show the closed registration notice.
              </p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
              >
                Submit registration
              </button>
            </form>

            {closedSubmitMessage ? (
              <div
                className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800"
                role="status"
                aria-live="polite"
              >
                {closedSubmitMessage}
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <section className="panel-surface p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Voices of worship
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-ink sm:text-[1.95rem]">
            Music and worship
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {MUSIC_LINEUP.map((item) => (
            <div key={item.name} className="border-l-2 border-sand-300 pl-4">
              <h3 className="font-display text-xl font-semibold text-ink">{item.name}</h3>
              <p className="mt-1 text-sm leading-6 text-sand-800">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-surface p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Speaker profile
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-ink">
              Ps. John Nixon, Jr.
            </h2>
            <p className="mt-2 text-sm font-semibold text-brand-800">
              Vice President for Pastoral Ministries, Potomac Conference
            </p>
          </div>
          <div className="space-y-4 text-sm leading-6 text-sand-800">
            <p>
              Ps. Nixon is a seasoned minister and leader whose ministry has been marked by
              pastoral excellence, careful leadership, and a heart for service. He received a
              Bachelor of Arts in Theology from Oakwood University, then earned a Master of
              Divinity in 2004 and a Doctor of Ministry in 2013 from Andrews University.
            </p>
            <p>
              Before his election as vice president for Pastoral Ministries, he served as
              Potomac&apos;s associate director for Pastoral Ministries for the North. His leadership
              focus is supporting pastors and congregations with a shepherd&apos;s heart while
              championing the mission of Christ in the community.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-surface p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Posters
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-ink sm:text-[1.95rem]">
            Camp Meeting updates
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {POSTERS.map((poster, index) => (
            <figure key={poster.src} className="min-w-0">
              <Image
                src={poster.src}
                alt={poster.alt}
                width={poster.width}
                height={poster.height}
                sizes="(min-width: 768px) 33vw, 100vw"
                priority={index === 0}
                className="h-auto w-full rounded-[20px] border border-sand-200 object-cover shadow-highlight"
              />
              <figcaption className="mt-3 text-sm font-semibold text-ink">
                {poster.title}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CampRegistrationPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPayload, setSubmittedPayload] = useState<SubmissionPayload | null>(null);
  const [closedSubmitMessage, setClosedSubmitMessage] = useState<string | null>(null);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: createDefaultRegistrationValues(),
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "people",
  });

  const watchedValues = form.watch();
  const invoiceSummary = calculateInvoiceSummary(watchedValues);
  const resolvedChurch = watchedValues.church
    ? resolveChurchName(watchedValues.church, watchedValues.otherChurch)
    : "";
  const isSubmitting = form.formState.isSubmitting;

  const handleAddPerson = async () => {
    const hasBlankName = form.getValues("people").some((person) => person.name.trim().length === 0);

    if (hasBlankName) {
      await form.trigger("people");
      return;
    }

    append(createEmptyPerson());
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    if (REGISTRATION_IS_CLOSED) {
      setSubmitError(REGISTRATION_CLOSED_MESSAGE);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_SUBMISSION_TIMEOUT_MS);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(values),
        signal: controller.signal,
      });

      const result = await readSubmissionResponse(response);

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || result.message || "Unable to submit registration.");
      }

      setSubmittedPayload(result.data);
      form.reset(createDefaultRegistrationValues());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(getSubmitErrorMessage(error));
    } finally {
      window.clearTimeout(timeout);
    }
  });

  if (isSubmitting && !submittedPayload && !REGISTRATION_IS_CLOSED) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6">
        <section className="panel-surface w-full p-6 text-center sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Processing registration
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Saving your registration
          </h1>
          <p className="mt-3 text-sm leading-6 text-sand-800">
            Please keep this tab open. We are saving the registration to Google Sheets and
            preparing the invoice email queue.
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-sand-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-sand-700">
            This can take a few seconds on a slow connection.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <CampCountdown />

      <section className="panel-surface print-hidden mb-8 overflow-hidden px-6 py-10 text-center sm:px-8 sm:py-12 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
          {CAMP_NAME}
        </p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
          Camp Hope 2026 Camp Meeting
        </h1>
        <div className="mt-5 flex flex-col items-center gap-4">
          <p className="rounded-full border border-brand-200 bg-brand-50 px-6 py-2 text-base font-semibold tracking-[0.12em] text-brand-800 shadow-highlight sm:text-lg">
            {CAMP_THEME}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-sand-800">
            <span className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2">
              {CAMP_DATES_LABEL}
            </span>
            <span className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2">
              {CAMP_LOCATION}
            </span>
          </div>
        </div>
      </section>

      {REGISTRATION_IS_CLOSED ? (
        <FinalStageContent
          closedSubmitMessage={closedSubmitMessage}
          onClosedSubmit={() => setClosedSubmitMessage(REGISTRATION_CLOSED_MESSAGE)}
        />
      ) : submittedPayload ? (
        <div className="grid gap-6">
          <SectionCard
            title="Registration received"
            description="The registration has been saved and the invoice email flow has been queued."
            className="print-hidden border-brand-200"
          >
            <div className="flex flex-col gap-5 rounded-[24px] border border-brand-200 bg-brand-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Submission reference
                </p>
                <p className="font-display mt-2 text-2xl font-semibold text-brand-800">
                  {submittedPayload.reference}
                </p>
                <p className="mt-2 text-sm text-brand-700">
                  Keep this reference with the invoice for your records. The email can take a few
                  minutes to arrive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmittedPayload(null);
                  setSubmitError(null);
                  form.reset(createDefaultRegistrationValues());
                }}
                className="print-hidden inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
              >
                Start a new registration
              </button>
            </div>
          </SectionCard>

          <InvoicePreview
            title="Invoice confirmation"
            subtitle="This is the same summary queued for the registrant email address and the admin inbox."
            payerName={submittedPayload.payerName}
            phone={submittedPayload.phone}
            email={submittedPayload.email}
            church={submittedPayload.resolvedChurch}
            summary={submittedPayload}
          />
        </div>
      ) : (
        <div className="print-invoice-layout grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="print-hidden space-y-6">
            <SectionCard
              title="Registration form"
              description="Collect the primary payer details, choose one accommodation option for the whole invoice, and list each person being covered."
            >
              <form
                id="registration-form"
                className="space-y-8"
                onSubmit={onSubmit}
                aria-busy={isSubmitting}
                noValidate
              >
                <div className="rounded-[24px] border border-brand-200 bg-brand-50/80 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                        Registration help
                      </p>
                      <h3 className="font-display mt-2 text-xl font-semibold text-ink">
                        Unclear on how to register?
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-800">
                        Read the frequently asked questions first, then come back here to choose
                        your church and complete the form.
                      </p>
                    </div>
                    <Link
                      href="/faqs"
                      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
                    >
                      View FAQs
                    </Link>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div id="registration-start" className="scroll-mt-8 sm:col-span-2">
                    <label className="field-label" htmlFor="church">
                      Church
                    </label>
                    <select id="church" className="input-shell" {...form.register("church")}>
                      <option value="">Select a church</option>
                      {CHURCH_OPTIONS.map((church) => (
                        <option key={church} value={church}>
                          {church}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.church?.message ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.church.message}
                      </p>
                    ) : null}
                  </div>

                  {watchedValues.church === "Other" ? (
                    <div className="sm:col-span-2">
                      <label className="field-label" htmlFor="otherChurch">
                        Other church name
                      </label>
                      <input
                        id="otherChurch"
                        className="input-shell"
                        placeholder="Enter the church name"
                        {...form.register("otherChurch")}
                      />
                      {form.formState.errors.otherChurch?.message ? (
                        <p className="field-error" role="alert">
                          {form.formState.errors.otherChurch.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <label className="field-label" htmlFor="payerName">
                      Primary payer full name
                    </label>
                    <input
                      id="payerName"
                      className="input-shell"
                      placeholder="Enter the payer's full name"
                      {...form.register("payerName")}
                    />
                    {form.formState.errors.payerName?.message ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.payerName.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="field-label" htmlFor="email">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="input-shell"
                      placeholder="Enter the invoice email address"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email?.message ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.email.message}
                      </p>
                      ) : null}
                  </div>

                  <div>
                    <label className="field-label" htmlFor="phone">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="input-shell"
                      placeholder="Enter the payer's phone number"
                      {...form.register("phone")}
                    />
                    {form.formState.errors.phone?.message ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.phone.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="field-label mb-1">Accommodation option for this invoice</label>
                    <p className="mb-3 text-sm text-sand-700">
                      Everyone on this invoice must share the same accommodation type. If your
                      group mixes day visitors and campers, submit separate invoices.
                    </p>
                    <p className="mb-4 text-sm text-sand-700">
                      If you select <span className="font-semibold text-ink">Camp tent</span>,
                      please note that all tent spaces will be fully allocated to help us steward
                      accommodation fairly for everyone attending. Individual registrations
                      choosing this option should expect to share a two-person tent with another
                      camper, as we are unable to reserve unoccupied tent spaces.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(Object.entries(TENT_PRICING) as Array<
                        [TentType, (typeof TENT_PRICING)[TentType]]
                      >).map(([tentType, config]) => (
                        <label key={tentType} className="block cursor-pointer">
                          <input
                            type="radio"
                            value={tentType}
                            className="peer sr-only"
                            {...form.register("accommodationType")}
                          />
                          <div className="rounded-2xl border border-sand-200 bg-white px-4 py-4 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:shadow-highlight hover:border-brand-300">
                            <p className="font-semibold text-ink">{config.label}</p>
                            <p className="mt-1 text-sm text-sand-700">
                              {config.price === 0
                                ? "No accommodation fee"
                                : `${formatCurrency(config.price)} per person`}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.accommodationType?.message ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.accommodationType.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <div className="rounded-[24px] border border-brand-200 bg-brand-50/70 p-5 sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                        Camp Hope Community Place
                      </p>
                      <p className="mt-3 text-sm leading-6 text-sand-800">
                        Camp Hope Community Place on Sunday, 9 August 2026 is open not only to
                        ministry initiatives, but also to businesses, professional services,
                        creative work, and personal passions that can encourage others. If you
                        would like to share what you are doing in a way that inspires attendees
                        and creates meaningful connections, you are welcome to request a stand.
                      </p>
                      <p className="mt-2 text-sm text-sand-700">
                        This will follow a similar spirit to ASI conventions, where Adventist
                        Laymen&apos;s Services &amp; Industries brings together ministry, enterprise,
                        and service. All exhibitions remain subject to camp administration
                        approval.
                      </p>

                      <label className="mt-4 flex items-start gap-3 rounded-[20px] border border-brand-200 bg-white px-4 py-4">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-sand-300 text-brand-700 focus:ring-brand-400"
                          {...form.register("requestExhibition")}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-ink">
                            Request an exhibition stand
                          </span>
                          <span className="mt-1 block text-sm text-sand-700">
                            Leave this unticked if you are not requesting exhibition space.
                          </span>
                        </span>
                      </label>

                      {watchedValues.requestExhibition ? (
                        <div className="mt-5">
                          <label className="field-label" htmlFor="exhibitionDescription">
                            Stand description
                          </label>
                          <textarea
                            id="exhibitionDescription"
                            rows={5}
                            className="input-shell min-h-[140px]"
                            placeholder="Describe the ministry, business, creative work, passion project, product, or service you plan to exhibit."
                            {...form.register("exhibitionDescription")}
                          />
                          <p className="field-hint">
                            Include enough detail for camp administration to review the request.
                          </p>
                          {form.formState.errors.exhibitionDescription?.message ? (
                            <p className="field-error" role="alert">
                              {form.formState.errors.exhibitionDescription.message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Leave this field blank</label>
                  <input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    {...form.register("honeypot")}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-semibold text-ink">
                        People included
                      </h3>
                      <p className="mt-2 text-sm text-sand-800">
                        Add everyone being paid for in this single registration.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPerson}
                      className="print-hidden inline-flex items-center justify-center rounded-full border border-brand-300 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100"
                    >
                      Add another person
                    </button>
                  </div>

                  {typeof form.formState.errors.people?.message === "string" ? (
                    <p className="field-error" role="alert">
                      {form.formState.errors.people.message}
                    </p>
                  ) : null}

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <PersonCard
                        key={field.id}
                        index={index}
                        canRemove={fields.length > 1}
                        onRemove={() => remove(index)}
                        register={form.register}
                        errors={form.formState.errors}
                      />
                    ))}
                  </div>
                </div>

                {submitError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {submitError}
                  </div>
                ) : null}

                {isSubmitting ? (
                  <div
                    className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
                    role="status"
                    aria-live="polite"
                  >
                    Saving your registration and preparing your confirmation. Please keep this tab
                    open.
                  </div>
                ) : null}

                <div className="print-hidden flex justify-end border-t border-sand-200 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Submitting registration..." : "Submit registration"}
                  </button>
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="invoice-sidebar xl:sticky xl:top-8 xl:self-start">
            <InvoicePreview
              title="Invoice summary"
              subtitle="Review the live breakdown before submitting. Totals update automatically as you make selections."
              payerName={watchedValues.payerName}
              phone={watchedValues.phone}
              email={watchedValues.email}
              church={resolvedChurch}
              summary={invoiceSummary}
            />
          </div>
        </div>
      )}
    </div>
  );
}
