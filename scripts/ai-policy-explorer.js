(function () {
    'use strict';

    var SHEET_ID = '1uBkb0-Oqj8Je69D9v2wPgOBkZhPZXXgyTUySHuPu4mk';
    var SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit?gid=53592962#gid=53592962';

    var TAB_PROHIBITED = 'Consolidated Prohibited Uses';
    var TAB_OUTCOMES = 'Outcomes with Prohibited Uses';
    var TAB_ALLOWED = 'Allowed Uses to Support Learning';

    var STORAGE_KEY = 'aiPolicyExplorer.selections.v1';
    var JSONP_TIMEOUT_MS = 12000;

    var state = {
        prohibited: [],   // array of strings
        outcomes: [],      // array of {knowledgeArea, courseLevel, bloom, fink, outcome, prohibitedUse, key}
        allowed: [],        // array of {number, profile, supports, guardrail, key}
        selectedOutcomes: {}, // key -> outcome object
        selectedAllowed: {}   // key -> allowed object
    };

    var callbackCounter = 0;

    function jsonpFetchSheet(sheetName) {
        return new Promise(function (resolve, reject) {
            var cbName = '__aiPolicyExplorerCb' + (callbackCounter++);
            var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
                '/gviz/tq?tqx=out:json;responseHandler:' + cbName +
                '&sheet=' + encodeURIComponent(sheetName) + '&headers=1';

            var script = document.createElement('script');
            var timeoutId;
            var finished = false;

            function cleanup() {
                finished = true;
                clearTimeout(timeoutId);
                delete window[cbName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }

            window[cbName] = function (data) {
                if (finished) { return; }
                cleanup();
                resolve(data);
            };

            script.onerror = function () {
                if (finished) { return; }
                cleanup();
                reject(new Error('Failed to load sheet "' + sheetName + '" (network or permissions error).'));
            };

            timeoutId = setTimeout(function () {
                if (finished) { return; }
                cleanup();
                reject(new Error('Timed out loading sheet "' + sheetName + '".'));
            }, JSONP_TIMEOUT_MS);

            script.src = url;
            document.head.appendChild(script);
        });
    }

    function findColumnIndex(cols, needle) {
        for (var i = 0; i < cols.length; i++) {
            var label = (cols[i].label || '').toLowerCase();
            if (label.indexOf(needle) !== -1) {
                return i;
            }
        }
        return -1;
    }

    function cellValue(row, idx) {
        if (idx === -1 || !row.c[idx]) { return ''; }
        var cell = row.c[idx];
        if (cell.v === null || cell.v === undefined) { return ''; }
        return String(cell.v).trim();
    }

    function parseProhibitedTable(table) {
        var out = [];
        (table.rows || []).forEach(function (row) {
            if (!row.c || !row.c[0] || row.c[0].v === null || row.c[0].v === undefined) { return; }
            var v = String(row.c[0].v).trim();
            if (v) { out.push(v); }
        });
        return out;
    }

    function parseOutcomesTable(table) {
        var cols = table.cols;
        var idx = {
            knowledgeArea: findColumnIndex(cols, 'knowledge area'),
            courseLevel: findColumnIndex(cols, 'course level'),
            bloom: findColumnIndex(cols, 'bloom'),
            fink: findColumnIndex(cols, 'fink'),
            outcome: findColumnIndex(cols, 'example learning outcome'),
            prohibitedUse: findColumnIndex(cols, 'prohibited genai use')
        };
        var out = [];
        (table.rows || []).forEach(function (row) {
            if (!row.c) { return; }
            var item = {
                knowledgeArea: cellValue(row, idx.knowledgeArea),
                courseLevel: cellValue(row, idx.courseLevel),
                bloom: cellValue(row, idx.bloom),
                fink: cellValue(row, idx.fink),
                outcome: cellValue(row, idx.outcome),
                prohibitedUse: cellValue(row, idx.prohibitedUse)
            };
            if (!item.outcome && !item.prohibitedUse) { return; }
            item.key = item.outcome + '||' + item.prohibitedUse;
            out.push(item);
        });
        return out;
    }

    function parseAllowedTable(table) {
        var cols = table.cols;
        var idx = {
            number: findColumnIndex(cols, 'number'),
            profile: findColumnIndex(cols, 'genai use profile'),
            supports: findColumnIndex(cols, 'how it supports learning'),
            guardrail: findColumnIndex(cols, 'guardrail')
        };
        var out = [];
        (table.rows || []).forEach(function (row) {
            if (!row.c) { return; }
            var item = {
                number: cellValue(row, idx.number),
                profile: cellValue(row, idx.profile),
                supports: cellValue(row, idx.supports),
                guardrail: cellValue(row, idx.guardrail)
            };
            if (!item.profile) { return; }
            item.key = item.profile;
            out.push(item);
        });
        return out;
    }

    function loadLiveData() {
        return Promise.all([
            jsonpFetchSheet(TAB_PROHIBITED),
            jsonpFetchSheet(TAB_OUTCOMES),
            jsonpFetchSheet(TAB_ALLOWED)
        ]).then(function (results) {
            state.prohibited = parseProhibitedTable(results[0].table);
            state.outcomes = parseOutcomesTable(results[1].table);
            state.allowed = parseAllowedTable(results[2].table);

            if (!state.prohibited.length || !state.outcomes.length || !state.allowed.length) {
                throw new Error('Sheet loaded but expected columns/tabs were not found.');
            }
        });
    }

    function loadFallbackSnapshot() {
        var snap = window.AI_POLICY_FALLBACK_SNAPSHOT;
        state.prohibited = snap.prohibited.slice();
        state.outcomes = snap.outcomes.map(function (o) {
            return {
                knowledgeArea: o.knowledgeArea,
                courseLevel: o.courseLevel,
                bloom: o.bloom,
                fink: o.fink,
                outcome: o.outcome,
                prohibitedUse: o.prohibitedUse,
                key: o.outcome + '||' + o.prohibitedUse
            };
        });
        state.allowed = snap.allowed.map(function (a) {
            return {
                number: a.number,
                profile: a.profile,
                supports: a.supports,
                guardrail: a.guardrail,
                key: a.profile
            };
        });
    }

    // ---------- Persistence ----------

    function saveSelections() {
        try {
            var payload = {
                outcomeKeys: Object.keys(state.selectedOutcomes),
                allowedKeys: Object.keys(state.selectedAllowed)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) { /* ignore storage errors */ }
    }

    function restoreSelections() {
        var raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) { return; }
        if (!raw) { return; }
        var payload;
        try {
            payload = JSON.parse(raw);
        } catch (e) { return; }

        var outcomeByKey = {};
        state.outcomes.forEach(function (o) { outcomeByKey[o.key] = o; });
        (payload.outcomeKeys || []).forEach(function (k) {
            if (outcomeByKey[k]) { state.selectedOutcomes[k] = outcomeByKey[k]; }
        });

        var allowedByKey = {};
        state.allowed.forEach(function (a) { allowedByKey[a.key] = a; });
        (payload.allowedKeys || []).forEach(function (k) {
            if (allowedByKey[k]) { state.selectedAllowed[k] = allowedByKey[k]; }
        });
    }

    // ---------- Rendering ----------

    var el = {};

    function cacheElements() {
        el.statusBanner = document.getElementById('status-banner');
        el.app = document.getElementById('app');
        el.sheetLink = document.getElementById('sheet-link');
        el.prohibitedList = document.getElementById('prohibited-list');
        el.allowedList = document.getElementById('allowed-list');
        el.selectedProhibited = document.getElementById('selected-prohibited');
        el.selectedAllowed = document.getElementById('selected-allowed');
        el.prohibitedCount = document.getElementById('prohibited-count');
        el.allowedCount = document.getElementById('allowed-count');
        el.copyBtn = document.getElementById('copy-btn');
        el.clearBtn = document.getElementById('clear-btn');
        el.modalOverlay = document.getElementById('outcome-modal');
        el.modalTitle = document.getElementById('modal-title');
        el.modalOutcomeList = document.getElementById('modal-outcome-list');
        el.modalClose = document.getElementById('modal-close');
    }

    function showStatus(message, type) {
        el.statusBanner.textContent = message;
        el.statusBanner.className = 'status-banner ' + type;
        el.statusBanner.hidden = false;
    }

    function hideStatus() {
        el.statusBanner.hidden = true;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function renderProhibitedList() {
        el.prohibitedList.innerHTML = '';
        state.prohibited.forEach(function (use) {
            var li = document.createElement('li');
            li.className = 'pill-item';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = use;
            btn.addEventListener('click', function () { openOutcomeModal(use); });
            li.appendChild(btn);
            el.prohibitedList.appendChild(li);
        });
    }

    function renderAllowedList() {
        el.allowedList.innerHTML = '';
        state.allowed.forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'card-item';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            var checkboxId = 'allowed-cb-' + slugify(item.key);
            checkbox.id = checkboxId;
            checkbox.checked = !!state.selectedAllowed[item.key];
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) {
                    state.selectedAllowed[item.key] = item;
                } else {
                    delete state.selectedAllowed[item.key];
                }
                saveSelections();
                renderCollectionBox();
            });

            var body = document.createElement('div');
            body.className = 'card-body';

            var label = document.createElement('label');
            label.setAttribute('for', checkboxId);

            var title = document.createElement('span');
            title.className = 'card-title';
            title.textContent = item.profile;

            var supports = document.createElement('span');
            supports.className = 'card-supports';
            supports.textContent = item.supports;

            label.appendChild(title);
            label.appendChild(supports);

            var guardrail = document.createElement('p');
            guardrail.className = 'card-guardrail';
            guardrail.innerHTML = '<strong>Guardrail:</strong> ' + escapeHtml(item.guardrail);

            body.appendChild(label);
            body.appendChild(guardrail);

            li.appendChild(checkbox);
            li.appendChild(body);
            el.allowedList.appendChild(li);
        });
    }

    function slugify(str) {
        return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    }

    function openOutcomeModal(prohibitedUse) {
        el.modalTitle.textContent = prohibitedUse;
        el.modalOutcomeList.innerHTML = '';

        var matches = state.outcomes.filter(function (o) { return o.prohibitedUse === prohibitedUse; });

        if (!matches.length) {
            var none = document.createElement('li');
            none.className = 'no-results';
            none.textContent = 'No example learning outcomes found for this use.';
            el.modalOutcomeList.appendChild(none);
        } else {
            matches.forEach(function (o) {
                var li = document.createElement('li');
                li.className = 'outcome-item';

                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                var checkboxId = 'outcome-cb-' + slugify(o.key);
                checkbox.id = checkboxId;
                checkbox.checked = !!state.selectedOutcomes[o.key];
                checkbox.addEventListener('change', function () {
                    if (checkbox.checked) {
                        state.selectedOutcomes[o.key] = o;
                    } else {
                        delete state.selectedOutcomes[o.key];
                    }
                    saveSelections();
                    renderCollectionBox();
                });

                var label = document.createElement('label');
                label.setAttribute('for', checkboxId);

                var text = document.createElement('span');
                text.className = 'outcome-text';
                text.textContent = o.outcome;

                var meta = document.createElement('span');
                meta.className = 'outcome-meta';
                meta.textContent = [o.knowledgeArea, o.courseLevel, o.bloom, o.fink].filter(Boolean).join(' • ');

                label.appendChild(text);
                label.appendChild(meta);

                li.appendChild(checkbox);
                li.appendChild(label);
                el.modalOutcomeList.appendChild(li);
            });
        }

        el.modalOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        el.modalOverlay.hidden = true;
        document.body.style.overflow = '';
    }

    function renderCollectionBox() {
        var outcomeKeys = Object.keys(state.selectedOutcomes);
        var allowedKeys = Object.keys(state.selectedAllowed);

        el.prohibitedCount.textContent = String(outcomeKeys.length);
        el.allowedCount.textContent = String(allowedKeys.length);

        el.selectedProhibited.innerHTML = '';
        if (!outcomeKeys.length) {
            el.selectedProhibited.className = 'selection-list empty';
            var emptyLi = document.createElement('li');
            emptyLi.className = 'empty-msg';
            emptyLi.textContent = 'No learning outcomes selected yet.';
            el.selectedProhibited.appendChild(emptyLi);
        } else {
            el.selectedProhibited.className = 'selection-list';
            outcomeKeys.forEach(function (key) {
                var o = state.selectedOutcomes[key];
                var li = document.createElement('li');
                li.className = 'selection-item';

                var title = document.createElement('span');
                title.className = 'item-title';
                title.textContent = o.outcome;

                var meta = document.createElement('span');
                meta.className = 'item-meta';
                meta.textContent = 'Prohibited: ' + o.prohibitedUse;

                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.setAttribute('aria-label', 'Remove');
                removeBtn.addEventListener('click', function () {
                    delete state.selectedOutcomes[key];
                    saveSelections();
                    renderCollectionBox();
                });

                li.appendChild(title);
                li.appendChild(meta);
                li.appendChild(removeBtn);
                el.selectedProhibited.appendChild(li);
            });
        }

        el.selectedAllowed.innerHTML = '';
        if (!allowedKeys.length) {
            el.selectedAllowed.className = 'selection-list empty';
            var emptyLi2 = document.createElement('li');
            emptyLi2.className = 'empty-msg';
            emptyLi2.textContent = 'No allowed uses selected yet.';
            el.selectedAllowed.appendChild(emptyLi2);
        } else {
            el.selectedAllowed.className = 'selection-list';
            allowedKeys.forEach(function (key) {
                var a = state.selectedAllowed[key];
                var li = document.createElement('li');
                li.className = 'selection-item';

                var title = document.createElement('span');
                title.className = 'item-title';
                title.textContent = a.profile;

                var meta = document.createElement('span');
                meta.className = 'item-meta';
                meta.textContent = 'Guardrail: ' + a.guardrail;

                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.setAttribute('aria-label', 'Remove');
                removeBtn.addEventListener('click', function () {
                    delete state.selectedAllowed[key];
                    saveSelections();
                    renderCollectionBox();
                });

                li.appendChild(title);
                li.appendChild(meta);
                li.appendChild(removeBtn);
                el.selectedAllowed.appendChild(li);
            });
        }

        // keep checkbox states in sync everywhere they might be visible
        syncCheckboxes();

        el.copyBtn.disabled = (outcomeKeys.length + allowedKeys.length) === 0;
    }

    function syncCheckboxes() {
        Array.prototype.forEach.call(el.allowedList.querySelectorAll('input[type="checkbox"]'), function (cb, i) {
            var item = state.allowed[i];
            if (item) { cb.checked = !!state.selectedAllowed[item.key]; }
        });
    }

    function buildClipboardText() {
        var lines = [];
        lines.push('AI Use Policy for This Course');
        lines.push('');

        var outcomeKeys = Object.keys(state.selectedOutcomes);
        if (outcomeKeys.length) {
            lines.push('PROHIBITED USES OF GENERATIVE AI');
            lines.push('The following uses of generative AI are not permitted for the associated learning outcomes in this course:');
            outcomeKeys.forEach(function (key) {
                var o = state.selectedOutcomes[key];
                lines.push('- Learning outcome: ' + o.outcome);
                lines.push('  Prohibited use: ' + o.prohibitedUse);
            });
            lines.push('');
        }

        var allowedKeys = Object.keys(state.selectedAllowed);
        if (allowedKeys.length) {
            lines.push('PERMITTED USES OF GENERATIVE AI (WITH GUARDRAILS)');
            lines.push('The following uses of generative AI are permitted in this course, subject to the stated guardrails:');
            allowedKeys.forEach(function (key) {
                var a = state.selectedAllowed[key];
                lines.push('- ' + a.profile + ': ' + a.supports);
                lines.push('  Guardrail: ' + a.guardrail);
            });
            lines.push('');
        }

        if (!outcomeKeys.length && !allowedKeys.length) {
            return '';
        }

        return lines.join('\n').trim() + '\n';
    }

    function handleCopy() {
        var text = buildClipboardText();
        if (!text) { return; }

        function onSuccess() {
            var original = 'Copy to Clipboard';
            el.copyBtn.textContent = 'Copied!';
            el.copyBtn.classList.add('copied');
            setTimeout(function () {
                el.copyBtn.textContent = original;
                el.copyBtn.classList.remove('copied');
            }, 1800);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess, function () {
                fallbackCopy(text, onSuccess);
            });
        } else {
            fallbackCopy(text, onSuccess);
        }
    }

    function fallbackCopy(text, onSuccess) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (e) { /* ignore */ }
        document.body.removeChild(textarea);
    }

    function handleClearAll() {
        if (!Object.keys(state.selectedOutcomes).length && !Object.keys(state.selectedAllowed).length) { return; }
        if (!window.confirm('Clear all selected prohibited and allowed uses from your policy list?')) { return; }
        state.selectedOutcomes = {};
        state.selectedAllowed = {};
        saveSelections();
        renderCollectionBox();
    }

    function attachStaticHandlers() {
        el.modalClose.addEventListener('click', closeModal);
        el.modalOverlay.addEventListener('click', function (evt) {
            if (evt.target === el.modalOverlay) { closeModal(); }
        });
        document.addEventListener('keydown', function (evt) {
            if (evt.key === 'Escape' && !el.modalOverlay.hidden) { closeModal(); }
        });
        el.copyBtn.addEventListener('click', handleCopy);
        el.clearBtn.addEventListener('click', handleClearAll);
        el.sheetLink.href = SHEET_EDIT_URL;
    }

    function init() {
        cacheElements();
        attachStaticHandlers();

        loadLiveData()
            .then(function () {
                hideStatus();
            })
            .catch(function (err) {
                showStatus(
                    'Could not load live data from the Google Sheet (' + err.message + '). ' +
                    'Showing a saved snapshot instead — open the sheet directly for the latest version.',
                    'error'
                );
                loadFallbackSnapshot();
            })
            .then(function () {
                restoreSelections();
                renderProhibitedList();
                renderAllowedList();
                renderCollectionBox();
                el.app.hidden = false;
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
