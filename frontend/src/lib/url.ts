export function isTrustedExternalUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const allowedHosts = process.env.NEXT_PUBLIC_ALLOWED_EXTERNAL_HOSTS
      ?.split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);

    if (allowedHosts && allowedHosts.length > 0) {
      const host = parsed.hostname.toLowerCase();
      return allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
    }

    return true;
  } catch {
    return false;
  }
}
