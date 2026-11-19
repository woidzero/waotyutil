import { Logger } from "../utils/logger";
import { gmFetch } from "../utils/http";

const log = new Logger("providers.spotify");

export class Spotify implements MusicProvider {
  url: string;
  pattern: RegExp = /https?:\/\/open\.spotify\.com\/(album)\/[a-zA-Z0-9]+/;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    return `https://open.spotify.com/oembed?url=${encodeURIComponent(this.url)}`;
  }

  async parseData(): Promise<ReleaseData> {
    const url = await this.getAPIUrl();
    log.debug("parsing:", url);

    const res = await gmFetch(url);
    log.debug("response fetched:", res);

    if (!res) throw new Error("source returned an empty response");

    const data = JSON.parse(res);
    const rawTitle = data.title?.trim();
    if (!rawTitle) throw new Error("title not found in response");

    let type = null;
    let title = rawTitle;
    const suffix = title.match(/\s*-\s*(Single|EP)\s*$/i);
    if (suffix) {
      type = suffix[1].toLowerCase() === "ep" ? "EP" : "Single";
      title = title.slice(0, suffix.index).trim();
    }

    return {
      title,
      type,
      date: null,
      url: this.url,
    };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    throw new Error("Spotify is not supported. Yet.");
  }
}
