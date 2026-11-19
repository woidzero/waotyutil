import { formatDate } from "../utils/date";
import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";

const log = new Logger("providers.soundcloud");
const dom = new DOMParser();

export class SoundCloud implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:(?:m\.)?soundcloud\.com\/[^/]+(?:\/[^/]+)*|on\.soundcloud\.com\/[a-zA-Z0-9]+)/;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    let url = this.url;

    if (url.includes("m.soundcloud.com"))
      url = url.replace("://m.soundcloud.com", "://soundcloud.com");

    if (url.includes("on.soundcloud.com")) {
      const res = await gmFetch(url);

      if (!res) throw new Error(`${url} returned empty response`);

      const doc = dom.parseFromString(res, "text/html");
      const canonicalEl =
        doc.querySelector('link[rel="canonical"]') ||
        doc.querySelector('meta[property="og:url"]');

      const resolved =
        canonicalEl?.getAttribute("href") ||
        canonicalEl?.getAttribute("content");

      if (resolved)
        url = resolved.replace(/:\/\/m\.soundcloud\.com/, "://soundcloud.com");
    }

    log.debug("fetching:", url);
    return url;
  }

  async parseData(): Promise<ReleaseData> {
    const url = await this.getAPIUrl();

    const res = await gmFetch(url);
    log.debug("response:", res);

    if (!res) throw new Error("source returned an empty response");

    const doc = dom.parseFromString(res, "text/html");
    log.debug("parsed document:", doc);

    const canonicalEl =
      doc.querySelector('link[rel="canonical"]') ||
      doc.querySelector('meta[property="og:url"]');
    const resolvedUrl =
      canonicalEl?.getAttribute("href") ||
      canonicalEl?.getAttribute("content") ||
      url;

    const titleEl =
      doc.querySelector(".soundTitle__titleHeroContainer h1 span") ||
      doc.querySelector("h1.soundTitle__title span") ||
      doc.querySelector('meta[property="og:title"]');

    let title = null;
    if (titleEl)
      title =
        titleEl.getAttribute("content") || titleEl.textContent?.trim() || null;

    if (!title) throw new Error("title element not found");

    if (title.includes(" by "))
      title = title.replace(/\s+by\s+.*$/i, "").trim();

    let rawDate = null;
    const releaseDataEl = doc.querySelector(
      ".l-about-row.l-listen__mainContent .listenInfo__releaseData",
    );

    if (releaseDataEl) rawDate = releaseDataEl.textContent?.trim() || "";

    if (!rawDate) {
      const timeEl =
        doc.querySelector("time.relativeTime") || doc.querySelector("time");
      if (timeEl) {
        rawDate =
          timeEl.getAttribute("datetime") || timeEl.textContent?.trim() || null;
      }
    }

    const formattedDate = rawDate ? formatDate(rawDate) : null;
    const type = resolvedUrl.includes("/sets/") ? "LP" : "Single";

    const data = {
      title,
      type,
      date: formattedDate || null,
      url: resolvedUrl,
    };

    return data;
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    throw new Error("SoundCloud is not supported. Yet.");
  }
}
