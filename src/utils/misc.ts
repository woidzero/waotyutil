const types = ["Album", "EP", "Single", "Compilation"];

export function extractReleaseInfoAM(
  html: string,
): Record<string, number> | null {
  const regex = /(\d+)\s+songs,\s+(\d+)\s+minutes/i;
  const match = html.match(regex);

  let songsCount = 0;
  let minutesCount = 0;

  if (match) {
    songsCount = parseInt(match[1], 10);
    minutesCount = parseInt(match[2], 10);
  } else {
    return null;
  }

  return { songsCount, minutesCount };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function capitalize(str: string) {
  var splitStr = str.toLowerCase().split(" ");
  for (var i = 0; i < splitStr.length; i++) {
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  return splitStr.join(" ");
}

export function normalizeType(
  typeStr: string | null | undefined,
): string | null {
  if (!typeStr || !types.includes(typeStr)) return null;
  if (typeStr === "Album") return "LP";
  return typeStr;
}

// removing parameters from urls
export function clearURL(inputUrl: string): string {
  try {
    const url = new URL(inputUrl);
    url.search = "";

    return url.toString();
  } catch (e) {
    return inputUrl;
  }
}
