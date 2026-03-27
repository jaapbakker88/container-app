export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const [key, ...vals] = pair.trim().split("=");
      return [key.trim(), decodeURIComponent(vals.join("="))];
    })
  );
}
