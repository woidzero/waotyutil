import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";
import { parseMusicPage } from "./page";

const log = new Logger("providers.qobuz");
const parser = new DOMParser();
const QOBUZ_APP_ID = "712109809";

interface QobuzAlbum {
  title?: string;
  release_type?: string;
  release_date_original?: string;
  tracks?: { items?: QobuzTrack[] };
  status?: string;
  message?: string;
}

interface QobuzTrack {
  title?: string;
  track_number?: number;
}

export class Qobuz implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:(?:www\.)?qobuz\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:album|track)\/[^/?#]+\/[^/?#]+|open\.qobuz\.com\/album\/[^/?#]+)/i;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    return this.url;
  }

  private isOpenAlbumLink(): boolean {
    return /^https?:\/\/open\.qobuz\.com\/album\/[^/?#]+/i.test(this.url);
  }

  private async fetchOpenAlbum(): Promise<QobuzAlbum> {
    const match = this.url.match(
      /^https?:\/\/open\.qobuz\.com\/album\/([^/?#]+)/i,
    );
    if (!match) throw new Error("album ID not found in URL");

    const apiUrl = new URL("https://www.qobuz.com/api.json/0.2/album/get");
    apiUrl.searchParams.set("album_id", match[1]);
    apiUrl.searchParams.set("app_id", QOBUZ_APP_ID);

    const response = await gmFetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response) throw new Error("API returned an empty response");

    const album = JSON.parse(response) as QobuzAlbum;
    if (album.status === "error")
      throw new Error(`API error: ${album.message || "request failed"}`);

    log.debug(album);
    return album;
  }

  private async fetchPage(): Promise<ReturnType<typeof parseMusicPage>> {
    const url = await this.getAPIUrl();
    log.debug("fetching:", url);
    const response = await gmFetch(url);
    if (!response) throw new Error("fetch returned an empty response");
    return parseMusicPage(
      parser.parseFromString(response, "text/html"),
      "Qobuz",
    );
  }

  async parseData(): Promise<ReleaseData> {
    if (this.isOpenAlbumLink()) {
      const album = await this.fetchOpenAlbum();
      if (!album.title) throw new Error("release title not found");

      let title = album.title;
      const releaseType = album.release_type?.toLowerCase();
      let type =
        releaseType === "single"
          ? "Single"
          : releaseType === "epmini"
            ? "EP"
            : "LP";

      if (type === "LP" && /\s+-?\s*EP$/i.test(title)) {
        title = title.replace(/\s+-?\s*EP$/i, "").trim();
        type = "EP";
      }

      return {
        title,
        type,
        date: album.release_date_original || null,
        url: this.url,
      };
    }

    const page = await this.fetchPage();
    if (!page.title) throw new Error("release title not found");

    let title = page.title;
    let type = this.url.includes("/track/") ? "Single" : "LP";
    if (type === "LP" && /\s+-?\s*EP$/i.test(title)) {
      title = title.replace(/\s+-?\s*EP$/i, "").trim();
      type = "EP";
    }

    return { title, type, date: page.date, url: this.url };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    if (this.isOpenAlbumLink()) {
      const album = await this.fetchOpenAlbum();
      const tracks = album.tracks?.items;
      if (!tracks?.length)
        throw new Error("tracklist is not available on this page");

      return {
        tracks: tracks.map((track, index) => ({
          position: track.track_number || index + 1,
          title: track.title || "[untitled]",
          features: [],
        })),
      };
    }

    const page = await this.fetchPage();
    if (!page.tracks?.length)
      throw new Error("tracklist is not available on this page");

    return { tracks: page.tracks };
  }
}
