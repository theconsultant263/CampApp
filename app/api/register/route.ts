import { NextResponse } from "next/server";

import {
  REGISTRATION_CLOSED_MESSAGE,
  REGISTRATION_IS_CLOSED,
} from "@/lib/camp-details";
import { registrationSchema } from "@/lib/schema";
import { buildSubmissionPayload } from "@/lib/submission";
import type { SubmissionApiResponse } from "@/types/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const APPS_SCRIPT_TIMEOUT_MS = 25_000;

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getAppsScriptUrl() {
  const rawUrl = process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

  if (!rawUrl) {
    return {
      error:
        "Apps Script URL is missing. Set APPS_SCRIPT_URL or NEXT_PUBLIC_APPS_SCRIPT_URL in your environment.",
    };
  }

  if (rawUrl.includes("REPLACE_WITH")) {
    return {
      error: "Apps Script URL is still using the placeholder value.",
    };
  }

  try {
    const url = new URL(rawUrl);
    const isLocalUrl = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    if (url.protocol !== "https:" && !isLocalUrl) {
      return {
        error: "Apps Script URL must use HTTPS.",
      };
    }

    return { url: url.toString() };
  } catch {
    return {
      error: "Apps Script URL is not a valid URL.",
    };
  }
}

function getUpstreamError(upstreamJson: Record<string, unknown> | null) {
  return (
    getString(upstreamJson?.message) ||
    getString(upstreamJson?.error) ||
    "Google Apps Script rejected the submission."
  );
}

function getWarnings(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const warnings = value.filter((warning): warning is string => typeof warning === "string");

  return warnings.length > 0 ? warnings : undefined;
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || /abort|timeout/i.test(error.message));
}

function getFetchErrorMessage(error: unknown) {
  if (isAbortError(error)) {
    return "The registration server is taking too long to hear back from Google Apps Script. Please wait a minute, check whether the registration reached the sheet, and try again only if it is missing.";
  }

  if (error instanceof TypeError && /fetch failed|network/i.test(error.message)) {
    return "The registration server could not reach Google Apps Script. Please verify the Apps Script deployment URL and try again.";
  }

  return error instanceof Error
    ? error.message
    : "The registration server could not reach Google Apps Script. Please try again.";
}

async function postToAppsScript(url: string, submissionPayload: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionPayload),
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverToAppsScript(url: string, submissionPayload: unknown) {
  const upstream = await postToAppsScript(url, submissionPayload);
  const upstreamText = await upstream.text();
  const upstreamJson = parseJsonResponse(upstreamText);

  if (!upstream.ok) {
    throw new Error(getUpstreamError(upstreamJson));
  }

  if (!upstreamJson) {
    throw new Error(
      "Google Apps Script returned an unexpected response. Confirm the deployment URL is the web app /exec URL with access set to Anyone.",
    );
  }

  if (upstreamJson.success !== true) {
    throw new Error(getUpstreamError(upstreamJson));
  }

  return getWarnings(upstreamJson.warnings);
}

export async function POST(request: Request) {
  try {
    if (REGISTRATION_IS_CLOSED) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          message: REGISTRATION_CLOSED_MESSAGE,
          error: REGISTRATION_CLOSED_MESSAGE,
        },
        { status: 410 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: "Submission body must be valid JSON.",
        },
        { status: 400 },
      );
    }

    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Please review the form and try again.";

      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: firstIssue,
        },
        { status: 400 },
      );
    }

    if (parsed.data.honeypot) {
      return NextResponse.json<SubmissionApiResponse>({
        success: true,
        message: "Submission received.",
      });
    }

    const appsScriptConfig = getAppsScriptUrl();

    if ("error" in appsScriptConfig) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: appsScriptConfig.error,
        },
        { status: 500 },
      );
    }

    const submissionPayload = buildSubmissionPayload(parsed.data);
    let warnings: string[] | undefined;

    try {
      warnings = await deliverToAppsScript(appsScriptConfig.url, submissionPayload);
    } catch (error) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: getFetchErrorMessage(error),
        },
        { status: 502 },
      );
    }

    return NextResponse.json<SubmissionApiResponse>({
      success: true,
      message: "Registration received. Google Sheets and invoice emails are syncing.",
      data: submissionPayload,
      warnings,
    });
  } catch (error) {
    return NextResponse.json<SubmissionApiResponse>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected submission error. Please try again.",
      },
      { status: 500 },
    );
  }
}
