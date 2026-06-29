export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** Optional backend endpoint — set when contact API is available. */
export const CONTACT_API_URL = "";

export async function submitContact(
  payload: ContactPayload,
): Promise<{ success: boolean; message: string }> {
  if (CONTACT_API_URL) {
    const response = await fetch(CONTACT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Unable to send your message.");
    }

    return {
      success: true,
      message: "Thank you. We'll be in touch shortly.",
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    message: `Thank you, ${payload.name.split(" ")[0]}. We'll be in touch shortly.`,
  };
}
