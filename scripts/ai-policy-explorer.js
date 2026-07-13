(function () {
    'use strict';

    var SHEET_ID = '1SjI6gLqJGou1bHjTPHzLq3VDc7P6N6wxa3fj2b7tfVU';
    var SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit?gid=848342384#gid=848342384';

    var TAB_PROHIBITED = 'Consolidated Prohibited Uses';
    var TAB_ALLOWED = 'Allowed Uses to Support Learning';

    var STORAGE_KEY = 'aiPolicyExplorer.selections.v2';
    var JSONP_TIMEOUT_MS = 12000;

    var state = {
        prohibited: [],   // array of strings
        allowed: [],        // array of {number, profile, supports, guardrail, key}
        selectedProhibited: {}, // use text -> use text
        selectedAllowed: {}     // key -> allowed object
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
            jsonpFetchSheet(TAB_ALLOWED)
        ]).then(function (results) {
            state.prohibited = parseProhibitedTable(results[0].table);
            state.allowed = parseAllowedTable(results[1].table);

            if (!state.prohibited.length || !state.allowed.length) {
                throw new Error('Sheet loaded but expected columns/tabs were not found.');
            }
        });
    }

    function loadFallbackSnapshot() {
        var snap = window.AI_POLICY_FALLBACK_SNAPSHOT;
        state.prohibited = snap.prohibited.slice();
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
                prohibitedKeys: Object.keys(state.selectedProhibited),
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

        var prohibitedSet = {};
        state.prohibited.forEach(function (p) { prohibitedSet[p] = p; });
        (payload.prohibitedKeys || []).forEach(function (k) {
            if (prohibitedSet[k]) { state.selectedProhibited[k] = k; }
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

    function slugify(str) {
        return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    }

    function renderProhibitedList() {
        el.prohibitedList.innerHTML = '';
        state.prohibited.forEach(function (use) {
            var li = document.createElement('li');
            li.className = 'card-item';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            var checkboxId = 'prohibited-cb-' + slugify(use);
            checkbox.id = checkboxId;
            checkbox.checked = !!state.selectedProhibited[use];
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) {
                    state.selectedProhibited[use] = use;
                } else {
                    delete state.selectedProhibited[use];
                }
                saveSelections();
                renderCollectionBox();
            });

            var body = document.createElement('div');
            body.className = 'card-body';

            var label = document.createElement('label');
            label.setAttribute('for', checkboxId);

            var text = document.createElement('span');
            text.className = 'card-text';
            text.textContent = use;

            label.appendChild(text);
            body.appendChild(label);

            li.appendChild(checkbox);
            li.appendChild(body);
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

    function renderCollectionBox() {
        var prohibitedKeys = Object.keys(state.selectedProhibited);
        var allowedKeys = Object.keys(state.selectedAllowed);

        el.prohibitedCount.textContent = String(prohibitedKeys.length);
        el.allowedCount.textContent = String(allowedKeys.length);

        el.selectedProhibited.innerHTML = '';
        if (!prohibitedKeys.length) {
            el.selectedProhibited.className = 'selection-list empty';
            var emptyLi = document.createElement('li');
            emptyLi.className = 'empty-msg';
            emptyLi.textContent = 'No prohibited uses selected yet.';
            el.selectedProhibited.appendChild(emptyLi);
        } else {
            el.selectedProhibited.className = 'selection-list';
            prohibitedKeys.forEach(function (key) {
                var use = state.selectedProhibited[key];
                var li = document.createElement('li');
                li.className = 'selection-item';

                var title = document.createElement('span');
                title.className = 'item-title';
                title.textContent = use;

                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.setAttribute('aria-label', 'Remove');
                removeBtn.addEventListener('click', function () {
                    delete state.selectedProhibited[key];
                    saveSelections();
                    renderCollectionBox();
                });

                li.appendChild(title);
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

        syncCheckboxes();

        el.copyBtn.disabled = (prohibitedKeys.length + allowedKeys.length) === 0;
    }

    function syncCheckboxes() {
        Array.prototype.forEach.call(el.prohibitedList.querySelectorAll('input[type="checkbox"]'), function (cb, i) {
            var use = state.prohibited[i];
            if (use !== undefined) { cb.checked = !!state.selectedProhibited[use]; }
        });
        Array.prototype.forEach.call(el.allowedList.querySelectorAll('input[type="checkbox"]'), function (cb, i) {
            var item = state.allowed[i];
            if (item) { cb.checked = !!state.selectedAllowed[item.key]; }
        });
    }

    function buildClipboardText() {
        var prohibitedKeys = Object.keys(state.selectedProhibited);
        var allowedKeys = Object.keys(state.selectedAllowed);

        if (!prohibitedKeys.length && !allowedKeys.length) {
            return '';
        }

        var lines = [];
        lines.push('AI Use Policy for This Course');
        lines.push('');
        lines.push('Many students are looking for ways to enhance their learning with GenAI tools. At the same time, many uses of GenAI can undermine students’ learning and instructors’ ability to assess students’ learning and give feedback for growth. In this course, the following guidelines are meant to clarify what uses are detrimental to student learning and which may be supportive.');

        if (prohibitedKeys.length) {
            lines.push('');
            lines.push('PROHIBITED USES OF GENERATIVE AI');
            lines.push('Based on the learning outcomes, assessments and learning activities of this course, the following uses of generative AI are not permitted unless otherwise specified on an assignment:');
            prohibitedKeys.forEach(function (key) {
                lines.push('● ' + state.selectedProhibited[key]);
            });
        }

        if (allowedKeys.length) {
            lines.push('');
            lines.push('PERMITTED USES OF GENERATIVE AI (WITH GUARDRAILS)');
            lines.push('The following uses of generative AI are permitted in this course. Given that GenAI tools can often hallucinate or produce incorrect information, students are responsible for double-checking all AI output.');
            allowedKeys.forEach(function (key) {
                var a = state.selectedAllowed[key];
                lines.push('● ' + a.profile + ': ' + a.supports + ' ' + a.guardrail);
            });
        }

        lines.push('');
        lines.push('Students should reach out to the course instructor(s) if they have questions about this policy. If a GenAI use case not listed here may be supportive for your learning, check with the instructor first.');

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
        if (!Object.keys(state.selectedProhibited).length && !Object.keys(state.selectedAllowed).length) { return; }
        if (!window.confirm('Clear all selected prohibited and allowed uses from your policy list?')) { return; }
        state.selectedProhibited = {};
        state.selectedAllowed = {};
        saveSelections();
        renderCollectionBox();
    }

    function attachStaticHandlers() {
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
