import { CLIENT_ASSET_PATH, CLIENT_CSS_ASSET_PATH } from './contracts.js';

export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiller Config Dashboard</title>
    <style>
      /* Minimal blocking styles so the page isn't unstyled before the CSS bundle loads */
      :root { color-scheme: dark; }
      body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; }
    </style>
    <link rel="stylesheet" href="${CLIENT_CSS_ASSET_PATH}" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${CLIENT_ASSET_PATH}"></script>
  </body>
</html>`;
