import { Logger } from "../utils/logger";
import { gmFetch } from "../utils/http";
import { extractReleaseInfoAM, normalizeType } from "../utils/misc";

const log = new Logger("providers.apple");
const dom = new DOMParser();

async function detectType(
  text: string | undefined,
  rawUrl: string,
  fallback: string,
): Promise<string | null> {
  const normalizedText = normalizeType(text);
  if (normalizedText) return normalizedText;

  try {
    log.warn("type missing or needs fallback, fetching raw url:", rawUrl);
    const res = await gmFetch(rawUrl);

    log.debug("response fetched:", res);
    const doc = dom.parseFromString(res, "text/html");
    const description = doc.querySelector(
      "[data-testid='tracklist-footer-description']",
    );

    if (!description || !description.textContent) {
      log.warn("unable to find tracklist description element");
      return normalizeType(fallback);
    }

    const releaseInfo = extractReleaseInfoAM(description.textContent);
    log.debug("release info: ", releaseInfo);

    if (!releaseInfo) {
      return normalizeType(fallback);
    }

    let determinedType: string | null = null;

    if (releaseInfo.songsCount < 3) {
      determinedType = "Single";
    } else if (releaseInfo.songsCount === 3 && releaseInfo.minutesCount <= 15) {
      determinedType = "Single";
    } else if (releaseInfo.songsCount <= 8 && releaseInfo.minutesCount < 25) {
      determinedType = "EP";
    } else {
      determinedType = "LP";
    }

    log.info(
      `type determined as ${determinedType} based on tracks count (${releaseInfo.songsCount}) and duration (${releaseInfo.minutesCount}m)`,
    );
    return determinedType;
  } catch (e) {
    log.warn("type detecting failed: ", e);
    return normalizeType(fallback);
  }
}

export class AppleMusic implements MusicProvider {
  url: string;
  pattern: RegExp = /https?:\/\/music\.apple\.com\/[a-z]{2}\/album\/[^/]+\/\d+/;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(entity: string = "album"): Promise<string> {
    const match = this.url.match(/(?:\/id|\/)(\d+)(?:\?.*)?$/);
    if (!match) throw new Error("Apple Music ID not found in URL");

    const url = `https://itunes.apple.com/lookup?id=${match[1]}&entity=${entity}`;
    log.info("fetching:", url);

    return url;
  }

  async parseData(): Promise<ReleaseData> {
    const url = await this.getAPIUrl();

    const res = await gmFetch(url);
    log.debug("response:", res);

    if (!res) throw new Error("source returned an empty response");

    const obj = JSON.parse(res) as AMObject;
    log.info("parsed object:", obj);

    if (!obj || !obj.results || obj.results.length == 0)
      throw new Error("source returned an empty response");

    const album = obj.results[0];

    const rawDate = album.releaseDate;
    const date = rawDate ? rawDate.split("T")[0] : "";

    const fullName = album.collectionName || "";

    const lastIndex = fullName.lastIndexOf(" - ");
    let title = fullName;

    let rawTypeHint: string | undefined = undefined;

    if (lastIndex !== -1) {
      title = fullName.substring(0, lastIndex).trim();
      rawTypeHint = fullName.substring(lastIndex + 3).trim();
    }

    title = title
      .replace(/\s*[\(\[](?:feat\.?|ft\.?|featuring)\s+[^\]\)]+[\)\]]/gi, "")
      .trim();

    const type = await detectType(rawTypeHint, this.url, album.collectionType!);

    const data = {
      title,
      type,
      date,
      url: this.url,
    };
    return data;
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    const url = await this.getAPIUrl("song");

    const res = await gmFetch(url);
    log.debug("tracklist response fetched:", res);

    if (!res) throw new Error("source returned an empty response");

    const obj = JSON.parse(res);
    if (!obj || !obj.results || obj.results.length <= 1)
      throw new Error("unable to find tracks in API response");

    const rawTracks = obj.results.filter(
      (item: any) => item.wrapperType === "track",
    );
    const tracks: ReleaseTrack[] = [];

    rawTracks.forEach((trackItem: any, index: number) => {
      let title = trackItem.trackName || `[untitled]`;
      const artistName = trackItem.artistName;

      if (!artistName) return [];
      const parts = artistName.split(/\s*(?:&|,|and)\s+/i);

      // @ts-ignore
      const features = parts
        .slice(1)
        .map((p) => p.trim())
        .filter(Boolean);

      tracks.push({
        position: index + 1,
        title,
        features,
      });
    });

    return { tracks };
  }
}
