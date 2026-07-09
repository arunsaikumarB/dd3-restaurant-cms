import type { LocationId } from "./locations";

export type EnquirySource = "contact" | "catering";

/**
 * Notification recipient for each of the 6 logical forms (3 locations x
 * contact/catering quote). TEMPORARY: every entry points to the same test
 * inbox (ENQUIRY_NOTIFY_EMAIL) while forms are being verified — replace each
 * entry below with its real recipient when ready, no other code changes
 * needed. Read server-side only (Netlify functions), never in the browser.
 */
export function buildEnquiryRecipients(
  testEmail: string,
): Record<LocationId, Record<EnquirySource, string>> {
  return {
    "south-plainfield": { contact: testEmail, catering: testEmail },
    "oak-tree": { contact: testEmail, catering: testEmail },
    lawrenceville: { contact: testEmail, catering: testEmail },
  };
}
