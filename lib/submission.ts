import {
  calculateInvoiceSummary,
  isTentType,
  resolveChurchName,
  toInvoicePeople,
} from "@/lib/pricing";
import type { ParsedRegistrationValues } from "@/lib/schema";
import type { SubmissionPayload } from "@/types/registration";

export function createSubmissionReference() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `CAMP-${datePart}-${randomPart}`;
}

export function buildSubmissionPayload(
  values: ParsedRegistrationValues,
  options?: {
    reference?: string;
    submittedAt?: string;
  },
): SubmissionPayload {
  if (!isTentType(values.accommodationType)) {
    throw new Error("Accommodation type is required for this invoice.");
  }

  const invoicePeople = toInvoicePeople(values);
  const invoiceSummary = calculateInvoiceSummary(values);
  const ageCounts = invoicePeople.reduce(
    (counts, person) => {
      if (person.ageGroup === "adult") {
        counts.adultCount += 1;
      }

      if (person.ageGroup === "teen") {
        counts.teenCount += 1;
      }

      if (person.ageGroup === "child") {
        counts.childCount += 1;
      }

      return counts;
    },
    {
      adultCount: 0,
      teenCount: 0,
      childCount: 0,
    },
  );

  return {
    reference: options?.reference ?? createSubmissionReference(),
    submittedAt: options?.submittedAt ?? new Date().toISOString(),
    church: values.church,
    otherChurch: values.otherChurch.trim(),
    resolvedChurch: resolveChurchName(values.church, values.otherChurch),
    payerName: values.payerName.trim(),
    email: values.email.trim(),
    accommodationType: values.accommodationType,
    accommodationLabel: invoiceSummary.accommodationLabel,
    people: invoicePeople,
    peopleCount: invoicePeople.length,
    adultCount: ageCounts.adultCount,
    teenCount: ageCounts.teenCount,
    childCount: ageCounts.childCount,
    mealTallies: invoiceSummary.mealTallies,
    total: invoiceSummary.grandTotal,
  };
}
