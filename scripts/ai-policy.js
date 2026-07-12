// AI Use Policy Builder
// Pulls learning objectives, prohibited AI uses, and permitted AI uses from
// a shared Google Sheet, then assembles a copy-pasteable policy passage.

(function () {
  'use strict';

  var SHEET_ID = '1CitTBepZIbMuQ8_94-_5SVv9JKIS1p91i0QfVH0Uh0M';
  var TABS = {
    objectives: 'objectives',
    prohibited: 'AI uses',
    permitted: 'permitted'
  };

  var DEFAULT_INTRO =
    'This AI use policy is tailored to the core learning objectives selected ' +
    'for this course. Certain uses of generative AI (e.g., ChatGPT, Copilot, ' +
    'Claude, Gemini) would directly undermine one or more of these ' +
    'objectives and are therefore prohibited, as noted below. Other uses ' +
    'that do not interfere with these objectives are permitted. This is a ' +
    'first-cut policy and may be refined by the instructor.';

  var prohibitedUses = [];   // [{shortName, use, rationale}] in sheet order
  var permittedUses = [];    // [{shortName, use}] in sheet order

  var objectivesListEl = document.getElementById('objectives-list');
  var statusEl = document.getElementById('status');
  var warningsEl = document.getElementById('data-warnings');
  var introTextEl = document.getElementById('intro-text');
  var previewEl = document.getElementById('policy-preview');
  var copyBtn = document.getElementById('copy-btn');
  var copyFeedbackEl = document.getElementById('copy-feedback');
  var addObjectiveBtn = document.getElementById('add-objective-btn');
  var customObjectiveInput = document.getElementById('custom-objective-input');
  var selectAllBtn = document.getElementById('select-all-btn');
  var clearAllBtn = document.getElementById('clear-all-btn');

  introTextEl.value = DEFAULT_INTRO;

  function normalize(s) {
    return (s || '').trim().toLowerCase();
  }

  function csvUrl(tabName) {
    return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tabName);
  }

  // Minimal RFC4180-style CSV parser (handles quoted fields, embedded
  // commas/newlines, and doubled-quote escaping).
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\r') {
        // ignore
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function fetchTab(tabName) {
    return fetch(csvUrl(tabName)).then(function (resp) {
      if (!resp.ok) {
        throw new Error('Could not load the "' + tabName + '" tab (HTTP ' + resp.status + ').');
      }
      return resp.text();
    }).then(function (text) {
      var rows = parseCSV(text);
      return rows.slice(1); // drop header row
    });
  }

  // Cross-checks the three tabs against each other so a typo'd short name
  // (e.g. "brainstorming" vs "brainstorm") is surfaced instead of silently
  // dropping a prohibited-use link. Returns an array of human-readable
  // warning strings; an empty array means everything lines up.
  function validateData(allObjectives, allProhibited, allPermitted) {
    var warnings = [];

    function findDuplicates(items, tabLabel) {
      var seen = {};
      items.forEach(function (item) {
        if (!item.shortName) return;
        if (seen[item.shortName]) {
          warnings.push('The short name "' + item.shortName + '" appears more than once in the "' +
            tabLabel + '" tab. Only one row with that short name should exist.');
        }
        seen[item.shortName] = true;
      });
    }

    findDuplicates(allProhibited, TABS.prohibited);
    findDuplicates(allPermitted, TABS.permitted);
    findDuplicates(allObjectives, TABS.objectives);

    allProhibited.forEach(function (u) {
      if (u.shortName && !u.use) {
        warnings.push('Row with short name "' + u.shortName + '" in the "' + TABS.prohibited +
          '" tab has no text in the "AI use" column, so it was skipped.');
      }
    });
    allPermitted.forEach(function (u) {
      if (u.shortName && !u.use) {
        warnings.push('Row with short name "' + u.shortName + '" in the "' + TABS.permitted +
          '" tab has no text in the "AI use" column, so it was skipped.');
      }
    });
    allObjectives.forEach(function (o) {
      if (o.shortName && !o.text) {
        warnings.push('Row with short name "' + o.shortName + '" in the "' + TABS.objectives +
          '" tab has no text in the "learning objective" column, so it was skipped.');
      }
    });

    var prohibitedShortNames = {};
    allProhibited.forEach(function (u) { if (u.shortName) prohibitedShortNames[u.shortName] = true; });

    allObjectives.forEach(function (o) {
      o.prohibitions.forEach(function (token) {
        if (!prohibitedShortNames[token]) {
          warnings.push('Learning objective "' + (o.shortName || o.text) + '" lists prohibited-use short name "' +
            token + '" in its "prohibitions" column, but no row in the "' + TABS.prohibited +
            '" tab has that short name. Check both tabs for a typo — this prohibition is currently being dropped.');
        }
      });
    });

    return warnings;
  }

  function renderWarnings(warnings) {
    if (!warnings.length) {
      warningsEl.innerHTML = '';
      warningsEl.className = 'data-warnings hidden';
      return;
    }
    warningsEl.className = 'data-warnings';
    var html = '<p><strong>' + warnings.length + ' issue' + (warnings.length === 1 ? '' : 's') +
      ' found in the spreadsheet:</strong></p><ul>';
    warnings.forEach(function (w) {
      html += '<li>' + escapeHtml(w) + '</li>';
    });
    html += '</ul>';
    warningsEl.innerHTML = html;
  }

  function loadData() {
    return Promise.all([
      fetchTab(TABS.objectives),
      fetchTab(TABS.prohibited),
      fetchTab(TABS.permitted)
    ]).then(function (results) {
      var objectiveRows = results[0];
      var prohibitedRows = results[1];
      var permittedRows = results[2];

      var allProhibited = prohibitedRows.map(function (r) {
        return { shortName: normalize(r[0]), use: (r[1] || '').trim(), rationale: (r[2] || '').trim() };
      });
      var allPermitted = permittedRows.map(function (r) {
        return { shortName: normalize(r[0]), use: (r[1] || '').trim() };
      });
      var allObjectives = objectiveRows.map(function (r) {
        var prohibitions = (r[2] || '').split(',')
          .map(normalize)
          .filter(function (s) { return s; });
        return { shortName: normalize(r[0]), text: (r[1] || '').trim(), prohibitions: prohibitions };
      });

      renderWarnings(validateData(allObjectives, allProhibited, allPermitted));

      prohibitedUses = allProhibited.filter(function (u) { return u.use; });
      permittedUses = allPermitted.filter(function (u) { return u.use; });
      var objectives = allObjectives.filter(function (o) { return o.text; });

      renderObjectives(objectives);
    });
  }

  function makeObjectiveItem(text, prohibitions, checked, removable) {
    var li = document.createElement('li');
    li.className = 'objective-item';
    li.dataset.text = text;
    li.dataset.prohibitions = JSON.stringify(prohibitions || []);

    var label = document.createElement('label');

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!checked;
    checkbox.addEventListener('change', renderPreview);

    var span = document.createElement('span');
    span.textContent = text;

    label.appendChild(checkbox);
    label.appendChild(span);
    li.appendChild(label);

    if (removable) {
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-objective-btn';
      removeBtn.setAttribute('aria-label', 'Remove this learning objective');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () {
        li.remove();
        renderPreview();
      });
      li.appendChild(removeBtn);
    }

    return li;
  }

  function renderObjectives(objectives) {
    objectivesListEl.innerHTML = '';
    objectives.forEach(function (o) {
      objectivesListEl.appendChild(makeObjectiveItem(o.text, o.prohibitions, false, false));
    });
    renderPreview();
  }

  function getObjectiveItems() {
    return Array.prototype.slice.call(objectivesListEl.querySelectorAll('.objective-item'));
  }

  function getSelectedObjectives() {
    var items = getObjectiveItems();
    var selected = [];
    items.forEach(function (li) {
      var checkbox = li.querySelector('input[type=checkbox]');
      if (checkbox && checkbox.checked) {
        selected.push({
          text: li.dataset.text,
          prohibitions: JSON.parse(li.dataset.prohibitions || '[]')
        });
      }
    });
    selected.forEach(function (o, idx) { o.number = idx + 1; });
    return selected;
  }

  function buildProhibitedRows(selectedObjectives) {
    return prohibitedUses.map(function (pu) {
      var nums = selectedObjectives
        .filter(function (o) { return o.prohibitions.indexOf(pu.shortName) !== -1; })
        .map(function (o) { return o.number; });
      return { use: pu.use, rationale: pu.rationale, nums: nums };
    }).filter(function (row) { return row.nums.length > 0; });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function buildOutputs() {
    var intro = introTextEl.value.trim();
    var selected = getSelectedObjectives();
    var prohibitedRows = buildProhibitedRows(selected);

    // ---- HTML version (for the on-page preview and rich-text clipboard copy) ----
    var html = '';
    html += '<p>' + escapeHtml(intro) + '</p>';

    html += '<ol>';
    selected.forEach(function (o) {
      html += '<li>' + escapeHtml(o.text) + '</li>';
    });
    html += '</ol>';

    if (prohibitedRows.length > 0) {
      html += '<table border="1" cellspacing="0" cellpadding="6">';
      html += '<thead><tr><th>Prohibited AI use</th><th>Rationale</th><th>Learning objective(s)</th></tr></thead>';
      html += '<tbody>';
      prohibitedRows.forEach(function (row) {
        html += '<tr><td>' + escapeHtml(row.use) + '</td><td>' + escapeHtml(row.rationale) +
          '</td><td>' + escapeHtml(row.nums.join(', ')) + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p><em>No prohibited AI uses apply to the learning objectives selected so far.</em></p>';
    }

    html += '<p>The following AI uses are permitted:</p>';
    html += '<ul>';
    permittedUses.forEach(function (pu) {
      html += '<li>' + escapeHtml(pu.use) + '</li>';
    });
    html += '</ul>';

    // ---- Plain-text version (tab-separated table, for the clipboard fallback) ----
    var lines = [];
    lines.push(intro);
    lines.push('');
    selected.forEach(function (o) {
      lines.push(o.number + '. ' + o.text);
    });
    lines.push('');
    if (prohibitedRows.length > 0) {
      lines.push('Prohibited AI use\tRationale\tLearning objective(s)');
      prohibitedRows.forEach(function (row) {
        lines.push(row.use + '\t' + row.rationale + '\t' + row.nums.join(', '));
      });
    } else {
      lines.push('No prohibited AI uses apply to the learning objectives selected so far.');
    }
    lines.push('');
    lines.push('The following AI uses are permitted:');
    permittedUses.forEach(function (pu) {
      lines.push('- ' + pu.use);
    });

    return { html: html, text: lines.join('\n') };
  }

  function renderPreview() {
    var outputs = buildOutputs();
    previewEl.innerHTML = outputs.html;
  }

  function showCopyFeedback(message, isError) {
    copyFeedbackEl.textContent = message;
    copyFeedbackEl.className = 'copy-feedback' + (isError ? ' error' : ' success');
    setTimeout(function () {
      copyFeedbackEl.textContent = '';
      copyFeedbackEl.className = 'copy-feedback';
    }, 3000);
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(textarea);
    return ok;
  }

  function reportFallbackCopy(text) {
    var ok = fallbackCopy(text);
    showCopyFeedback(ok ? 'Copied!' : 'Could not copy — please select and copy manually.', !ok);
  }

  function copyPolicy() {
    var outputs = buildOutputs();

    if (navigator.clipboard && window.ClipboardItem) {
      var item = new ClipboardItem({
        'text/plain': new Blob([outputs.text], { type: 'text/plain' }),
        'text/html': new Blob([outputs.html], { type: 'text/html' })
      });
      navigator.clipboard.write([item]).then(function () {
        showCopyFeedback('Copied!');
      }).catch(function () {
        if (navigator.clipboard.writeText) {
          navigator.clipboard.writeText(outputs.text).then(function () {
            showCopyFeedback('Copied!');
          }).catch(function () {
            reportFallbackCopy(outputs.text);
          });
        } else {
          reportFallbackCopy(outputs.text);
        }
      });
    } else {
      reportFallbackCopy(outputs.text);
    }
  }

  addObjectiveBtn.addEventListener('click', function () {
    var text = customObjectiveInput.value.trim();
    if (!text) return;
    objectivesListEl.appendChild(makeObjectiveItem(text, [], true, true));
    customObjectiveInput.value = '';
    renderPreview();
  });

  customObjectiveInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addObjectiveBtn.click();
    }
  });

  selectAllBtn.addEventListener('click', function () {
    getObjectiveItems().forEach(function (li) {
      li.querySelector('input[type=checkbox]').checked = true;
    });
    renderPreview();
  });

  clearAllBtn.addEventListener('click', function () {
    getObjectiveItems().forEach(function (li) {
      li.querySelector('input[type=checkbox]').checked = false;
    });
    renderPreview();
  });

  introTextEl.addEventListener('input', renderPreview);
  copyBtn.addEventListener('click', copyPolicy);

  statusEl.textContent = 'Loading learning objectives…';
  loadData().then(function () {
    statusEl.textContent = '';
    statusEl.style.display = 'none';
  }).catch(function (err) {
    statusEl.textContent = 'Could not load the shared spreadsheet (' + err.message +
      '). Make sure it is shared as "Anyone with the link can view," then reload this page. ' +
      'You can still add your own learning objectives below.';
    statusEl.className = 'status error';
  });
})();
