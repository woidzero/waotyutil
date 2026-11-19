import { formatDate } from "../utils/date";
import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";

const log = new Logger("providers.discogs");

interface DiscogsTrack {
  type_?: string;
  title?: string;
  position?: string;
  artists?: { name?: string }[];
}

interface DiscogsRelease {
  title?: string;
  released?: string;
  formats?: { name?: string; descriptions?: string[] }[];
  tracklist?: DiscogsTrack[];
}

export class Discogs implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:www\.)?discogs\.com\/(?:release|master)\/\d+(?:-[^/?#]*)?/i;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    const match = this.url.match(/\/(release|master)\/(\d+)/i);
    if (!match)
      throw new Error("Discogs release or master ID not found in URL");

    const entity = match[1].toLowerCase() === "master" ? "masters" : "releases";
    return `https://api.discogs.com/${entity}/${match[2]}`;
  }

  private async fetchRelease(): Promise<DiscogsRelease> {
    const url = await this.getAPIUrl();
    log.debug("fetching:", url);

    const response = await gmFetch(url, {
      headers: {
        Accept: "application/vnd.discogs.v2.discogs+json",
        "User-Agent": "waotyutil/1.2.0",
      },
    });
    if (!response) throw new Error("Discogs returned an empty response");

    return JSON.parse(response) as DiscogsRelease;
  }

  private getType(release: DiscogsRelease): string {
    const formatInfo = (release.formats || [])
      .flatMap((format) => [format.name, ...(format.descriptions || [])])
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/\bcompilation\b/.test(formatInfo)) return "Compilation";
    if (/\bsingle\b/.test(formatInfo)) return "Single";
    if (/\bep\b/.test(formatInfo)) return "EP";
    return "LP";
  }

  async parseData(): Promise<ReleaseData> {
    const release = await this.fetchRelease();
    if (!release.title) throw new Error("Discogs release title not found");

    return {
      title: release.title,
      type: this.getType(release),
      date: release.released ? formatDate(release.released) || null : null,
      url: this.url,
    };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    const release = await this.fetchRelease();
    const rawTracks = release.tracklist?.filter(
      (track) => track.type_ !== "heading",
    );
    if (!rawTracks?.length) throw new Error("Discogs tracklist not found");

    return {
      tracks: rawTracks.map((track, index) => {
        const position = Number.parseInt(track.position || "", 10);
        const artists = (track.artists || [])
          .map((artist) => artist.name?.replace(/\s+\(\d+\)$/, "").trim())
          .filter((name): name is string => Boolean(name));

        return {
          position: Number.isFinite(position) ? position : index + 1,
          title: track.title || "[untitled]",
          features: artists.slice(1),
        };
      }),
    };
  }
}
