import { formatDate } from "../utils/date";
import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";

const log = new Logger("providers.bandcamp");
const parser = new DOMParser();

export class Bandcamp implements MusicProvider {
  url: string;
  pattern: RegExp = /https?:\/\/[^/]+\.bandcamp\.com\/(album|track)\/[^/]+/;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    let url = this.url;

    log.debug("fetching:", url);
    return url;
  }

  async parseData(): Promise<ReleaseData> {
    const url = await this.getAPIUrl();

    const res = await gmFetch(url);
    log.debug("response:", res);

    if (!res) throw new Error("source returned an empty response");

    const doc = parser.parseFromString(res, "text/html");
    log.debug("parsed document:", doc);

    let title = null;
    const trackTitleEl = doc.querySelector("h2.trackTitle");

    if (trackTitleEl?.textContent?.trim()) {
      title = trackTitleEl.textContent.trim();
    } else {
      const ogTitle = doc
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content");
      if (ogTitle) title = ogTitle.replace(/,\s*by\s+.*$/i, "").trim();
    }

    if (!title) throw new Error("title element not found");

    title = title.replace(/^["'“«]+|["'”»]+$/g, "").trim();

    let rawDate = null;
    const jsonLdScript = doc.querySelector(
      'script[type="application/ld+json"]',
    );

    if (jsonLdScript?.textContent) {
      const jsonLd = JSON.parse(jsonLdScript.textContent) as BCRelease;
      rawDate =
        jsonLd.datePublished || jsonLd.albumRelease?.[0]?.datePublished || null;
    }

    if (!rawDate) {
      const metaPublish = doc.querySelector('meta[itemprop="datePublished"]');

      if (metaPublish) rawDate = metaPublish.getAttribute("content") || null;
    }

    if (!rawDate) {
      const trdateEl =
        doc.querySelector(".trdate") || doc.querySelector(".album-credits");
      if (trdateEl?.textContent) {
        const dateMatch = trdateEl.textContent.match(
          /released\s+([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
        );
        if (dateMatch) {
          rawDate = dateMatch[1].trim();
        }
      }
    }

    // type finding
    let type = "LP";

    // ep suffix pattern
    const epReg = /\s+-\s+EP$|\s+EP$/i;

    if (url.includes("/track/")) {
      type = "Single";
    } else if (epReg.test(title)) {
      title = title.replace(epReg, "").trim();
      type = "EP";
    }

    const date = formatDate(rawDate);

    return { title, type, date, url };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    throw new Error("Bandcamp is not supported. Yet.");
  }
}
