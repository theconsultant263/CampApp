import { z } from "zod";

import {
  ACCEPTED_AGE_GROUPS,
  CHURCH_OPTIONS,
  MEAL_KEYS,
  TENT_TYPES,
  type RegistrationFormValues,
} from "@/types/registration";
import { createEmptyPerson } from "@/lib/pricing";

const mealsSchema = z.object(
  Object.fromEntries(MEAL_KEYS.map((mealKey) => [mealKey, z.boolean()])) as Record<
    (typeof MEAL_KEYS)[number],
    z.ZodBoolean
  >,
);

const personSchema = z.object({
  name: z.string().trim().min(1, "Full name is required."),
  ageGroup: z
    .union([z.enum(ACCEPTED_AGE_GROUPS), z.literal("")])
    .refine((value) => value !== "", "Choose an age group."),
  meals: mealsSchema,
});

export const registrationSchema = z
  .object({
    church: z
      .union([z.enum(CHURCH_OPTIONS), z.literal("")])
      .refine((value) => value !== "", "Please choose a church."),
    otherChurch: z.string().default(""),
    payerName: z.string().trim().min(1, "Primary payer full name is required."),
    phone: z.string().trim().min(7, "Enter a valid phone number."),
    email: z.string().trim().email("Enter a valid email address."),
    accommodationType: z
      .union([z.enum(TENT_TYPES), z.literal("")])
      .refine((value) => value !== "", "Choose an accommodation option for this invoice."),
    requestExhibition: z.boolean().default(false),
    exhibitionDescription: z.string().default(""),
    honeypot: z.string().max(0).or(z.literal("")).default(""),
    people: z.array(personSchema).min(1, "Add at least one person."),
  })
  .superRefine((values, ctx) => {
    if (values.church === "Other" && values.otherChurch.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherChurch"],
        message: "Enter the church name.",
      });
    }

    if (values.requestExhibition && values.exhibitionDescription.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["exhibitionDescription"],
        message: "Describe the exhibition stand you would like to present.",
      });
    }
  });

export type ParsedRegistrationValues = z.infer<typeof registrationSchema>;

export function createDefaultRegistrationValues(): RegistrationFormValues {
  return {
    church: "",
    otherChurch: "",
    payerName: "",
    phone: "",
    email: "",
    accommodationType: "",
    requestExhibition: false,
    exhibitionDescription: "",
    honeypot: "",
    people: [createEmptyPerson()],
  };
}
