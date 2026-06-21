"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface RenderErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RenderErrorBoundaryState {
  hasError: boolean;
}

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Registration display error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
            <section className="panel-surface p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Display recovery
              </p>
              <h1 className="font-display mt-3 text-3xl font-semibold text-ink">
                The registration page needs to reload.
              </h1>
              <p className="mt-3 text-sm leading-6 text-sand-800">
                If you had just submitted, please check for the confirmation email or sheet entry
                before submitting again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-sand-50 transition hover:bg-brand-800"
              >
                Reload page
              </button>
            </section>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
