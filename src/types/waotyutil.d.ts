declare const VERSION: string;
declare const LOADER_VERSION: string;

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

type ProviderKey =
  | "apple-music"
  | "bandcamp"
  | "deezer"
  | "discogs"
  | "musicbrainz"
  | "qobuz"
  | "soundcloud"
  | "spotify"
  | "tidal";

interface ProviderService {
  parse: (url: string, status: HTMLElement) => Promise<void> | void;
}

interface ProviderConfig {
  name: string;
  pattern: RegExp;
  service: ProviderService;
}

interface AMRelease {
  collectionName: string;
  releaseDate?: string;
  collectionType?: string;
  trackCount?: number;
}

interface AMObject {
  results?: AMRelease[];
}

interface BCRelease {
  datePublished?: string;
  albumRelease?: { datePublished?: string }[];
  [key: string]: unknown;
}

interface MusicProvider {
  url: string;
  pattern: RegExp;

  canHandle(): boolean;
  getAPIUrl?(): Promise<string>;

  parseData(): Promise<ReleaseData>;
  parseTracklist?(): Promise<ReleaseTracklist>;
}

type SettingFieldType = "text" | "number" | "slider" | "boolean";

interface SettingField {
  name: string;
  description: string;
  type: SettingFieldType;
  value: any;
  min?: number;
  max?: number;
  step?: number;
  datatype?: string;
  fields?: Record<string, SettingField>;
}

interface OptionConfig {
  name: string;
  description: string;
  fields?: Record<string, SettingField>;
}
