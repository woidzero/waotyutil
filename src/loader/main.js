(() => {
  "use strict";

  const ENABLE_DYNAMIC_UPDATES = true;

  // script url, DO NOT change if you don't know what you're doing
  const HOST = "https://by.woid.im/waotyutil/waotyutil/dist/";

  const SCRIPT_URL = ENABLE_DYNAMIC_UPDATES
    ? HOST + `main.js?ts=${Date.now()}`
    : HOST + "main.js";

  if (typeof GM_xmlhttpRequest !== "undefined")
    unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest;

  function ready(cb) {
    if (document.head) return cb(document.head);

    const obs = new MutationObserver(() => {
      if (document.head) {
        obs.disconnect();
        cb(document.head);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  ready((head) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.defer = true;
    head.appendChild(script);
  });
})();
