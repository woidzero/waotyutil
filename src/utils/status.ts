export class StatusManager {
  private element: HTMLElement;

  constructor(statusElementOrId: HTMLElement | string) {
    if (typeof statusElementOrId === "string") {
      const el = document.getElementById(statusElementOrId);
      if (!el)
        throw new Error(
          `status element with id "${statusElementOrId}" not found`,
        );
      this.element = el;
    } else {
      this.element = statusElementOrId;
    }

    this.element.style.transition = "opacity 0.2s ease";
    this.element.style.fontSize = "13px";
    this.element.style.marginTop = "6px";
  }

  private render(text: string, color: string, icon: string) {
    this.element.textContent = `${icon} ${text}`;
    this.element.style.color = color;
  }

  loading(text = "Loading...") {
    this.render(text, "var(--status-loading)", "🕛");
  }

  success(text = "Done!") {
    this.render(text, "var(--status-success)", "✅");
  }

  error(text: string) {
    this.render(text, "var(--status-error)", "❌");
  }

  warn(text: string) {
    this.render(text, "var(--status-warn)", "⚠️");
  }

  clear() {
    this.element.textContent = "";
  }
}
