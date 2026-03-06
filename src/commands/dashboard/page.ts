import { CLIENT_ASSET_PATH } from './contracts.js';

export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiller Config Dashboard</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
      }

      .shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }

      .hero {
        margin-bottom: 24px;
      }

      h1, h2, h3 {
        margin: 0 0 12px;
      }

      p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.5;
      }

      .layout {
        display: grid;
        gap: 20px;
      }

      .card {
        background: rgba(15, 23, 42, 0.84);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.28);
      }

      .status {
        margin: 0 0 20px;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid transparent;
        font-size: 0.95rem;
      }

      .status.hidden {
        display: none;
      }

      .status.info {
        background: rgba(59, 130, 246, 0.14);
        border-color: rgba(96, 165, 250, 0.4);
      }

      .status.success {
        background: rgba(34, 197, 94, 0.14);
        border-color: rgba(74, 222, 128, 0.45);
      }

      .status.warn {
        background: rgba(234, 179, 8, 0.14);
        border-color: rgba(250, 204, 21, 0.45);
      }

      .status.error {
        background: rgba(239, 68, 68, 0.14);
        border-color: rgba(248, 113, 113, 0.5);
      }

      .form-grid,
      .panel-grid {
        display: grid;
        gap: 18px;
      }

      .panel-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      label,
      legend {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
      }

      select,
      button {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.88);
        color: inherit;
        padding: 12px 14px;
        font: inherit;
      }

      fieldset {
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        padding: 16px;
        margin: 0;
      }

      .choice-row {
        display: grid;
        gap: 10px;
      }

      .inline-choice {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(30, 41, 59, 0.65);
      }

      input[type="radio"],
      input[type="checkbox"] {
        accent-color: #38bdf8;
        inline-size: 18px;
        block-size: 18px;
      }

      button {
        cursor: pointer;
        background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
        border: none;
        font-weight: 700;
      }

      button:disabled,
      select:disabled,
      input:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .panel {
        display: grid;
        gap: 12px;
      }

      .panel-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.95rem;
      }

      .panel-row dt {
        color: #94a3b8;
      }

      .panel-row dd {
        margin: 0;
        text-align: right;
      }

      .help {
        font-size: 0.92rem;
        color: #94a3b8;
      }

      @media (min-width: 980px) {
        .layout {
          grid-template-columns: minmax(340px, 380px) 1fr;
          align-items: start;
        }
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${CLIENT_ASSET_PATH}"></script>
  </body>
</html>`;
