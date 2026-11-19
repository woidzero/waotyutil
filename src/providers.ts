import { AppleMusic } from "./providers/apple";
import { Bandcamp } from "./providers/bandcamp";
import { Deezer } from "./providers/deezer";
import { Discogs } from "./providers/discogs";
import { MusicBrainz } from "./providers/musicbrainz";
import { Qobuz } from "./providers/qobuz";
import { SoundCloud } from "./providers/soundcloud";
import { Spotify } from "./providers/spotify";
import { Tidal } from "./providers/tidal";

import { clearURL } from "./utils/misc";

export function provide(input: string): MusicProvider {
  const url = clearURL(input);

  const providers: Record<string, MusicProvider> = {
    "Apple Music": new AppleMusic(url),
    SoundCloud: new SoundCloud(url),
    Bandcamp: new Bandcamp(url),
    Spotify: new Spotify(url),
    Deezer: new Deezer(url),
    Discogs: new Discogs(url),
    MusicBrainz: new MusicBrainz(url),
    Qobuz: new Qobuz(url),
    TIDAL: new Tidal(url),
  };

  const provider = Object.values(providers).find((p) => p.canHandle());

  if (!provider) {
    const supported = Object.keys(providers).join(", ");
    throw new Error(`Unsupported URL. Allowed links: ${supported}.`);
  }

  return provider;
}
