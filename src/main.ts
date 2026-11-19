import "../styles/main.css";

import { AutofillRelease } from "./modules/contribution/autofill/AutoFillRelease";
import { AutofillTracklist } from "./modules/contribution/autofill/AutoFillTracklist";

import { BetterCovers } from "./modules/contribution/BetterCovers";
import { ReviewFilter } from "./modules/reviews/ReviewFilter";

import { settings } from "./settings";
import { log } from "./utils/logger";

function main() {
  log.info(`version: ${VERSION}`);
  settings.init();

  AutofillRelease.init();
  AutofillTracklist.init();
  BetterCovers.init();
  ReviewFilter.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
