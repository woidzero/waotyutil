namespace MusicBrainz {
  interface ArtistCredit {
    name?: string;
    artist?: { name?: string };
  }

  interface Track {
    number?: string;
    title?: string;
    recording?: { "artist-credit"?: ArtistCredit[] };
  }

  interface Release {
    id?: string;
    title?: string;
    date?: string;
    "artist-credit"?: ArtistCredit[];
    "release-group"?: {
      "primary-type"?: string;
      "secondary-types"?: string[];
    };
    media?: { tracks?: Track[] }[];
  }

  interface ReleaseGroup {
    releases?: { id?: string }[];
  }
}

namespace Deezer {
  interface Track {
    title?: string;
    track_position?: number;
    artist?: { name?: string };
    contributors?: { name?: string }[];
  }

  interface Album {
    title?: string;
    release_date?: string;
    record_type?: string;
    tracks?: { data?: DeezerTrack[] };
  }

  interface TrackData extends Track {
    album?: { id?: number };
  }
}

namespace AppleMusic {
  interface Release {
    collectionName: string;
    releaseDate?: string;
    collectionType?: string;
    trackCount?: number;
  }

  interface Object {
    results?: AMRelease[];
  }

  interface Release {
    datePublished?: string;
    albumRelease?: { datePublished?: string }[];
    [key: string]: unknown;
  }
}

interface ReleaseData {
  title: string;
  type: string | null;
  date: string | null;
  url: string;
}

interface ReleaseTrack {
  position: number;
  title: string;
  features: string[];
}

interface ReleaseTracklist {
  tracks: ReleaseTrack[];
}
