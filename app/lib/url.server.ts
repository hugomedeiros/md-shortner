import { nanoid } from "nanoid";

/**
 * Generates a random short code for URLs
 * @param length Length of the short code (default: 6)
 * @returns A random alphanumeric string
 */
export function generateShortCode(length = 6): string {
  return nanoid(length);
}

/**
 * Validates a URL
 * @param url URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts domain from a URL
 * @param url Full URL
 * @returns Domain name without protocol
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return "";
  }
}
