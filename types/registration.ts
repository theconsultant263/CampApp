export const CHURCH_OPTIONS = [
  "33 Victoria Church",
  "Arcadia SDA Church",
  "Hillside Avenue SDA Church",
  "Blessed Hope SDA Church",
  "Mutare Sanctuary SDA Church",
  "Bulawayo Church",
  "Other",
] as const;

export const MEAL_KEYS = [
  "fridaySupper",
  "saturdayBreakfast",
  "saturdayLunch",
  "saturdaySupper",
  "sundayBreakfast",
  "sundayLunch",
  "sundaySupper",
  "mondayBreakfast",
  "mondayLunch",
  "mondaySupper",
  "tuesdayBreakfast",
] as const;

export const TENT_TYPES = ["camp_tent", "own_tent", "day_visitor"] as const;
export const AGE_GROUPS = ["age_3_9", "age_10_15", "age_16_20", "adult"] as const;
export const LEGACY_AGE_GROUPS = ["teen", "child"] as const;
export const ACCEPTED_AGE_GROUPS = [
  "age_3_9",
  "age_10_15",
  "age_16_20",
  "adult",
  "teen",
  "child",
] as const;

export type ChurchOption = (typeof CHURCH_OPTIONS)[number];
export type MealKey = (typeof MEAL_KEYS)[number];
export type TentType = (typeof TENT_TYPES)[number];
export type TentTypeField = TentType | "";
export type ActiveAgeGroup = (typeof AGE_GROUPS)[number];
export type AgeGroup = (typeof ACCEPTED_AGE_GROUPS)[number];
export type AgeGroupField = AgeGroup | "";

export type Meals = Record<MealKey, boolean>;
export type MealTallies = Record<MealKey, number>;

export interface PersonFormValue {
  name: string;
  ageGroup: AgeGroupField;
  meals: Meals;
}

export interface RegistrationFormValues {
  church: ChurchOption | "";
  otherChurch: string;
  payerName: string;
  phone: string;
  email: string;
  accommodationType: TentTypeField;
  requestExhibition: boolean;
  exhibitionDescription: string;
  people: PersonFormValue[];
  honeypot: string;
}

export interface SelectedMealLine {
  key: MealKey;
  label: string;
  price: number;
}

export interface InvoicePerson {
  name: string;
  ageGroup: AgeGroup;
  ageLabel: string;
  meals: Meals;
  tentType: TentType;
  tentLabel: string;
  selectedMeals: SelectedMealLine[];
  total: number;
}

export interface InvoiceSummary {
  people: Array<
    Omit<InvoicePerson, "tentType" | "ageGroup"> & {
      ageGroup: AgeGroupField;
      tentType: TentTypeField;
      displayName: string;
      isStarted: boolean;
    }
  >;
  grandTotal: number;
  startedPeopleCount: number;
  accommodationType: TentTypeField;
  accommodationLabel: string;
  mealTallies: MealTallies;
}

export interface SubmissionPayload {
  reference: string;
  submittedAt: string;
  church: string;
  otherChurch: string;
  resolvedChurch: string;
  payerName: string;
  phone: string;
  email: string;
  accommodationType: TentType;
  accommodationLabel: string;
  requestExhibition: boolean;
  exhibitionDescription: string;
  people: InvoicePerson[];
  peopleCount: number;
  adultCount: number;
  teenCount: number;
  childCount: number;
  age3To9Count: number;
  age10To15Count: number;
  age16To20Count: number;
  mealTallies: MealTallies;
  total: number;
}

export interface SubmissionApiResponse {
  success: boolean;
  message?: string;
  data?: SubmissionPayload;
  error?: string;
}
