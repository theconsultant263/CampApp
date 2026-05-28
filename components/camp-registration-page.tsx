"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { InvoicePreview } from "@/components/invoice-preview";
import { PersonCard } from "@/components/person-card";
import { SectionCard } from "@/components/section-card";
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

const FAQ_ITEMS = [
  {
    question: "I am unclear on how to register. What should I do first?",
    answer: [
      "Start by choosing your church, then enter the primary payer details. Choose one accommodation option for everyone on this invoice, add each person being paid for, select any meals they need, review the live invoice summary, and submit the registration.",
      "If your group has people using different accommodation types, please submit separate registrations for each accommodation type.",
    ],
  },
  {
    question: "When is Camp Hope 2026?",
    answer: [
      "Camp Hope 2026 runs from 7-11 August 2026 at Kudu Creek Farm.",
    ],
  },
  {
    question: "Who are the speakers?",
    answer: [
      "The speakers are Ps. Donnet Blake from the USA, Ps. John and April Nixon from the USA, and Ps. Sou Blose from South Africa.",
    ],
  },
  {
    question: "What is planned for ages 13-20?",
    answer: [
      "The AFM affiliate and Abundant Life South Africa team will run the camp program for ages 13-20. Their mission is to bring Abundant Life into every home in creative ways, leading young people to Jesus and equipping them to start disciple-making movements.",
      "The team will travel from Dundee and Johannesburg, South Africa, and creativity in reaching young people to follow Jesus will be central to the camp weekend.",
    ],
  },
  {
    question: "Will there be a children's program?",
    answer: [
      "Yes. The children's program is for ages 3-12, inviting children to experience following Jesus in The Army of The Lord.",
    ],
  },
  {
    question: "Can I bring my own tent?",
    answer: [
      `Yes. Choose "${TENT_PRICING.own_tent.label}" on the form. The ${formatCurrency(
        TENT_PRICING.own_tent.price,
      )} per-person camp fee still applies before any meals are selected, so three people bringing their own tent would be ${formatCurrency(
        TENT_PRICING.own_tent.price * 3,
      )} before meals.`,
      "That works out to less than $5 per person per day. The fee helps keep the camp sustainable, including running water, hot water from gas geysers, functional toilets, fires and lanterns each night, electricity for lights, and electricity for the main venues.",
    ],
  },
  {
    question: "Can I bring my own food?",
    answer: [
      "Yes. Cooking areas will be available, and campers are encouraged to bring their own food and cooking supplies if they are not purchasing camp meals.",
    ],
  },
  {
    question: "Can I exhibit a mission initiative, story, product, or service?",
    answer: [
      "Yes. On Sunday, 9 August 2026, you can request space to showcase your church or individual mission initiatives and stories from the last year, or exhibit appropriate individual business products or services.",
      "Select the exhibition option on the registration form and describe your stand. Exhibitions are subject to camp administration approval for appropriateness.",
    ],
  },
  {
    question: "What should an exhibition stand be like?",
    answer: [
      "Make it innovative, interesting, and interactive. The goal is to fast track meaningful connections and collaborations, share Together in Mission and I WILL GO experiences, and show how God is changing lives through community and national building.",
    ],
  },
  {
    question: "What if my church is not listed?",
    answer: [
      'Choose "Other" in the church list, then enter your church name in the field that appears.',
    ],
  },
] as const;

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

function getSubmitErrorMessage(error: unknown) {
  if (error instanceof TypeError && /failed to fetch|load failed|network/i.test(error.message)) {
    return "We could not reach the registration server. Please check your connection and try again.";
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong while submitting. Please try again.";
}

export function CampRegistrationPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPayload, setSubmittedPayload] = useState<SubmissionPayload | null>(null);

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

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(values),
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
    }
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="panel-surface print-hidden mb-8 overflow-hidden px-6 py-10 text-center sm:px-8 sm:py-12 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
          Camp Hope 2026
        </p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
          Camp Hope 2026 Camp Meeting Registration
        </h1>
        <div className="mt-5 flex flex-col items-center gap-4">
          <p className="rounded-full border border-brand-200 bg-brand-50 px-6 py-2 text-base font-semibold tracking-[0.12em] text-brand-800 shadow-highlight sm:text-lg">
            Faith to Follow
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-sand-800">
            <span className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2">
              7-11 August 2026
            </span>
            <span className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2">
              Kudu Creek Farm
            </span>
          </div>
        </div>
      </section>

      {submittedPayload ? (
        <div className="grid gap-6">
          <SectionCard
            title="Registration received"
            description="The registration has been saved and the invoice email flow has been handed off to Google Apps Script."
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
                  Keep this reference with the invoice for your records.
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
            subtitle="This is the same summary that is sent to the registrant email address and the admin inbox."
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
              <form id="registration-form" className="space-y-8" onSubmit={onSubmit} noValidate>
                <section
                  id="camp-faqs"
                  aria-labelledby="camp-faqs-heading"
                  className="rounded-[24px] border border-brand-200 bg-brand-50/80 p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                        Registration help
                      </p>
                      <h3
                        id="camp-faqs-heading"
                        className="font-display mt-2 text-2xl font-semibold text-ink"
                      >
                        Frequently asked questions
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-800">
                        If you are unclear on how to register, read these quick answers first.
                        When you are ready, return to the church selection and complete the form.
                      </p>
                    </div>
                    <a
                      href="#registration-start"
                      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
                    >
                      Return to registration
                    </a>
                  </div>

                  <div className="mt-6 divide-y divide-brand-200 rounded-[20px] border border-brand-200 bg-white">
                    {FAQ_ITEMS.map((item, index) => (
                      <details key={item.question} className="group px-4 py-4 sm:px-5">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                          <span className="font-semibold text-ink">{item.question}</span>
                          <span
                            aria-hidden="true"
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-200 text-lg leading-none text-brand-700 transition group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2 pr-8 text-sm leading-6 text-sand-800">
                          {item.answer.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                        {index === FAQ_ITEMS.length - 1 ? (
                          <a
                            href="#registration-start"
                            className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100"
                          >
                            Return to registration
                          </a>
                        ) : null}
                      </details>
                    ))}
                  </div>
                </section>

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

                <div className="print-hidden flex justify-end border-t border-sand-200 pt-6">
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {form.formState.isSubmitting ? "Submitting registration..." : "Submit registration"}
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
