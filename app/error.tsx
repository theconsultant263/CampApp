"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <section className="panel-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Page recovery
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
          The registration page hit a display problem.
        </h1>
        <p className="mt-3 text-sm leading-6 text-sand-800">
          If this happened after pressing submit, please check whether the registration reached
          the sheet or confirmation email before submitting again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full border border-sand-300 px-5 py-3 text-sm font-semibold text-sand-800 transition hover:border-brand-300 hover:bg-brand-50"
          >
            Reload page
          </button>
        </div>
      </section>
    </main>
  );
}
