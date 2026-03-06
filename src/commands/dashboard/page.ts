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
    <main class="shell">
      <section class="hero">
        <h1>Tiller config dashboard</h1>
        <p>Review project defaults, local overrides, and the effective configuration side by side. Changes reuse the same save logic as <code>tiller-ai config</code>.</p>
      </section>

      <div id="status" class="status hidden" role="status" aria-live="polite"></div>

      <div class="layout">
        <section class="card">
          <h2>Update settings</h2>
          <p class="help">Local saves write <code>.tiller/local.json</code>. Project saves update <code>.tiller/tiller.json</code> and will regenerate managed files when tool selection changes.</p>
          <form id="config-form" class="form-grid">
            <fieldset>
              <legend>Apply changes to</legend>
              <div class="choice-row">
                <label class="inline-choice"><input type="radio" name="scope" value="local" checked /> Just me</label>
                <label class="inline-choice"><input type="radio" name="scope" value="project" /> Whole project</label>
              </div>
            </fieldset>

            <div>
              <label for="mode">Mode</label>
              <select id="mode" name="mode">
                <option value="simple">simple</option>
                <option value="detailed">detailed</option>
              </select>
            </div>

            <div>
              <label for="workflow">Workflow</label>
              <select id="workflow" name="workflow">
                <option value="solo">solo</option>
                <option value="team">team</option>
              </select>
            </div>

            <fieldset>
              <legend>CLI tools</legend>
              <div class="choice-row">
                <label class="inline-choice"><input type="checkbox" name="tools" value="claude" /> Claude Code</label>
                <label class="inline-choice"><input type="checkbox" name="tools" value="copilot" /> GitHub Copilot</label>
                <label class="inline-choice"><input type="checkbox" name="tools" value="opencode" /> OpenCode</label>
              </div>
            </fieldset>

            <button type="submit">Save settings</button>
          </form>
        </section>

        <section class="panel-grid">
          <article class="card">
            <h3>Project values</h3>
            <dl id="project-panel" class="panel"></dl>
          </article>
          <article class="card">
            <h3>Local overrides</h3>
            <dl id="local-panel" class="panel"></dl>
          </article>
          <article class="card">
            <h3>Effective config</h3>
            <dl id="effective-panel" class="panel"></dl>
          </article>
        </section>
      </div>
    </main>

    <script>
      const form = document.getElementById('config-form');
      const statusElement = document.getElementById('status');
      const modeElement = document.getElementById('mode');
      const workflowElement = document.getElementById('workflow');
      const toolInputs = Array.from(document.querySelectorAll('input[name="tools"]'));
      let hasState = false;

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function setStatus(message, tone) {
        statusElement.textContent = message;
        statusElement.className = 'status ' + tone;
      }

      function clearStatus() {
        statusElement.textContent = '';
        statusElement.className = 'status hidden';
      }

      function setFormDisabled(disabled) {
        modeElement.disabled = disabled;
        workflowElement.disabled = disabled;
        for (const input of toolInputs) {
          input.disabled = disabled;
        }
        for (const input of form.querySelectorAll('input[name="scope"]')) {
          input.disabled = disabled;
        }
        form.querySelector('button').disabled = disabled;
      }

      function renderRows(targetId, rows) {
        const target = document.getElementById(targetId);
        target.innerHTML = rows
          .map(function (row) {
            return '<div class="panel-row"><dt>' + escapeHtml(row.label) + '</dt><dd>' + escapeHtml(row.value) + '</dd></div>';
          })
          .join('');
      }

      function renderState(state) {
        renderRows('project-panel', [
          { label: 'Mode', value: state.project.mode },
          { label: 'Workflow', value: state.project.workflow },
          { label: 'Tools', value: state.project.tools.join(', ') },
        ]);

        renderRows('local-panel', [
          { label: 'Mode', value: state.local.mode === null ? 'Not set' : state.local.mode },
          { label: 'Workflow', value: state.local.workflow === null ? 'Not set' : state.local.workflow },
          { label: 'Tools', value: state.local.tools === null ? 'Not set' : (state.local.tools.length === 0 ? 'None' : state.local.tools.join(', ')) },
        ]);

        renderRows('effective-panel', [
          { label: 'Mode', value: state.effective.mode },
          { label: 'Workflow', value: state.effective.workflow },
          { label: 'Tools', value: state.effective.tools.join(', ') },
        ]);

        modeElement.value = state.effective.mode;
        workflowElement.value = state.effective.workflow;
        for (const input of toolInputs) {
          input.checked = state.effective.tools.includes(input.value);
        }
      }

      async function readJson(response) {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
      }

      async function loadState() {
        setStatus('Loading dashboard…', 'info');
        const response = await fetch('/api/config', { cache: 'no-store' });
        const payload = await readJson(response);

        if (!payload.ok) {
          hasState = false;
          setFormDisabled(true);
          setStatus(payload.error.message, 'error');
          return;
        }

        hasState = true;
        renderState(payload.state);
        setFormDisabled(false);

        if (payload.localIssue) {
          setStatus(payload.localIssue.message, 'warn');
        } else {
          clearStatus();
        }
      }

      function selectedScope() {
        return form.querySelector('input[name="scope"]:checked').value;
      }

      function selectedTools() {
        return toolInputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
      }

      form.addEventListener('submit', async function (event) {
        event.preventDefault();

        const tools = selectedTools();
        if (tools.length === 0) {
          setStatus('Choose at least one CLI tool.', 'error');
          return;
        }

        setStatus('Saving settings…', 'info');

        try {
          const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              scope: selectedScope(),
              mode: modeElement.value,
              workflow: workflowElement.value,
              tools,
            }),
          });
          const payload = await readJson(response);

          if (!payload.ok) {
            setStatus(payload.error.message, 'error');
            if (!hasState) {
              setFormDisabled(true);
            }
            return;
          }

          hasState = true;
          renderState(payload.state);
          setFormDisabled(false);
          if (payload.localIssue) {
            setStatus(payload.localIssue.message, 'warn');
          } else {
            setStatus('Settings saved.', 'success');
          }
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : 'Failed to save settings. Try again while the local server is still running.',
            'error',
          );
          setFormDisabled(!hasState);
        }
      });

      loadState().catch(function (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to load the dashboard.', 'error');
        setFormDisabled(true);
      });
    </script>
  </body>
</html>`;
