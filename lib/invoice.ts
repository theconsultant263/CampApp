import { formatCurrency, formatDateTime } from "@/lib/format";
import type { InvoiceSummary, SubmissionPayload } from "@/types/registration";

interface InvoiceTextOptions {
  reference?: string;
  submittedAt?: string;
  payerName: string;
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
  const { payerName, email, church, summary, reference, submittedAt } = options;
  const people = isSubmissionPayload(summary) ? summary.people : summary.people;
  const grandTotal = isSubmissionPayload(summary) ? summary.total : summary.grandTotal;
  const accommodationLabel = isSubmissionPayload(summary)
    ? summary.accommodationLabel
    : summary.accommodationLabel;
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
  const resolvedReference = reference ?? (isSubmissionPayload(summary) ? summary.reference : undefined);
  const resolvedSubmittedAt =
    submittedAt ?? (isSubmissionPayload(summary) ? summary.submittedAt : undefined);

  const sections = [
    "Camp Registration Invoice",
    resolvedReference ? `Reference: ${resolvedReference}` : null,
    resolvedSubmittedAt ? `Date: ${formatDateTime(resolvedSubmittedAt)}` : null,
    `Payer: ${payerName}`,
    `Email: ${email}`,
    `Church: ${church}`,
    `Accommodation: ${accommodationLabel}`,
    `Adults: ${ageCounts.adults} | Teens: ${ageCounts.teens} | Children: ${ageCounts.children}`,
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
