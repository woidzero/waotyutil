interface BaseField {
  name: string;
  description: string;
  url?: string;
}

interface InputField extends BaseField {
  type: "input";
  dataType: "text" | "secret" | "resolution" | "number";
  value: string | number | null;
  min?: number;
  max?: number;
  step?: number;
}

interface SliderField extends BaseField {
  type: "slider";
  dataType: "percent" | "megabytes";
  value: number;
  min: number;
  max: number;
  step: number;
}

type ConfigField = InputField | SliderField;

interface ConfigOption {
  name: string;
  description: string;
  fields: Record<string, ConfigField>;
}

interface Module {
  name: string;
  description: string;
  open?: boolean;
  options: Record<string, ConfigOption>;
}

interface ConfigModel {
  storageKey: string;
  modules: Record<string, Module>;
}

export const Config: ConfigModel = {
  storageKey: "waotyutil.settings",
  modules: {
    general: {
      name: "General",
      description: "Various improvements for general aspects of website.",
      open: true,
      options: {
        reviews: {
          name: "Reviews",
          description:
            "Various improvements for reviews and review sections under albums.",
          fields: {
            filter: {
              name: "Filter",
              description: "Hide reviews using custom inline filter language.",
              url: "https://by.woid.im/waotyutil/docs/article/reviewFilter",
              type: "input",
              dataType: "text",
              value: null,
            },
          },
        },
      },
    },
    contributor: {
      name: "Contributor",
      description: "Enhancements and features for website contributors.",
      options: {
        betterCovers: {
          name: "Better Covers",
          description:
            "Improved cover add screen, add covers from direct link to image + auto compression and conversion.",
          fields: {
            quality: {
              name: "Compression Quality",
              description: "JPEG compression percent",
              type: "slider",
              dataType: "percent",
              value: 0.92,
              min: 10,
              max: 100,
              step: 1,
            },
            maxSize: {
              name: "Image Resolution",
              description: "Cover image output maximum size (in pixels)",
              type: "input",
              dataType: "resolution",
              value: 2000,
              min: 500,
              max: 5000,
              step: 50,
            },
            targetBytes: {
              name: "Target Max File Size",
              description: "Maximum file size in MB (from 50 KB to 2 MB)",
              type: "slider",
              dataType: "megabytes",
              value: 2,
              min: 0.05,
              max: 2,
              step: 0.05,
            },
          },
        },
      },
    },
    api: {
      name: "API",
      description: "no description",
      options: {
        spotifyAPI: {
          name: "Spotify API",
          description: "Spotify API credentials.",
          fields: {
            spotify_client_id: {
              name: "Spotify Client ID",
              description: "Spotify API Client ID",
              type: "input",
              dataType: "secret",
              value: null,
            },
            spotify_client_secret: {
              name: "Spotify Client Secret",
              description: "Spotify API Client Secret",
              type: "input",
              dataType: "secret",
              value: null,
            },
          },
        },
      },
    },
  },
};
