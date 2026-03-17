import type {
  AgeGroup,
  AgeGroupField,
  InvoicePerson,
  InvoiceSummary,
  MealKey,
  MealTallies,
  Meals,
  PersonFormValue,
  RegistrationFormValues,
  SelectedMealLine,
  TentType,
  TentTypeField,
} from "@/types/registration";

export const MEAL_PRICING: Record<
  MealKey,
  {
    label: string;
    price: number;
  }
> = {
  fridaySupper: {
    label: "Friday supper",
    price: 5,
  },
  saturdayBreakfast: {
    label: "Saturday breakfast",
    price: 5,
  },
  saturdayLunch: {
    label: "Saturday lunch",
    price: 8,
  },
  saturdaySupper: {
    label: "Saturday supper",
    price: 5,
  },
  sundayBreakfast: {
    label: "Sunday breakfast",
    price: 5,
  },
  sundayLunch: {
    label: "Sunday lunch",
    price: 8,
  },
  sundaySupper: {
    label: "Sunday supper",
    price: 5,
  },
  mondayBreakfast: {
    label: "Monday breakfast",
    price: 5,
  },
  mondayLunch: {
    label: "Monday lunch",
    price: 8,
  },
  mondaySupper: {
    label: "Monday supper",
    price: 5,
  },
  tuesdayBreakfast: {
    label: "Tuesday breakfast",
    price: 5,
  },
};

export const MEAL_ORDER = Object.keys(MEAL_PRICING) as MealKey[];

export const AGE_GROUP_CONFIG: Record<
  AgeGroup,
  {
    label: string;
    description: string;
  }
> = {
  adult: {
    label: "Adult",
    description: "20 and older",
  },
  teen: {
    label: "Teen",
    description: "13-19 years",
  },
  child: {
    label: "Child",
    description: "2-12 years",
  },
};

export const TENT_PRICING: Record<
  TentType,
  {
    label: string;
    price: number;
  }
> = {
  camp_tent: {
    label: "Camp tent",
    price: 20,
  },
  own_tent: {
    label: "Bringing own tent",
    price: 15,
  },
  day_visitor: {
    label: "Day visitor",
    price: 0,
  },
};

export function createEmptyMeals(): Meals {
  return {
    fridaySupper: false,
    saturdayBreakfast: false,
    saturdayLunch: false,
    saturdaySupper: false,
    sundayBreakfast: false,
    sundayLunch: false,
    sundaySupper: false,
    mondayBreakfast: false,
    mondayLunch: false,
    mondaySupper: false,
    tuesdayBreakfast: false,
  };
}

export function createEmptyPerson(): PersonFormValue {
  return {
    name: "",
    ageGroup: "",
    meals: createEmptyMeals(),
  };
}

export function createEmptyMealTallies(): MealTallies {
  return {
    fridaySupper: 0,
    saturdayBreakfast: 0,
    saturdayLunch: 0,
    saturdaySupper: 0,
    sundayBreakfast: 0,
    sundayLunch: 0,
    sundaySupper: 0,
    mondayBreakfast: 0,
    mondayLunch: 0,
    mondaySupper: 0,
    tuesdayBreakfast: 0,
  };
}

export function getSelectedMeals(meals: Meals): SelectedMealLine[] {
  return MEAL_ORDER.filter((mealKey) => meals[mealKey]).map((mealKey) => ({
    key: mealKey,
    label: MEAL_PRICING[mealKey].label,
    price: MEAL_PRICING[mealKey].price,
  }));
}

export function isTentType(value: TentTypeField): value is TentType {
  return value === "camp_tent" || value === "own_tent" || value === "day_visitor";
}

export function isAgeGroup(value: AgeGroupField): value is AgeGroup {
  return value === "adult" || value === "teen" || value === "child";
}

export function getAgeLabel(ageGroup: AgeGroupField) {
  if (!isAgeGroup(ageGroup)) {
    return "Age group not selected";
  }

  return AGE_GROUP_CONFIG[ageGroup].label;
}

export function getTentLabel(tentType: TentTypeField) {
  if (!isTentType(tentType)) {
    return "Accommodation not selected";
  }

  return TENT_PRICING[tentType].label;
}

export function calculatePersonTotal(
  person: Pick<PersonFormValue, "meals">,
  accommodationType: TentTypeField,
) {
  const mealsTotal = getSelectedMeals(person.meals).reduce(
    (sum, meal) => sum + meal.price,
    0,
  );
  const tentTotal = isTentType(accommodationType) ? TENT_PRICING[accommodationType].price : 0;

  return mealsTotal + tentTotal;
}

function isPersonStarted(person: PersonFormValue) {
  return (
    person.name.trim().length > 0 ||
    isAgeGroup(person.ageGroup) ||
    Object.values(person.meals).some(Boolean)
  );
}

export function calculateMealTallies(people: PersonFormValue[]): MealTallies {
  return people.reduce((tallies, person) => {
    MEAL_ORDER.forEach((mealKey) => {
      if (person.meals[mealKey]) {
        tallies[mealKey] += 1;
      }
    });

    return tallies;
  }, createEmptyMealTallies());
}

export function calculateInvoiceSummary(values: RegistrationFormValues): InvoiceSummary {
  const accommodationLabel = getTentLabel(values.accommodationType);
  const people = values.people.map((person, index) => ({
    name: person.name,
    displayName: person.name.trim() || `Person ${index + 1}`,
    ageGroup: person.ageGroup,
    ageLabel: getAgeLabel(person.ageGroup),
    meals: person.meals,
    tentType: values.accommodationType,
    tentLabel: accommodationLabel,
    selectedMeals: getSelectedMeals(person.meals),
    total: calculatePersonTotal(person, values.accommodationType),
    isStarted: isPersonStarted(person),
  }));

  return {
    people,
    startedPeopleCount: people.filter((person) => person.isStarted).length,
    grandTotal: people.reduce((sum, person) => sum + person.total, 0),
    accommodationType: values.accommodationType,
    accommodationLabel,
    mealTallies: calculateMealTallies(values.people),
  };
}

export function resolveChurchName(church: string, otherChurch?: string) {
  if (church === "Other") {
    return otherChurch?.trim() || "Other";
  }

  return church;
}

export function toInvoicePeople(values: RegistrationFormValues): InvoicePerson[] {
  if (!isTentType(values.accommodationType)) {
    throw new Error("Missing accommodation selection for this invoice.");
  }

  const accommodationType = values.accommodationType;

  return values.people.map((person) => {
    if (!isAgeGroup(person.ageGroup)) {
      throw new Error(`Missing age group for ${person.name || "a person"}.`);
    }

    return {
      name: person.name.trim(),
      ageGroup: person.ageGroup,
      ageLabel: AGE_GROUP_CONFIG[person.ageGroup].label,
      meals: person.meals,
      tentType: accommodationType,
      tentLabel: TENT_PRICING[accommodationType].label,
      selectedMeals: getSelectedMeals(person.meals),
      total: calculatePersonTotal(person, accommodationType),
    };
  });
}
