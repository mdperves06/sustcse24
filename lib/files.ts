/** URL for a stored object — always served through the authenticated file route. */
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key}` : null;
}
