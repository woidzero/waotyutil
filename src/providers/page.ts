import { formatDate } from "../utils/date";

function getString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function readTrackArray(value: unknown): ReleaseTrack[] | null {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : null;
  if (!items) return null;

  const tracks = items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const nestedItem =
      record.item && typeof record.item === "object"
        ? (record.item as Record<string, unknown>)
        : record;
    const title = getString(nestedItem.name) || getString(nestedItem.title);
    if (!title) return [];

    const rawPosition =
      getString(record.position) ||
      getString(record.trackNumber) ||
      getString(record.number);
    const parsedPosition = Number.parseInt(rawPosition || "", 10);

    return [
      {
        position: Number.isFinite(parsedPosition) ? parsedPosition : index + 1,
        title,
        features: [],
      },
    ];
  });

  return tracks.length ? tracks : null;
}

function findTracks(value: unknown, depth = 0): ReleaseTrack[] | null {
  if (!value || typeof value !== "object" || depth > 12) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const tracks = findTracks(item, depth + 1);
      if (tracks) return tracks;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if (/^(tracks?|tracklist|tracklistitems|itemlistelement)$/i.test(key)) {
      const tracks = readTrackArray(nested);
      if (tracks) return tracks;
    }
  }

  for (const nested of Object.values(record)) {
    const tracks = findTracks(nested, depth + 1);
    if (tracks) return tracks;
  }

  return null;
}

function findDate(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 12) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const date = findDate(item, depth + 1);
      if (date) return date;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if (/^(datepublished|releasedate|release_date)$/i.test(key)) {
      const date = getString(nested);
      if (date) return date;
    }
  }

  for (const nested of Object.values(record)) {
    const date = findDate(nested, depth + 1);
    if (date) return date;
  }
  return null;
}

function findStructuredTitle(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 12) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const title = findStructuredTitle(item, depth + 1);
      if (title) return title;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawType = record["@type"];
  const types = Array.isArray(rawType) ? rawType : [rawType];
  if (
    types.some(
      (type) =>
        typeof type === "string" &&
        /MusicAlbum|MusicRecording|Product/i.test(type),
    )
  ) {
    const title = getString(record.name) || getString(record.title);
    if (title) return title;
  }

  for (const nested of Object.values(record)) {
    const title = findStructuredTitle(nested, depth + 1);
    if (title) return title;
  }
  return null;
}

function findArtistNames(value: unknown, depth = 0): string[] {
  if (!value || typeof value !== "object" || depth > 12) return [];
  if (Array.isArray(value))
    return value.flatMap((item) => findArtistNames(item, depth + 1));

  const record = value as Record<string, unknown>;
  const names: string[] = [];
  for (const [key, nested] of Object.entries(record)) {
    if (/^(artist|byartist|musicgroup)$/i.test(key)) {
      if (typeof nested === "string") {
        names.push(nested);
      } else if (Array.isArray(nested)) {
        names.push(
          ...nested.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const name = getString((item as Record<string, unknown>).name);
            return name ? [name] : [];
          }),
        );
      } else if (nested && typeof nested === "object") {
        const name = getString((nested as Record<string, unknown>).name);
        if (name) names.push(name);
      }
    } else if (nested && typeof nested === "object") {
      names.push(...findArtistNames(nested, depth + 1));
    }
  }
  return names;
}

function cleanTitle(
  rawTitle: string,
  platform: "Qobuz" | "TIDAL",
  artistNames: string[],
): string {
  let title = rawTitle.trim();
  for (const artist of artistNames
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)) {
    const escapedArtist = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title
      .replace(new RegExp(`^${escapedArtist}\\s*[-–—:]\\s*`, "i"), "")
      .replace(new RegExp(`\\s*[,|–—-]\\s*${escapedArtist}$`, "i"), "")
      .trim();
  }

  if (title === rawTitle.trim()) {
    if (platform === "TIDAL") {
      const separator = title.indexOf(" - ");
      if (separator > 0) title = title.slice(separator + 3).trim();
    } else {
      const separator = title.lastIndexOf(", ");
      if (separator > 0) title = title.slice(0, separator).trim();
    }
  }
  return title;
}

export function parseMusicPage(
  doc: Document,
  platform: "Qobuz" | "TIDAL",
): {
  title: string | null;
  date: string | null;
  tracks: ReleaseTrack[] | null;
} {
  const rawTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.title;
  const jsonLdValues = [
    ...doc.querySelectorAll('script[type="application/ld+json"]'),
  ].flatMap((script) => {
    try {
      return [JSON.parse(script.textContent || "") as unknown];
    } catch {
      return [];
    }
  });
  const structuredTitle = jsonLdValues
    .map((value) => findStructuredTitle(value))
    .find(Boolean);
  const artistNames = [
    ...new Set(
      [
        ...jsonLdValues.flatMap((value) => findArtistNames(value)),
        doc.querySelector('meta[name="author"]')?.getAttribute("content") || "",
      ].filter(Boolean),
    ),
  ];
  const cleanedTitle = rawTitle
    ?.replace(new RegExp(`\\s*[|–-]\\s*${platform}.*$`, "i"), "")
    .replace(/\s+-\s+(?:Album|Single|EP)\s*$/i, "")
    .trim();
  const title = structuredTitle
    ? cleanTitle(structuredTitle, platform, artistNames)
    : cleanedTitle
      ? cleanTitle(cleanedTitle, platform, artistNames)
      : null;

  const rawDate =
    doc
      .querySelector('meta[property="music:release_date"]')
      ?.getAttribute("content") ||
    doc.querySelector('meta[name="release_date"]')?.getAttribute("content") ||
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ||
    jsonLdValues.map((value) => findDate(value)).find(Boolean) ||
    null;

  const tracks =
    [
      ...doc.querySelectorAll(
        'script[type="application/ld+json"], script#__NEXT_DATA__',
      ),
    ]
      .map((script) => {
        try {
          return findTracks(JSON.parse(script.textContent || ""));
        } catch {
          return null;
        }
      })
      .find(Boolean) || null;

  return {
    title,
    date: rawDate ? formatDate(rawDate) || null : null,
    tracks,
  };
}
