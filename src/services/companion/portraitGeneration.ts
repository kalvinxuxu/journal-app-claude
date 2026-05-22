import { getBackendUrl } from "../config";

export async function generateRevealPortrait(prompt: string) {
  const response = await fetch(`${getBackendUrl()}/api/image-generation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "9:16",
      n: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Reveal portrait generation failed with ${response.status}`);
  }

  const result = await response.json() as { images?: string[]; image_urls?: string[] };
  const url = result.images?.[0] ?? result.image_urls?.[0];
  if (!url) {
    throw new Error("Reveal portrait generation returned no image");
  }
  return url;
}
