import { formatDate } from "../utils/date";
import { gmFetch, gmFetchFinalUrl } from "../utils/http";
import { Logger } from "../utils/logger";

const log = new Logger("providers.deezer");

export class Deezer implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?(?:album|track)\/[^/?#]*\/?\d+|(?:www\.)?link\.deezer\.com\/s\/[^/?#]+)/i;

  private resourceUrl?: string;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    let resourceUrl = this.url;
    if (/^https?:\/\/(?:www\.)?link\.deezer\.com\//i.test(this.url)) {
      resourceUrl = await gmFetchFinalUrl(this.url);
      this.resourceUrl = resourceUrl;
    }

    const match = resourceUrl.match(/\/(album|track)\/(?:[^/?#]*\/)?(\d+)/i);
    if (!match) throw new Error("album or track ID not found in URL");

    const url = `https://api.deezer.com/${match[1].toLowerCase()}/${match[2]}`;
    log.debug("api url:", url);

    return url;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await gmFetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response) throw new Error("returned an empty response");

    const data = JSON.parse(response) as T & { error?: { message?: string } };
    if (data.error)
      throw new Error(
        `Deezer API error: ${data.error.message || "request failed"}`,
      );

    log.debug("parsed json:", data);
    return data;
  }

  private async getAlbum(): Promise<Deezer.Album> {
    const apiUrl = await this.getAPIUrl();
    if (apiUrl.includes("/album/")) return this.fetchJson<Deezer.Album>(apiUrl);

    const track = await this.fetchJson<Deezer.TrackData>(apiUrl);
    if (!track.album?.id)
      throw new Error("track does not include album information");

    return this.fetchJson<Deezer.Album>(
      `https://api.deezer.com/album/${track.album.id}`,
    );
  }

  async parseData(): Promise<ReleaseData> {
    const album = await this.getAlbum();
    if (!album.title) throw new Error("album title not found");

    const rawType = album.record_type?.toLowerCase();
    let type = rawType === "single" ? "Single" : rawType === "ep" ? "EP" : "LP";
    let title = album.title;

    if ((this.resourceUrl || this.url).includes("/track/")) {
      type = "Single";
    } else if (type === "LP" && /\s+-?\s*EP$/i.test(title)) {
      title = title.replace(/\s+-?\s*EP$/i, "").trim();
      type = "EP";
    }

    return {
      title,
      type,
      date: album.release_date ? formatDate(album.release_date) || null : null,
      url: this.url,
    };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    const album = await this.getAlbum();
    const tracks = album.tracks?.data;

    if (!tracks?.length) throw new Error("tracklist not found");

    return {
      tracks: tracks.map((track, index) => {
        const artistName = track.artist?.name;
        const features = new Set<string>();

        if (track.contributors) {
          for (const contributor of track.contributors) {
            if (contributor.name && contributor.name !== artistName) {
              features.add(contributor.name);
            }
          }
        }

        return {
          position: track.track_position || index + 1,
          title: track.title || "[untitled]",
          features: [...features],
        };
      }),
    };
  }
}
