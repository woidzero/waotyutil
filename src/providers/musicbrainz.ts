import { formatDate } from "../utils/date";
import { gmFetch } from "../utils/http";
import { Logger } from "../utils/logger";
import { sleep } from "../utils/misc";

const log = new Logger("providers.musicbrainz");
const MIN_REQUEST_INTERVAL_MS = 1100;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function waitForRequestSlot(): Promise<void> {
  const scheduled = requestQueue.then(async () => {
    const delay = Math.max(
      0,
      MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt),
    );
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
  });
  requestQueue = scheduled.then(
    () => undefined,
    () => undefined,
  );
  return scheduled;
}

export class MusicBrainz implements MusicProvider {
  url: string;
  pattern: RegExp =
    /https?:\/\/(?:www\.)?musicbrainz\.org\/(?:release|release-group)\/[0-9a-f-]{36}(?:\/|$)/i;

  constructor(url: string) {
    this.url = url;
  }

  canHandle(): boolean {
    return this.pattern.test(this.url);
  }

  async getAPIUrl(): Promise<string> {
    const match = this.url.match(
      /\/(release|release-group)\/([0-9a-f-]{36})(?:\/|$)/i,
    );
    if (!match) throw new Error("MusicBrainz release ID not found in URL");

    const entity = match[1].toLowerCase();
    const includes =
      entity === "release-group"
        ? "releases"
        : "artist-credits+recordings+release-groups";
    return `https://musicbrainz.org/ws/2/${entity}/${match[2]}?inc=${includes}&fmt=json`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    log.debug("fetching:", url);

    let response: string;

    for (let attempt = 0; ; attempt++) {
      await waitForRequestSlot();
      try {
        response = await gmFetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.8; rv:160.0) Gecko/20100101 Firefox/160.0",
          },
        });
        break;
      } catch (error) {
        const isRetryable =
          error instanceof Error &&
          /HTTP Error (?:429|503)\b/.test(error.message);
        if (!isRetryable || attempt >= 2) throw error;

        const retryDelay = MIN_REQUEST_INTERVAL_MS * (attempt + 1);
        log.warn(
          `returned a temporary error; retrying in ${retryDelay}ms`,
          error,
        );
        await sleep(retryDelay);
      }
    }

    if (!response) throw new Error("source returned an empty response");
    return JSON.parse(response) as T;
  }

  private async fetchRelease(): Promise<MusicBrainz.Release> {
    const apiUrl = await this.getAPIUrl();
    if (apiUrl.includes("/release/"))
      return this.fetchJson<MusicBrainz.Release>(apiUrl);

    const group = await this.fetchJson<MusicBrainz.ReleaseGroup>(apiUrl);
    const releaseId = group.releases?.find((release) => release.id)?.id;
    if (!releaseId) throw new Error("release group has no releases");

    return this.fetchJson<MusicBrainz.Release>(
      `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artist-credits+recordings+release-groups&fmt=json`,
    );
  }

  async parseData(): Promise<ReleaseData> {
    const release = await this.fetchRelease();
    if (!release.title) throw new Error("release title not found");

    const group = release["release-group"];
    const primaryType = group?.["primary-type"]?.toLowerCase();
    const secondaryTypes = group?.["secondary-types"] || [];

    let type: string | null = null;

    if (secondaryTypes.includes("Compilation")) type = "Compilation";
    else if (primaryType === "single") type = "Single";
    else if (primaryType === "ep") type = "EP";
    else if (primaryType === "album") type = "LP";

    return {
      title: release.title,
      type,
      date: release.date ? formatDate(release.date) || null : null,
      url: this.url,
    };
  }

  async parseTracklist(): Promise<ReleaseTracklist> {
    const release = await this.fetchRelease();
    const tracks = (release.media || []).flatMap(
      (medium) => medium.tracks || [],
    );
    if (!tracks.length) throw new Error("tracklist not found");

    const releaseArtists = new Set(
      (release["artist-credit"] || [])
        .map((credit) => credit.artist?.name || credit.name)
        .filter((name): name is string => Boolean(name)),
    );

    return {
      tracks: tracks.map((track, index) => {
        const trackArtists = (track.recording?.["artist-credit"] || [])
          .map((credit) => credit.artist?.name || credit.name)
          .filter((name): name is string => Boolean(name));

        return {
          position: Number.parseInt(track.number || "", 10) || index + 1,
          title: track.title || "[untitled]",
          features: [
            ...new Set(
              trackArtists.filter((name) => !releaseArtists.has(name)),
            ),
          ],
        };
      }),
    };
  }
}
