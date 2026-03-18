/**
 * Camp registration Google Apps Script backend.
 *
 * This web app receives JSON from the Next.js frontend proxy route,
 * appends each registration to Google Sheets, optionally stores the raw
 * JSON payload in Google Drive, emails the admin, and emails the registrant.
 *
 * Recommended deployment:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const CONFIG = {
  APP_NAME: "Camp Registration",
  ADMIN_EMAIL: "33campmeeting@gmail.com",
  SPREADSHEET_ID: "1MewCbSTfHX_FKRO2-auFUyYb7cxRKrEJ-1YK8Bs58is",
  SHEET_NAME: "Registrations",
  DRIVE_FOLDER_ID: "",
};

const SHEET_HEADERS = [
  "Timestamp",
  "Reference Number",
  "Church Selected",
  "Other Church",
  "Resolved Church",
  "Primary Payer Full Name",
  "Primary Payer Phone Number",
  "Email Address",
  "Number of People",
  "Adult Count",
  "Teen Count",
  "Child Count",
  "Accommodation Type",
  "Friday Supper Tally",
  "Saturday Breakfast Tally",
  "Saturday Lunch Tally",
  "Saturday Supper Tally",
  "Sunday Breakfast Tally",
  "Sunday Lunch Tally",
  "Sunday Supper Tally",
  "Monday Breakfast Tally",
  "Monday Lunch Tally",
  "Monday Supper Tally",
  "Tuesday Breakfast Tally",
  "Total Amount (USD)",
];

const MEAL_LABELS = {
  fridaySupper: "Friday supper",
  saturdayBreakfast: "Saturday breakfast",
  saturdayLunch: "Saturday lunch",
  saturdaySupper: "Saturday supper",
  sundayBreakfast: "Sunday breakfast",
  sundayLunch: "Sunday lunch",
  sundaySupper: "Sunday supper",
  mondayBreakfast: "Monday breakfast",
  mondayLunch: "Monday lunch",
  mondaySupper: "Monday supper",
  tuesdayBreakfast: "Tuesday breakfast",
};

const TENT_LABELS = {
  camp_tent: "Camp tent",
  own_tent: "Bringing own tent",
  day_visitor: "Day visitor",
};

const AGE_LABELS = {
  adult: "Adult",
  teen: "Teen",
  child: "Child",
};

function doGet() {
  return createJsonResponse_({
    success: true,
    message: "Camp registration Apps Script is running.",
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const payload = parseRequestBody_(e);
    validatePayload_(payload);

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    const driveFileUrl = saveJsonToDrive_(payload);
    appendRegistrationRow_(sheet, payload);
    sendAdminEmail_(payload, driveFileUrl);
    sendRegistrantEmail_(payload);

    return createJsonResponse_({
      success: true,
      message: "Registration stored successfully.",
      reference: payload.reference,
    });
  } catch (error) {
    return createJsonResponse_({
      success: false,
      error: error && error.message ? error.message : "Unknown Apps Script error.",
    });
  } finally {
    lock.releaseLock();
  }
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing POST body.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required.");
  }

  if (!payload.reference || typeof payload.reference !== "string") {
    throw new Error("Reference number is required.");
  }

  if (!payload.payerName || typeof payload.payerName !== "string") {
    throw new Error("Primary payer full name is required.");
  }

  if (!payload.phone || typeof payload.phone !== "string") {
    throw new Error("Primary payer phone number is required.");
  }

  if (!payload.email || typeof payload.email !== "string" || payload.email.indexOf("@") === -1) {
    throw new Error("A valid email address is required.");
  }

  if (!payload.church || typeof payload.church !== "string") {
    throw new Error("Church selection is required.");
  }

  if (!payload.resolvedChurch || typeof payload.resolvedChurch !== "string") {
    throw new Error("Resolved church name is required.");
  }

  if (!payload.people || !Array.isArray(payload.people) || payload.people.length === 0) {
    throw new Error("At least one person is required.");
  }

  if (!payload.accommodationType || !TENT_LABELS[payload.accommodationType]) {
    throw new Error("Accommodation type is required.");
  }

  if (!payload.accommodationLabel || typeof payload.accommodationLabel !== "string") {
    throw new Error("Accommodation label is required.");
  }

  payload.people.forEach(function (person) {
    if (!person.name || typeof person.name !== "string") {
      throw new Error("Each person must include a full name.");
    }

    if (!person.ageGroup || !AGE_LABELS[person.ageGroup]) {
      throw new Error("Each person must include a valid age group.");
    }

    if (!person.tentType || !TENT_LABELS[person.tentType]) {
      throw new Error("Each person must include a valid accommodation selection.");
    }

    if (person.tentType !== payload.accommodationType) {
      throw new Error("All people on the invoice must share the same accommodation type.");
    }

    if (!person.meals || typeof person.meals !== "object") {
      throw new Error("Each person must include meal selections.");
    }

    if (typeof person.total !== "number") {
      throw new Error("Each person must include a numeric total.");
    }

    if (!Array.isArray(person.selectedMeals)) {
      throw new Error("Each person must include selected meal line items.");
    }
  });

  if (typeof payload.total !== "number") {
    throw new Error("Total amount is required.");
  }

  if (
    typeof payload.adultCount !== "number" ||
    typeof payload.teenCount !== "number" ||
    typeof payload.childCount !== "number"
  ) {
    throw new Error("Adult, teen, and child counts are required.");
  }

  if (!payload.mealTallies || typeof payload.mealTallies !== "object") {
    throw new Error("Meal tallies are required.");
  }

  Object.keys(MEAL_LABELS).forEach(function (mealKey) {
    if (typeof payload.mealTallies[mealKey] !== "number") {
      throw new Error("Each meal tally must be numeric.");
    }
  });
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== "PASTE_SPREADSHEET_ID_HERE") {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  throw new Error(
    "Set CONFIG.SPREADSHEET_ID to your target Google Sheet, or bind this script to a spreadsheet."
  );
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  const existingSheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (existingSheet) {
    return existingSheet;
  }

  return spreadsheet.insertSheet(CONFIG.SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];

  if (areHeadersEqual_(currentHeaders, SHEET_HEADERS)) {
    return;
  }

  sheet.getRange(1, 1, 1, Math.max(sheet.getMaxColumns(), SHEET_HEADERS.length)).clearContent();
  sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
  sheet.setFrozenRows(1);
}

function appendRegistrationRow_(sheet, payload) {
  sheet.appendRow([
    payload.submittedAt,
    payload.reference,
    payload.church,
    payload.otherChurch || "",
    payload.resolvedChurch,
    payload.payerName,
    payload.phone,
    payload.email,
    payload.peopleCount,
    payload.adultCount,
    payload.teenCount,
    payload.childCount,
    payload.accommodationLabel,
    payload.mealTallies.fridaySupper,
    payload.mealTallies.saturdayBreakfast,
    payload.mealTallies.saturdayLunch,
    payload.mealTallies.saturdaySupper,
    payload.mealTallies.sundayBreakfast,
    payload.mealTallies.sundayLunch,
    payload.mealTallies.sundaySupper,
    payload.mealTallies.mondayBreakfast,
    payload.mealTallies.mondayLunch,
    payload.mealTallies.mondaySupper,
    payload.mealTallies.tuesdayBreakfast,
    payload.total,
  ]);
}

function saveJsonToDrive_(payload) {
  if (!CONFIG.DRIVE_FOLDER_ID) {
    return "";
  }

  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const fileName = payload.reference + ".json";
  const blob = Utilities.newBlob(JSON.stringify(payload, null, 2), "application/json", fileName);
  const file = folder.createFile(blob);

  return file.getUrl();
}

function sendAdminEmail_(payload, driveFileUrl) {
  const subject =
    "New camp registration: " + payload.payerName + " (" + payload.reference + ")";
  const htmlBody = buildAdminEmailHtml_(payload, driveFileUrl);
  const plainTextBody = buildEmailText_(payload, driveFileUrl, true);

  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    subject: subject,
    htmlBody: htmlBody,
    body: plainTextBody,
    name: CONFIG.APP_NAME,
    replyTo: payload.email,
  });
}

function sendRegistrantEmail_(payload) {
  const subject = "Your camp registration invoice - " + payload.reference;
  const htmlBody = buildRegistrantEmailHtml_(payload);
  const plainTextBody = buildEmailText_(payload, "", false);

  MailApp.sendEmail({
    to: payload.email,
    subject: subject,
    htmlBody: htmlBody,
    body: plainTextBody,
    name: CONFIG.APP_NAME,
    replyTo: CONFIG.ADMIN_EMAIL,
  });
}

function buildAdminEmailHtml_(payload, driveFileUrl) {
  const intro =
    "<p style='margin:0 0 16px;'>A new camp registration has been submitted and saved.</p>";
  const driveBlock = driveFileUrl
    ? "<p style='margin:0 0 16px;'><strong>Drive JSON:</strong> <a href='" +
      sanitizeHtml_(driveFileUrl) +
      "'>" +
      sanitizeHtml_(driveFileUrl) +
      "</a></p>"
    : "";

  return buildEmailShell_(
    "New camp registration received",
    intro + driveBlock + buildInvoiceHtml_(payload)
  );
}

function buildRegistrantEmailHtml_(payload) {
  const intro =
    "<p style='margin:0 0 16px;'>Thank you for registering for camp. Your invoice summary is below. Please keep this email for your records.</p>";

  return buildEmailShell_("Your camp registration invoice", intro + buildInvoiceHtml_(payload));
}

function buildEmailShell_(title, innerHtml) {
  return (
    "<div style=\"background:#f6efe3;padding:32px 16px;font-family:Arial,sans-serif;color:#152013;\">" +
    "<div style=\"max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e8ddcb;border-radius:20px;padding:32px;\">" +
    "<div style=\"margin-bottom:24px;\">" +
    "<p style=\"margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7a8340;\">Camp Registration</p>" +
    "<h1 style=\"margin:0;font-size:28px;line-height:1.2;color:#152013;\">" +
    sanitizeHtml_(title) +
    "</h1>" +
    "</div>" +
    innerHtml +
    "</div>" +
    "</div>"
  );
}

function buildInvoiceHtml_(payload) {
  const peopleBlocks = payload.people
    .map(function (person) {
      const mealRows = person.selectedMeals.length
        ? person.selectedMeals
            .map(function (meal) {
              return (
                "<tr>" +
                "<td style='padding:6px 0;color:#3e4731;'>" +
                sanitizeHtml_(meal.label) +
                "</td>" +
                "<td style='padding:6px 0;text-align:right;color:#3e4731;'>" +
                formatCurrency_(meal.price) +
                "</td>" +
                "</tr>"
              );
            })
            .join("")
        : "<tr><td style='padding:6px 0;color:#3e4731;'>No meals selected</td><td style='padding:6px 0;text-align:right;color:#3e4731;'>" +
          formatCurrency_(0) +
          "</td></tr>";

      return (
        "<div style='border:1px solid #e8ddcb;border-radius:16px;padding:20px;margin:0 0 16px;background:#fffdf8;'>" +
        "<div style='display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;'>" +
        "<div>" +
        "<p style='margin:0;font-size:18px;font-weight:700;color:#152013;'>" +
        sanitizeHtml_(person.name) +
        "</p>" +
        "<p style='margin:6px 0 0;color:#6d4430;'>" +
        sanitizeHtml_(person.ageLabel) +
        "</p>" +
        "</div>" +
        "<div style='font-size:16px;font-weight:700;color:#7a8340;'>" +
        formatCurrency_(person.total) +
        "</div>" +
        "</div>" +
        "<table style='width:100%;border-collapse:collapse;'>" +
        mealRows +
        "<tr>" +
        "<td style='padding:8px 0 0;color:#3e4731;'>" +
        sanitizeHtml_(person.tentLabel) +
        "</td>" +
        "<td style='padding:8px 0 0;text-align:right;color:#3e4731;'>" +
        formatCurrency_(getTentCost_(person)) +
        "</td>" +
        "</tr>" +
        "<tr>" +
        "<td style='padding:12px 0 0;font-weight:700;color:#152013;'>Person total</td>" +
        "<td style='padding:12px 0 0;text-align:right;font-weight:700;color:#152013;'>" +
        formatCurrency_(person.total) +
        "</td>" +
        "</tr>" +
        "</table>" +
        "</div>"
      );
    })
    .join("");

  return (
    "<div style='border:1px solid #e8ddcb;border-radius:18px;padding:20px;background:#fcfaf5;margin:0 0 24px;'>" +
    "<p style='margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7a8340;'>Invoice</p>" +
    "<h2 style='margin:0 0 18px;font-size:24px;line-height:1.2;color:#152013;'>Camp registration invoice</h2>" +
    "<p style='margin:0 0 8px;color:#3e4731;'><strong>Reference:</strong> " +
    sanitizeHtml_(payload.reference) +
    "</p>" +
    "<p style='margin:0 0 8px;color:#3e4731;'><strong>Date:</strong> " +
    sanitizeHtml_(formatDateTime_(payload.submittedAt)) +
    "</p>" +
    "<p style='margin:0 0 8px;color:#3e4731;'><strong>Primary payer:</strong> " +
    sanitizeHtml_(payload.payerName) +
    "</p>" +
    "<p style='margin:0 0 8px;color:#3e4731;'><strong>Phone:</strong> " +
    sanitizeHtml_(payload.phone) +
    "</p>" +
    "<p style='margin:0 0 8px;color:#3e4731;'><strong>Email:</strong> " +
    sanitizeHtml_(payload.email) +
    "</p>" +
    "<p style='margin:0;color:#3e4731;'><strong>Church:</strong> " +
    sanitizeHtml_(payload.resolvedChurch) +
    "</p>" +
    "<p style='margin:8px 0 0;color:#3e4731;'><strong>Accommodation:</strong> " +
    sanitizeHtml_(payload.accommodationLabel) +
    "</p>" +
    "<p style='margin:8px 0 0;color:#3e4731;'><strong>Adults:</strong> " +
    sanitizeHtml_(payload.adultCount) +
    " <strong style='margin-left:12px;'>Teens:</strong> " +
    sanitizeHtml_(payload.teenCount) +
    " <strong style='margin-left:12px;'>Children:</strong> " +
    sanitizeHtml_(payload.childCount) +
    "</p>" +
    "</div>" +
    peopleBlocks +
    "<div style='border:1px solid #d4d9b3;border-radius:18px;padding:20px;background:#f6f7ef;'>" +
    "<p style='margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#606834;'>Grand total</p>" +
    "<p style='margin:0;font-size:30px;font-weight:700;color:#494f2a;'>" +
    formatCurrency_(payload.total) +
    "</p>" +
    "</div>"
  );
}

function buildEmailText_(payload, driveFileUrl, includeDriveUrl) {
  const lines = [
    "Camp Registration Invoice",
    "Reference: " + payload.reference,
    "Date: " + formatDateTime_(payload.submittedAt),
    "Primary payer: " + payload.payerName,
    "Phone: " + payload.phone,
    "Email: " + payload.email,
    "Church: " + payload.resolvedChurch,
    "Accommodation: " + payload.accommodationLabel,
    "Adults: " + payload.adultCount + " | Teens: " + payload.teenCount + " | Children: " + payload.childCount,
    "",
  ];

  payload.people.forEach(function (person) {
    lines.push(person.name + " (" + person.ageLabel + ")");

    if (person.selectedMeals.length) {
      person.selectedMeals.forEach(function (meal) {
        lines.push("- " + meal.label + ": " + formatCurrency_(meal.price));
      });
    } else {
      lines.push("- No meals selected: " + formatCurrency_(0));
    }

    lines.push("- " + person.tentLabel + ": " + formatCurrency_(getTentCost_(person)));
    lines.push("- Person total: " + formatCurrency_(person.total));
    lines.push("");
  });

  lines.push("Grand total: " + formatCurrency_(payload.total));

  if (includeDriveUrl && driveFileUrl) {
    lines.push("");
    lines.push("Drive JSON: " + driveFileUrl);
  }

  return lines.join("\n");
}

function getTentCost_(person) {
  const mealsTotal = person.selectedMeals.reduce(function (sum, meal) {
    return sum + meal.price;
  }, 0);

  return person.total - mealsTotal;
}

function formatCurrency_(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function formatDateTime_(value) {
  return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), "MMM d, yyyy h:mm a");
}

function sanitizeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createJsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function areHeadersEqual_(currentHeaders, expectedHeaders) {
  if (!currentHeaders || currentHeaders.length < expectedHeaders.length) {
    return false;
  }

  for (var i = 0; i < expectedHeaders.length; i += 1) {
    if (String(currentHeaders[i] || "").trim() !== String(expectedHeaders[i]).trim()) {
      return false;
    }
  }

  return true;
}
