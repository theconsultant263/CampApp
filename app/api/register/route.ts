import { NextResponse } from "next/server";

import { registrationSchema } from "@/lib/schema";
import { buildSubmissionPayload } from "@/lib/submission";
import type { SubmissionApiResponse } from "@/types/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const appsScriptUrl =
      process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error:
            "Apps Script URL is missing. Set APPS_SCRIPT_URL or NEXT_PUBLIC_APPS_SCRIPT_URL in your environment.",
        },
        { status: 500 },
      );
    }

    const submissionPayload = buildSubmissionPayload(parsed.data);
    const upstream = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionPayload),
      cache: "no-store",
      redirect: "follow",
    });

    const upstreamText = await upstream.text();
    const upstreamJson = parseJsonResponse(upstreamText);

    if (!upstream.ok || upstreamJson?.success === false) {
      return NextResponse.json<SubmissionApiResponse>(
        {
          success: false,
          error:
            (typeof upstreamJson?.message === "string" && upstreamJson.message) ||
            (typeof upstreamJson?.error === "string" && upstreamJson.error) ||
            "Google Apps Script rejected the submission.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json<SubmissionApiResponse>({
      success: true,
      message:
        (typeof upstreamJson?.message === "string" && upstreamJson.message) ||
        "Registration submitted successfully.",
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
