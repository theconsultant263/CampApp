import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("panel-surface p-6 sm:p-8", className)}>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-[1.95rem]">
          {title}
        </h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-sand-800">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
