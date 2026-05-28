import { NextResponse } from "next/server";

import { registrationSchema } from "@/lib/schema";
import { buildSubmissionPayload } from "@/lib/submission";
import type { SubmissionApiResponse } from "@/types/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getFetchErrorMessage(error: unknown) {
  if (error instanceof TypeError && /fetch failed|network/i.test(error.message)) {
    return "The registration server could not reach Google Apps Script. Please verify the Apps Script deployment URL and try again.";
  }

  return error instanceof Error
    ? error.message
    : "The registration server could not reach Google Apps Script. Please try again.";
}

export async function POST(request: Request) {
  try {
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
    let upstream: Response;

    try {
      upstream = await fetch(appsScriptConfig.url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
        cache: "no-store",
        redirect: "follow",
      });
    } catch (error) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: getFetchErrorMessage(error),
        },
        { status: 502 },
      );
    }

    const upstreamText = await upstream.text();
    const upstreamJson = parseJsonResponse(upstreamText);

    if (!upstream.ok) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: getUpstreamError(upstreamJson),
        },
        { status: 502 },
      );
    }

    if (!upstreamJson) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error:
            "Google Apps Script returned an unexpected response. Confirm the deployment URL is the web app /exec URL with access set to Anyone.",
        },
        { status: 502 },
      );
    }

    if (upstreamJson.success !== true) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error: getUpstreamError(upstreamJson),
        },
        { status: 502 },
      );
    }

    return NextResponse.json<SubmissionApiResponse>({
      success: true,
      message:
        getString(upstreamJson.message) || "Registration submitted successfully.",
      data: submissionPayload,
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
