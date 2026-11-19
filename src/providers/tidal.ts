import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";
import { parseMusicPage } from "./page";

const log = new Logger("providers.tidal");
const parser = new DOMParser();

export class Tidal implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:(?:www|listen)\.)?tidal\.com\/(?:browse\/)?(?:album|track)\/[a-zA-Z0-9-]+(?:\/[^/?#]*)?/i;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    return this.url;
  }

  private async fetchPage(): Promise<ReturnType<typeof parseMusicPage>> {
    const url = await this.getAPIUrl();
    log.debug("fetching:", url);
    const response = await gmFetch(url);
    if (!response) throw new Error("TIDAL returned an empty response");
    return parseMusicPage(
      parser.parseFromString(response, "text/html"),
      "TIDAL",
    );
  }

  async parseData(): Promise<ReleaseData> {
    const page = await this.fetchPage();
    if (!page.title) throw new Error("TIDAL release title not found");

    let title = page.title;
    let type = this.url.includes("/track/") ? "Single" : "LP";
    if (type === "LP" && /\s+-?\s*EP$/i.test(title)) {
      title = title.replace(/\s+-?\s*EP$/i, "").trim();
      type = "EP";
    }

    return { title, type, date: page.date, url: this.url };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    const page = await this.fetchPage();
    if (!page.tracks?.length)
      throw new Error("TIDAL tracklist is not available on this page");
    return { tracks: page.tracks };
  }
}
