/** Map fetch Response + parsed JSON to a user-facing message. */
export async function getErrorMessageFromResponse(
  response: Response,
  fallbackPayload?: { error?: string },
): Promise<string> {
  if (response.status === 401) {
    return "Your session expired. Sign in again from the home page.";
  }
  if (response.status === 429) {
    return (
      fallbackPayload?.error ??
      "You’ve reached your daily token limit for this model."
    );
  }
  if (fallbackPayload?.error) {
    return fallbackPayload.error;
  }
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // ignore
  }
  return "Something went wrong. Please try again.";
}
