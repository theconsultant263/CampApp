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
        body: JSON.stringify(values),
      });

      const result = (await response.json()) as SubmissionApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || result.message || "Unable to submit registration.");
      }

      setSubmittedPayload(result.data);
      form.reset(createDefaultRegistrationValues());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting. Please try again.",
      );
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
        <p className="mt-4 text-lg font-medium text-sand-800 sm:text-xl">Faith to Follow</p>
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
              <form className="space-y-8" onSubmit={onSubmit} noValidate>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
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

                  <div className="sm:col-span-2">
                    <label className="field-label mb-1">Accommodation option for this invoice</label>
                    <p className="mb-3 text-sm text-sand-700">
                      Everyone on this invoice must share the same accommodation type. If your
                      group mixes day visitors and campers, submit separate invoices.
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

                <div className="print-hidden flex flex-col gap-3 border-t border-sand-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-sand-800">
                    Submission emails and Google Sheet storage happen after successful form
                    validation.
                  </p>
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
