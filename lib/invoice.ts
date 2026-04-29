import { formatCurrency, formatDateTime } from "@/lib/format";
import { calculateAgeCounts } from "@/lib/pricing";
import type { InvoiceSummary, SubmissionPayload } from "@/types/registration";

interface InvoiceTextOptions {
  reference?: string;
  submittedAt?: string;
  payerName: string;
  phone: string;
  email: string;
  church: string;
  summary: InvoiceSummary | SubmissionPayload;
}

function isSubmissionPayload(
  summary: InvoiceSummary | SubmissionPayload,
): summary is SubmissionPayload {
  return "reference" in summary;
}

export function buildInvoiceClipboardText(options: InvoiceTextOptions) {
  const { payerName, phone, email, church, summary, reference, submittedAt } = options;
  const people = isSubmissionPayload(summary)
    ? summary.people
    : summary.people.filter((person) => person.isStarted);
  const grandTotal = isSubmissionPayload(summary) ? summary.total : summary.grandTotal;
  const accommodationLabel = isSubmissionPayload(summary)
    ? summary.accommodationLabel
    : summary.accommodationLabel;
  const ageCounts = calculateAgeCounts(people);
  const activeAgeTotal =
    ageCounts.age3To9Count +
    ageCounts.age10To15Count +
    ageCounts.age16To20Count +
    ageCounts.adultCount;
  const otherAgeCount = Math.max(0, people.length - activeAgeTotal);
  const ageRangeSummary = `Ages 3-9: ${ageCounts.age3To9Count} | Ages 10-15: ${ageCounts.age10To15Count} | Ages 16-20: ${ageCounts.age16To20Count} | Adults 20+: ${ageCounts.adultCount}${
    otherAgeCount > 0 ? ` | Other: ${otherAgeCount}` : ""
  }`;
  const resolvedReference = reference ?? (isSubmissionPayload(summary) ? summary.reference : undefined);
  const resolvedSubmittedAt =
    submittedAt ?? (isSubmissionPayload(summary) ? summary.submittedAt : undefined);

  const sections = [
    "Camp Registration Invoice",
    resolvedReference ? `Reference: ${resolvedReference}` : null,
    resolvedSubmittedAt ? `Date: ${formatDateTime(resolvedSubmittedAt)}` : null,
    `Payer: ${payerName}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Church: ${church}`,
    `Accommodation: ${accommodationLabel}`,
    ageRangeSummary,
    "",
    ...people.flatMap((person) => {
      const personName = "displayName" in person ? person.displayName : person.name;
      const tentCost =
        person.total - person.selectedMeals.reduce((sum, meal) => sum + meal.price, 0);
      const lines = [
        `${personName} (${person.ageLabel})`,
        ...person.selectedMeals.map((meal) => `  - ${meal.label}: ${formatCurrency(meal.price)}`),
        `  - ${person.tentLabel}: ${formatCurrency(tentCost)}`,
        `  - Person total: ${formatCurrency(person.total)}`,
        "",
      ];

      return lines;
    }),
    `Grand total: ${formatCurrency(grandTotal)}`,
  ].filter(Boolean);

  return sections.join("\n");
}
