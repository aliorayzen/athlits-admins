import { isGoogleMapsUrl } from "@/lib/google-maps";

const MAX_REDIRECTS = 6;

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!input || input.length > 2_048 || !isGoogleMapsUrl(input)) {
    return Response.json(
      { message: "Enter a valid Google Maps link." },
      { status: 400 },
    );
  }

  let current = input;
  try {
    for (let redirect = 0; redirect < MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": "AthlitsAdmin/1.0" },
        signal: AbortSignal.timeout(6_000),
      });
      const location = response.headers.get("location");
      await response.body?.cancel();

      if (!location || response.status < 300 || response.status >= 400) {
        return Response.json({ resolvedUrl: current });
      }

      const next = new URL(location, current).toString();
      if (!isGoogleMapsUrl(next)) {
        return Response.json(
          { message: "The Google Maps link redirected to an unsupported site." },
          { status: 400 },
        );
      }
      current = next;
    }

    return Response.json(
      { message: "The Google Maps link redirected too many times." },
      { status: 400 },
    );
  } catch {
    return Response.json(
      { message: "Could not open this Google Maps link. Try the full share link." },
      { status: 422 },
    );
  }
}
