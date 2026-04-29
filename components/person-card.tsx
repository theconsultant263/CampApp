"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import {
  ACTIVE_AGE_GROUP_CONFIG,
  MEAL_ORDER,
  MEAL_PRICING,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import type { ActiveAgeGroup, RegistrationFormValues } from "@/types/registration";

interface PersonCardProps {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  register: UseFormRegister<RegistrationFormValues>;
  errors: FieldErrors<RegistrationFormValues>;
}

export function PersonCard({
  index,
  canRemove,
  onRemove,
  register,
  errors,
}: PersonCardProps) {
  const personError = errors.people?.[index];

  return (
    <article className="rounded-[26px] border border-sand-200 bg-sand-50/80 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand-700">
            Person {index + 1}
          </p>
          <h3 className="font-display mt-1 text-xl font-semibold text-ink">
            Registration details
          </h3>
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="print-hidden inline-flex items-center justify-center rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-sand-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Remove person
          </button>
        ) : null}
      </div>

      <div className="grid gap-6">
        <div>
          <label className="field-label" htmlFor={`people.${index}.name`}>
            Full name
          </label>
          <input
            id={`people.${index}.name`}
            className="input-shell"
            placeholder="Enter full name"
            {...register(`people.${index}.name`)}
          />
          {personError?.name?.message ? (
            <p className="field-error" role="alert">
              {personError.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="field-label mb-1">Age group</label>
          <p className="mb-3 text-sm text-sand-700">
            Choose the registrant&apos;s age range.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(ACTIVE_AGE_GROUP_CONFIG) as Array<
              [ActiveAgeGroup, (typeof ACTIVE_AGE_GROUP_CONFIG)[ActiveAgeGroup]]
            >).map(([ageGroup, config]) => (
              <label key={ageGroup} className="block cursor-pointer">
                <input
                  type="radio"
                  value={ageGroup}
                  className="peer sr-only"
                  {...register(`people.${index}.ageGroup`)}
                />
                <div className="rounded-2xl border border-sand-200 bg-white px-4 py-4 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:shadow-highlight hover:border-brand-300">
                  <p className="font-semibold text-ink">{config.label}</p>
                  <p className="mt-1 text-sm text-sand-700">{config.description}</p>
                </div>
              </label>
            ))}
          </div>
          {personError?.ageGroup?.message ? (
            <p className="field-error" role="alert">
              {personError.ageGroup.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <label className="field-label mb-1">Meals</label>
              <p className="text-sm text-sand-700">
                Select any meals this person will need from Friday night through Tuesday breakfast.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MEAL_ORDER.map((mealKey) => (
              <label key={mealKey} className="block cursor-pointer">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  {...register(`people.${index}.meals.${mealKey}`)}
                />
                <div className="rounded-2xl border border-sand-200 bg-white px-4 py-3 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:shadow-highlight hover:border-brand-300">
                  <p className="font-semibold text-ink">{MEAL_PRICING[mealKey].label}</p>
                  <p className="mt-1 text-sm text-sand-700">
                    {formatCurrency(MEAL_PRICING[mealKey].price)}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-4 text-sm text-sand-700">
            Registrants may also choose not to purchase any camp meals and instead bring their
            own food and cooking supplies.
          </p>
        </div>

      </div>
    </article>
  );
}
