import {
  calculateAgeCounts,
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
  const ageCounts = calculateAgeCounts(invoicePeople);

  return {
    reference: options?.reference ?? createSubmissionReference(),
    submittedAt: options?.submittedAt ?? new Date().toISOString(),
    church: values.church,
    otherChurch: values.otherChurch.trim(),
    resolvedChurch: resolveChurchName(values.church, values.otherChurch),
    payerName: values.payerName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    accommodationType: values.accommodationType,
    accommodationLabel: invoiceSummary.accommodationLabel,
    requestExhibition: values.requestExhibition,
    exhibitionDescription: values.requestExhibition
      ? values.exhibitionDescription.trim()
      : "",
    people: invoicePeople,
    peopleCount: invoicePeople.length,
    adultCount: ageCounts.adultCount,
    teenCount: ageCounts.teenCount,
    childCount: ageCounts.childCount,
    age3To9Count: ageCounts.age3To9Count,
    age10To15Count: ageCounts.age10To15Count,
    age16To20Count: ageCounts.age16To20Count,
    mealTallies: invoiceSummary.mealTallies,
    total: invoiceSummary.grandTotal,
  };
}
