/**
 * Read an API response without letting an HTML/plain-text gateway error mask
 * the useful HTTP status with a JSON.parse exception.
 */
export async function responseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
