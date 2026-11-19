export class Logger {
  public module?: string;
  public app: string = "waotyutil";

  private prefix: string;

  constructor(module: string) {
    this.module = module;
    this.prefix = "[" + this.app + (this.module ? "." + this.module : "") + "]";
  }

  public info(...message: any[]): void {
    console.info(this.prefix, ...message);
  }

  public warn(...message: any[]): void {
    console.warn(this.prefix, ...message);
  }

  public error(...message: any[]): void {
    console.error(this.prefix, ...message);
  }

  public debug(...message: any[]): void {
    console.debug(this.prefix, ...message);
  }
}

export const log = new Logger("");
