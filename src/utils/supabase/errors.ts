export function mapSupabaseError(
  error: { message: string; code?: string },
  context = "save changes",
): string {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
    return `You do not have permission to ${context}. Please sign in as an admin.`;
  }
  if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
    return "This slug is already in use. Please choose another.";
  }
  if (error.message.toLowerCase().includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}
