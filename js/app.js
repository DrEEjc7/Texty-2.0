/**
 * TEXTY V4 — Main Application Controller
 * Handles DOM, events, and all app logic.
 */
class TextyApp {
    constructor() {
        this.elements = {};
        const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.state = {
            theme:            localStorage.getItem('texty-theme') || systemTheme,
            lastAnalyzedText: '',
            lastAnalysisResult: null,
            undoSnapshot:     null,      // text before last transform
            findMatches:      [],        // [{start, end}, ...]
            findCurrentIndex: -1,
            findPanelOpen:    false,
            activeTab:        'stats',
            // Writing Limit Tracker
            limitValue:       null,
            limitType:        'chars',
            activePreset:     null,
        };

        this.MAX_TEXT_LENGTH   = 100_000;
        this.AUTOSAVE_INTERVAL = 30_000;

        this.autoSaveTimer  = null;
        this.analysisTimer  = null;
        this.rafId          = null;
        this.toastTimer     = null;

        this.init();
    }

    // ─────────────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────────────
    init() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.setTheme(this.state.theme);
            this.setCurrentYear();
            this.restoreAutoSave();

            if (this.elements.textInput?.value) {
                this.updateAnalysis();
            }

            window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
                this.showToast('An error occurred. Please refresh if issues persist.');
            });

            window.addEventListener('beforeunload', () => {
                this.performAutoSave();
                this.cleanup();
            });
        } catch (err) {
            console.error('Initialization error:', err);
        }
    }

    cacheElements() {
        const $ = id => document.getElementById(id);
        this.elements = {
            // Textarea
            textInput:            $('textInput'),

            // Toolbar — Format group
            stripFormatBtn:       $('stripFormatBtn'),
            removeDupesBtn:       $('removeDupesBtn'),
            smartQuotesBtn:       $('smartQuotesBtn'),
            findReplaceToggleBtn: $('findReplaceToggleBtn'),

            // Toolbar — Spacing group
            sentLineBtn:          $('sentLineBtn'),
            joinLinesBtn:         $('joinLinesBtn'),
            collapseSpacesBtn:    $('collapseSpacesBtn'),
            collapseBreaksBtn:    $('collapseBreaksBtn'),

            // Toolbar — Case group
            caseButtons:          document.querySelectorAll('[data-case]'),

            // Find & Replace panel
            findReplacePanel:     $('findReplacePanel'),
            findInput:            $('findInput'),
            replaceInput:         $('replaceInput'),
            matchCaseOpt:         $('matchCaseOpt'),
            wholeWordOpt:         $('wholeWordOpt'),
            regexOpt:             $('regexOpt'),
            findResultsCount:     $('findResultsCount'),
            findPrevBtn:          $('findPrevBtn'),
            findNextBtn:          $('findNextBtn'),
            replaceOneBtn:        $('replaceOneBtn'),
            replaceAllBtn:        $('replaceAllBtn'),
            findCloseBtn:         $('findCloseBtn'),

            // Action bar
            copyTextBtn:          $('copyTextBtn'),
            clearTextBtn:         $('clearTextBtn'),
            exportTextBtn:        $('exportTextBtn'),
            exportMdBtn:          $('exportMdBtn'),
            undoBtn:              $('undoBtn'),

            // Analytics — Stats
            wordCount:            $('wordCount'),
            uniqueWords:          $('uniqueWords'),
            charCount:            $('charCount'),
            sentenceCount:        $('sentenceCount'),
            paragraphCount:       $('paragraphCount'),
            avgWordLength:        $('avgWordLength'),
            readingTime:          $('readingTime'),
            readabilityScore:     $('readabilityScore'),
            keywordsList:         $('keywordsList'),

            // Analytics — Tabs
            statsTabBtn:          $('statsTabBtn'),
            formattingTabBtn:     $('formattingTabBtn'),
            statsPanel:           $('statsPanel'),
            formattingPanel:      $('formattingPanel'),
            formattingBadge:      $('formattingBadge'),
            formattingEmpty:      $('formattingEmpty'),
            formattingList:       $('formattingList'),

            // Theme
            themeToggle:          $('themeToggle'),

            // Toast
            toast:                $('toast'),

            // Shortcuts modal
            shortcutsModal:       $('shortcutsModal'),
            shortcutsModalClose:  $('shortcutsModalClose'),
            shortcutsHintBtn:     $('shortcutsHintBtn'),

            // Footer
            currentYear:          $('currentYear'),

            // Writing Limit Tracker
            limitInput:           $('limitInput'),
            limitTypeSelect:      $('limitTypeSelect'),
            limitBarWrap:         $('limitBarWrap'),
            limitBarFill:         $('limitBarFill'),
            limitCounter:         $('limitCounter'),
            limitClearBtn:        $('limitClearBtn'),
        };
    }

    bindEvents() {
        const el = this.elements;

        // ── Textarea: input (debounced analysis) ──
        el.textInput?.addEventListener('input', () => {
            const len = el.textInput.value.length;
            const delay = len > 10000 ? 500 : len > 5000 ? 350 : 250;
            clearTimeout(this.analysisTimer);
            this.analysisTimer = setTimeout(() => {
                this.updateAnalysis();
                this.analysisTimer = null;
            }, delay);
            this.scheduleAutoSave();
            if (this.state.findPanelOpen) this.updateFindResults();
        });

        // ── Textarea: paste (clean HTML, detect formatting) ──
        el.textInput?.addEventListener('paste', (e) => {
            e.preventDefault();
            const cd        = e.clipboardData || window.clipboardData;
            const html      = cd.getData('text/html');
            const plainText = cd.getData('text/plain');

            // Detect formatting before stripping
            if (html) {
                const fmt = FormattingExtractor.extractFormatting(html);
                this.displayFormatting(fmt);
            } else {
                this.clearFormattingDisplay();
            }

            const clean = TextFormatter.stripFormatting(html || plainText);
            
            if (!document.execCommand('insertText', false, clean)) {
                // Fallback for browsers that do not support insertText natively
                const start = el.textInput.selectionStart;
                const end   = el.textInput.selectionEnd;
                el.textInput.setRangeText(clean, start, end, 'end');
                el.textInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // ── Toolbar: Format buttons ──
        this.bindBtn('stripFormatBtn',       () => this.stripFormatting());
        this.bindBtn('removeDupesBtn',       () => this.removeDuplicateLines());
        this.bindBtn('smartQuotesBtn',       () => this.convertSmartQuotes());
        this.bindBtn('findReplaceToggleBtn', () => this.toggleFindReplace());

        // ── Toolbar: Spacing buttons ──
        this.bindBtn('sentLineBtn',       () => this.sentencesPerLine());
        this.bindBtn('joinLinesBtn',      () => this.joinLines());
        this.bindBtn('collapseSpacesBtn', () => this.collapseSpaces());
        this.bindBtn('collapseBreaksBtn', () => this.collapseBreaks());

        // ── Toolbar: Case buttons ──
        el.caseButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.convertCase(btn.dataset.case));
        });

        // ── Find & Replace ──
        el.findInput?.addEventListener('input', () => this.updateFindResults());
        el.matchCaseOpt?.addEventListener('change', () => this.updateFindResults());
        el.wholeWordOpt?.addEventListener('change', () => this.updateFindResults());
        el.regexOpt?.addEventListener('change',     () => this.updateFindResults());
        this.bindBtn('findPrevBtn',   () => this.findPrev());
        this.bindBtn('findNextBtn',   () => this.findNext());
        this.bindBtn('replaceOneBtn', () => this.replaceOne());
        this.bindBtn('replaceAllBtn', () => this.replaceAll());
        this.bindBtn('findCloseBtn',  () => this.closeFindReplace());

        // ── Action bar ──
        this.bindBtn('copyTextBtn',   () => this.copyText());
        this.bindBtn('clearTextBtn',  () => this.clearText());
        this.bindBtn('exportTextBtn', () => this.exportAs('txt'));
        this.bindBtn('exportMdBtn',   () => this.exportAs('md'));
        this.bindBtn('undoBtn',       () => this.undoLastChange());

        // ── Analytics tabs ──
        el.statsTabBtn?.addEventListener('click',      () => this.switchTab('stats'));
        el.formattingTabBtn?.addEventListener('click', () => this.switchTab('formatting'));

        // ── Clickable stat items (copy value) ──
        document.querySelectorAll('.stat-item').forEach(item => {
            item.addEventListener('click', () => {
                const valueEl = item.querySelector('.stat-value');
                const labelEl = item.querySelector('.stat-label');
                if (!valueEl) return;
                const val   = valueEl.textContent.trim();
                const label = labelEl?.textContent.trim() || 'Value';
                TextUtils.copyToClipboard(val)
                    .then(() => this.showToast(`${label}: ${val} — copied`))
                    .catch(() => this.showToast('Failed to copy'));
            });
        });

        // ── Theme toggle ──
        this.bindBtn('themeToggle', () => this.toggleTheme());

        // ── Shortcuts modal ──
        el.shortcutsHintBtn?.addEventListener('click',   () => this.openShortcutsModal());
        el.shortcutsModalClose?.addEventListener('click', () => this.closeShortcutsModal());
        el.shortcutsModal?.addEventListener('click', (e) => {
            if (e.target === el.shortcutsModal) this.closeShortcutsModal();
        });

        // ── Writing Limit Tracker ──
        el.limitInput?.addEventListener('input', () => this.handleCustomLimit());
        el.limitTypeSelect?.addEventListener('change', () => this.handleCustomLimit());
        el.limitClearBtn?.addEventListener('click', () => this.clearLimit());
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () =>
                this.setPreset(parseInt(btn.dataset.preset), btn.dataset.type, btn)
            );
        });

        // ── Global keyboard ──
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    // Convenience: attach a click handler that catches errors
    bindBtn(id, handler) {
        const btn = this.elements[id] || document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            try { await handler(); }
            catch (err) {
                console.error(`Error in button "${id}":`, err);
                this.showToast('Operation failed. Please try again.');
            }
        });
    }

    // ─────────────────────────────────────────────
    //  THEME
    // ─────────────────────────────────────────────
    setTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('texty-theme', theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
    }

    updateThemeIcon(theme) {
        const el = this.elements.themeToggle;
        if (!el) return;
        const sun  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
        const moon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        el.innerHTML = theme === 'dark' ? sun : moon;
    }

    // ─────────────────────────────────────────────
    //  ANALYTICS TABS
    // ─────────────────────────────────────────────
    switchTab(tab) {
        this.state.activeTab = tab;
        const { statsTabBtn, formattingTabBtn, statsPanel, formattingPanel } = this.elements;

        if (tab === 'stats') {
            statsTabBtn?.classList.add('active');
            formattingTabBtn?.classList.remove('active');
            statsPanel?.classList.remove('hidden');
            formattingPanel?.classList.add('hidden');
            statsTabBtn?.setAttribute('aria-selected', 'true');
            formattingTabBtn?.setAttribute('aria-selected', 'false');
        } else {
            formattingTabBtn?.classList.add('active');
            statsTabBtn?.classList.remove('active');
            formattingPanel?.classList.remove('hidden');
            statsPanel?.classList.add('hidden');
            formattingTabBtn?.setAttribute('aria-selected', 'true');
            statsTabBtn?.setAttribute('aria-selected', 'false');
        }
    }

    // ─────────────────────────────────────────────
    //  TEXT ANALYSIS
    // ─────────────────────────────────────────────
    updateAnalysis() {
        const text = this.elements.textInput?.value || '';

        // Memoize — skip if unchanged
        if (text === this.state.lastAnalyzedText && this.state.lastAnalysisResult) return;

        const analysis = TextAnalyzer.analyze(text);
        this.state.lastAnalyzedText   = text;
        this.state.lastAnalysisResult = analysis;

        if (this.rafId) cancelAnimationFrame(this.rafId);

        this.rafId = requestAnimationFrame(() => {
            const e = this.elements;
            if (e.wordCount)        e.wordCount.textContent        = TextUtils.formatNumber(analysis.words);
            if (e.uniqueWords)      e.uniqueWords.textContent      = TextUtils.formatNumber(analysis.uniqueWords);
            if (e.charCount)        e.charCount.textContent        = TextUtils.formatNumber(analysis.characters);
            if (e.sentenceCount)    e.sentenceCount.textContent    = TextUtils.formatNumber(analysis.sentences);
            if (e.paragraphCount)   e.paragraphCount.textContent   = TextUtils.formatNumber(analysis.paragraphs);
            if (e.avgWordLength)    e.avgWordLength.textContent    = analysis.avgWordLength;
            if (e.readingTime)      e.readingTime.textContent      = analysis.readingTime;
            if (e.readabilityScore) e.readabilityScore.textContent = analysis.fleschScore;

            this.updateKeywords(analysis.keywords);
            this.updateLimitTracker();

            // Dynamic page title
            document.title = text.trim()
                ? `(${TextUtils.formatNumber(analysis.words)} words) — TEXTY`
                : 'TEXTY — Smart Text Processor';

            this.rafId = null;
        });
    }

    updateKeywords(keywords) {
        const el = this.elements.keywordsList;
        if (!el) return;

        if (!keywords.length) {
            el.innerHTML = '<span class="no-keywords">Start typing to see keywords\u2026</span>';
            return;
        }

        const frag = document.createDocumentFragment();
        keywords.forEach(word => {
            const span = document.createElement('span');
            span.className   = 'keyword-tag';
            span.textContent = word.toUpperCase();
            span.title       = `Click to copy "${word}"`;
            span.addEventListener('click', () => {
                TextUtils.copyToClipboard(word)
                    .then(() => this.showToast(`"${word}" copied`));
            });
            frag.appendChild(span);
        });

        el.textContent = '';
        el.appendChild(frag);
    }

    // ─────────────────────────────────────────────
    //  FORMATTING DISPLAY (Paste Formatting tab)
    // ─────────────────────────────────────────────
    displayFormatting(formatting) {
        const { formattingList, formattingEmpty, formattingBadge } = this.elements;
        if (!formattingList) return;

        const displayData = FormattingExtractor.formatForDisplay(formatting);

        if (!displayData?.length) {
            this.clearFormattingDisplay();
            return;
        }

        // Show badge on tab
        if (formattingBadge) {
            formattingBadge.hidden = false;
            formattingBadge.textContent = '•';
        }
        if (formattingEmpty) formattingEmpty.style.display = 'none';

        formattingList.textContent = '';
        const frag = document.createDocumentFragment();

        displayData.forEach(item => {
            if (!item.values.length) return;

            const group = document.createElement('div');
            group.className = 'formatting-group';

            const label = document.createElement('span');
            label.className   = 'formatting-label';
            label.textContent = item.label + ':';
            group.appendChild(label);

            const vals = document.createElement('div');
            vals.className = 'formatting-values';

            item.values.forEach(value => {
                const tag = document.createElement('span');
                tag.className = 'formatting-tag';

                if (item.label === 'Colors') {
                    const swatch = document.createElement('span');
                    swatch.className = 'color-swatch';
                    swatch.style.backgroundColor = value;
                    tag.appendChild(swatch);
                    tag.appendChild(document.createTextNode(value));
                } else {
                    tag.textContent = value;
                }

                vals.appendChild(tag);
            });

            group.appendChild(vals);
            frag.appendChild(group);
        });

        formattingList.appendChild(frag);
        // Badge signals new data; user switches tab themselves
    }

    clearFormattingDisplay() {
        const { formattingList, formattingEmpty, formattingBadge } = this.elements;
        if (formattingList)  formattingList.textContent = '';
        if (formattingEmpty) formattingEmpty.style.display = '';
        if (formattingBadge) formattingBadge.hidden = true;
    }

    // ─────────────────────────────────────────────
    //  SELECTION-AWARE TRANSFORM HELPER
    // ─────────────────────────────────────────────

    /**
     * Returns the current selection context from the textarea.
     * If text is selected, operates on the selection.
     * Otherwise, operates on the full text.
     */
    getSelectionContext() {
        const el = this.elements.textInput;
        if (!el) return null;

        const start = el.selectionStart;
        const end   = el.selectionEnd;
        const hasSelection = start !== end;

        return {
            fullText:     el.value,
            target:       hasSelection ? el.value.substring(start, end) : el.value,
            start:        hasSelection ? start : 0,
            end:          hasSelection ? end : el.value.length,
            hasSelection,
        };
    }

    /**
     * Applies a transform function to either the current selection or the full text.
     * Saves an undo snapshot before applying. Writes the result back to the textarea,
     * restores the cursor/selection, then triggers analysis and autosave.
     *
     * @param {function(string): string} fn  — pure transform: receives text, returns new text
     * @returns {{ applied: boolean, wasSelection: boolean }}
     */
    applyTransform(fn, isSpacing = false) {
        const ctx = this.getSelectionContext();
        if (!ctx) return { applied: false, wasSelection: false };

        let result = fn(ctx.target);
        let padStart = '';
        let padEnd = '';

        if (isSpacing && ctx.hasSelection) {
            const before = ctx.fullText.substring(0, ctx.start);
            const after  = ctx.fullText.substring(ctx.end);
            
            if (before.length > 0) {
                if (!before.endsWith('\n')) padStart = '\n\n';
                else if (!before.endsWith('\n\n')) padStart = '\n';
            }
            if (after.length > 0) {
                if (!after.startsWith('\n')) padEnd = '\n\n';
                else if (!after.startsWith('\n\n')) padEnd = '\n';
            }
            result = padStart + result + padEnd;
        }

        // Nothing changed — skip snapshot and DOM write
        if (result === ctx.target && !padStart && !padEnd) return { applied: false, wasSelection: ctx.hasSelection };

        this.saveUndoSnapshot();

        const el = this.elements.textInput;
        el.setRangeText(result, ctx.start, ctx.end);

        // Restore cursor: keep selection if one existed, otherwise place cursor at end of result
        const newStart = ctx.start + (ctx.hasSelection ? padStart.length : 0);
        const newEnd = newStart + fn(ctx.target).length;
        el.setSelectionRange(ctx.hasSelection ? newStart : newEnd, newEnd);

        el.dispatchEvent(new Event('input', { bubbles: true }));

        return { applied: true, wasSelection: ctx.hasSelection };
    }

    // ─────────────────────────────────────────────
    //  TEXT TRANSFORMS — Format
    // ─────────────────────────────────────────────
    stripFormatting() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.stripFormatting(t));
        if (applied) this.showToast(wasSelection ? 'Formatting stripped from selection' : 'Formatting stripped');
    }

    removeDuplicateLines() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.removeDuplicateLines(t));
        if (applied) this.showToast(wasSelection ? 'Duplicates removed from selection' : 'Duplicate lines removed');
        else         this.showToast('No duplicate lines found');
    }

    convertSmartQuotes() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.convertSmartQuotes(t));
        if (applied) this.showToast(wasSelection ? 'Quotes converted in selection' : 'Quotes converted');
        else         this.showToast('No quotes found to convert');
    }

    convertCase(caseType) {
        const { applied, wasSelection } = this.applyTransform(t => CaseConverter.convert(t, caseType));
        if (applied) this.showToast(wasSelection ? `Selection → ${caseType} case` : `Converted to ${caseType} case`);
    }

    // ─────────────────────────────────────────────
    //  TEXT TRANSFORMS — Spacing
    // ─────────────────────────────────────────────
    sentencesPerLine() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.sentencesPerLine(t), true);
        if (applied) this.showToast(wasSelection ? 'Sentences split & separated' : 'Sentences split to lines');
        else         this.showToast('No sentence breaks detected');
    }

    joinLines() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.joinLines(t), true);
        if (applied) this.showToast(wasSelection ? 'Lines joined & separated' : 'Lines joined into paragraphs');
        else         this.showToast('No hard line breaks to join');
    }

    collapseSpaces() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.collapseSpaces(t), true);
        if (applied) this.showToast(wasSelection ? 'Spaces collapsed & separated' : 'Extra spaces collapsed');
        else         this.showToast('No extra spaces found');
    }

    collapseBreaks() {
        const { applied, wasSelection } = this.applyTransform(t => TextFormatter.collapseBlankLines(t), true);
        if (applied) this.showToast(wasSelection ? 'Blank lines collapsed & separated' : 'Blank lines collapsed');
        else         this.showToast('No excess blank lines found');
    }

    // ─────────────────────────────────────────────
    //  UNDO
    // ─────────────────────────────────────────────
    saveUndoSnapshot() {
        this.state.undoSnapshot = this.elements.textInput?.value ?? null;
        if (this.elements.undoBtn) this.elements.undoBtn.disabled = false;
    }

    undoLastChange() {
        if (this.state.undoSnapshot === null || !this.elements.textInput) return;

        this.elements.textInput.value = this.state.undoSnapshot;
        this.state.undoSnapshot = null;

        if (this.elements.undoBtn) this.elements.undoBtn.disabled = true;

        this.updateAnalysis();
        this.performAutoSave(); // Persist restored text immediately
        this.showToast('Last change undone');
    }

    // ─────────────────────────────────────────────
    //  FIND & REPLACE
    // ─────────────────────────────────────────────
    toggleFindReplace() {
        this.state.findPanelOpen ? this.closeFindReplace() : this.openFindReplace();
    }

    openFindReplace() {
        this.state.findPanelOpen = true;
        this.elements.findReplacePanel?.classList.add('open');
        this.elements.findReplacePanel?.setAttribute('aria-hidden', 'false');
        this.elements.findReplaceToggleBtn?.classList.add('panel-open');
        this.elements.findInput?.focus();
        this.updateFindResults();
    }

    closeFindReplace() {
        this.state.findPanelOpen    = false;
        this.state.findMatches      = [];
        this.state.findCurrentIndex = -1;
        this.elements.findReplacePanel?.classList.remove('open');
        this.elements.findReplacePanel?.setAttribute('aria-hidden', 'true');
        this.elements.findReplaceToggleBtn?.classList.remove('panel-open');
        this.updateFindCount();
        this.elements.textInput?.focus();
    }

    buildFindRegex(flags = 'g') {
        const findText = this.elements.findInput?.value || '';
        if (!findText) return null;

        try {
            const matchCase = this.elements.matchCaseOpt?.checked;
            const wholeWord = this.elements.wholeWordOpt?.checked;
            const isRegex   = this.elements.regexOpt?.checked;
            let pattern = isRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (wholeWord) pattern = `\\b${pattern}\\b`;
            return new RegExp(pattern, flags + (matchCase ? '' : 'i'));
        } catch {
            return null;
        }
    }

    updateFindResults() {
        const findInput = this.elements.findInput;
        const findText  = findInput?.value || '';

        if (!findText) {
            this.state.findMatches      = [];
            this.state.findCurrentIndex = -1;
            findInput?.classList.remove('find-error');
            this.updateFindCount();
            return;
        }

        const regex = this.buildFindRegex('g');

        if (!regex) {
            // Invalid (e.g. broken regex)
            findInput?.classList.add('find-error');
            this.state.findMatches      = [];
            this.state.findCurrentIndex = -1;
            this.updateFindCount();
            return;
        }

        findInput?.classList.remove('find-error');

        const text    = this.elements.textInput?.value || '';
        const matches = [];
        let m;
        regex.lastIndex = 0;

        while ((m = regex.exec(text)) !== null) {
            matches.push({ start: m.index, end: m.index + m[0].length });
            if (m[0].length === 0) regex.lastIndex++; // guard against zero-length matches
        }

        this.state.findMatches = matches;
        if (this.state.findCurrentIndex >= matches.length) {
            this.state.findCurrentIndex = matches.length - 1;
        }
        this.updateFindCount();
    }

    updateFindCount() {
        const el    = this.elements.findResultsCount;
        if (!el) return;
        const count = this.state.findMatches.length;
        const idx   = this.state.findCurrentIndex;

        if (!this.elements.findInput?.value) {
            el.textContent = '';
            el.classList.remove('no-match');
        } else if (count === 0) {
            el.textContent = 'No matches';
            el.classList.add('no-match');
        } else {
            el.textContent = `${idx >= 0 ? idx + 1 : 1} of ${count}`;
            el.classList.remove('no-match');
        }
    }

    findNext() {
        if (!this.state.findMatches.length) { this.updateFindResults(); return; }
        this.state.findCurrentIndex =
            (this.state.findCurrentIndex + 1) % this.state.findMatches.length;
        this.jumpToMatch(this.state.findCurrentIndex);
    }

    findPrev() {
        if (!this.state.findMatches.length) { this.updateFindResults(); return; }
        this.state.findCurrentIndex =
            (this.state.findCurrentIndex - 1 + this.state.findMatches.length) % this.state.findMatches.length;
        this.jumpToMatch(this.state.findCurrentIndex);
    }

    jumpToMatch(index) {
        const match = this.state.findMatches[index];
        if (!match || !this.elements.textInput) return;
        this.elements.textInput.focus();
        this.elements.textInput.setSelectionRange(match.start, match.end);
        this.updateFindCount();
    }

    replaceOne() {
        const { findMatches, findCurrentIndex } = this.state;
        if (!findMatches.length) return;

        const idx   = findCurrentIndex >= 0 ? findCurrentIndex : 0;
        const match = findMatches[idx];
        if (!match) return;

        const replaceText = this.elements.replaceInput?.value || '';
        const text        = this.elements.textInput.value;
        const afterPos    = match.start + replaceText.length; // position after replacement

        this.saveUndoSnapshot();
        this.elements.textInput.setRangeText(replaceText, match.start, match.end, 'end');
        this.elements.textInput.dispatchEvent(new Event('input', { bubbles: true }));

        this.updateFindResults(); // recompute in updated text

        // Advance to next match at or after replacement position
        const nextIdx = this.state.findMatches.findIndex(m => m.start >= afterPos);
        if (nextIdx !== -1) {
            this.state.findCurrentIndex = nextIdx;
            this.jumpToMatch(nextIdx);
        } else if (this.state.findMatches.length > 0) {
            this.state.findCurrentIndex = 0; // wrap to first
            this.jumpToMatch(0);
        } else {
            this.state.findCurrentIndex = -1;
            this.updateFindCount();
        }

        this.showToast('Replaced 1 match');
    }

    replaceAll() {
        const { findMatches } = this.state;
        if (!findMatches.length) return;

        const regex = this.buildFindRegex('g');
        if (!regex) return;

        const replaceText = this.elements.replaceInput?.value || '';
        const count       = findMatches.length;
        const isRegex     = this.elements.regexOpt?.checked;

        this.saveUndoSnapshot();
        const text = this.elements.textInput.value;
        this.elements.textInput.value = isRegex 
            ? text.replace(regex, replaceText) 
            : text.replace(regex, () => replaceText);

        this.elements.textInput.dispatchEvent(new Event('input', { bubbles: true }));

        this.state.findMatches      = [];
        this.state.findCurrentIndex = -1;
        this.updateFindCount();
        this.showToast(`Replaced ${count} match${count !== 1 ? 'es' : ''}`);
    }

    // ─────────────────────────────────────────────
    //  ACTION BAR
    // ─────────────────────────────────────────────
    async copyText() {
        const text = this.elements.textInput?.value;
        if (!text) { this.showToast('Nothing to copy'); return; }
        try {
            await TextUtils.copyToClipboard(text);
            this.showToast('Text copied to clipboard');
        } catch {
            this.showToast('Failed to copy');
        }
    }

    clearText() {
        if (!this.elements.textInput) return;
        if (this.elements.textInput.value) this.saveUndoSnapshot();
        this.elements.textInput.value = '';
        this.updateAnalysis();
        this.elements.textInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.clearFormattingDisplay();
        localStorage.removeItem('texty-autosave');
        localStorage.removeItem('texty-autosave-time');
        this.showToast('Cleared');
    }

    exportAs(format = 'txt') {
        const text = this.elements.textInput?.value;
        if (!text) { this.showToast('Nothing to export'); return; }

        try {
            let content = text;
            const ext   = format === 'md' ? 'md' : 'txt';

            if (format === 'md') {
                // Wrap paragraphs in a clean markdown structure
                content = text
                    .split(/\n\s*\n/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .join('\n\n');
            }

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            const ts   = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const a    = Object.assign(document.createElement('a'), {
                href: url, download: `texty-export-${ts}.${ext}`, style: 'display:none'
            });

            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

            this.showToast(`Exported as .${ext}`);
        } catch (err) {
            console.error('Export failed:', err);
            this.showToast('Export failed');
        }
    }

    // ─────────────────────────────────────────────
    //  AUTO-SAVE
    // ─────────────────────────────────────────────
    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => this.performAutoSave(), this.AUTOSAVE_INTERVAL);
    }

    performAutoSave() {
        const text = this.elements.textInput?.value ?? '';
        try {
            if (text.length) {
                localStorage.setItem('texty-autosave', text);
                localStorage.setItem('texty-autosave-time', Date.now().toString());
            } else {
                // Text is empty — clear the persisted session
                localStorage.removeItem('texty-autosave');
                localStorage.removeItem('texty-autosave-time');
            }
        } catch { /* storage full or blocked — silent */ }
    }

    restoreAutoSave() {
        try {
            const saved     = localStorage.getItem('texty-autosave');
            const savedTime = localStorage.getItem('texty-autosave-time');
            if (saved && savedTime) {
                const hoursSince = (Date.now() - parseInt(savedTime)) / 3_600_000;
                if (hoursSince < 24 && !this.elements.textInput?.value) {
                    this.elements.textInput.value = saved;
                    this.showToast('Previous session restored');
                }
            }
        } catch { /* silent */ }
    }

    // ─────────────────────────────────────────────
    //  SHORTCUTS MODAL
    // ─────────────────────────────────────────────
    openShortcutsModal() {
        this.elements.shortcutsModal?.classList.add('open');
        this.elements.shortcutsModal?.setAttribute('aria-hidden', 'false');
    }

    closeShortcutsModal() {
        this.elements.shortcutsModal?.classList.remove('open');
        this.elements.shortcutsModal?.setAttribute('aria-hidden', 'true');
    }

    // ─────────────────────────────────────────────
    //  KEYBOARD SHORTCUTS
    // ─────────────────────────────────────────────
    handleKeydown(e) {
        const ctrl  = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        // Ctrl+H → toggle Find & Replace
        if (ctrl && !shift && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            this.toggleFindReplace();
            return;
        }

        // Ctrl+Z → undo (only when we have our own snapshot)
        if (ctrl && !shift && e.key.toLowerCase() === 'z' && this.state.undoSnapshot !== null) {
            e.preventDefault();
            this.undoLastChange();
            return;
        }

        // Ctrl+Shift+C → copy
        if (ctrl && shift && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            this.copyText();
            return;
        }

        // Ctrl+Shift+E → export .txt
        if (ctrl && shift && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            this.exportAs('txt');
            return;
        }

        // Ctrl+Shift+L → clear
        if (ctrl && shift && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            this.clearText();
            return;
        }

        // Shift+? → shortcuts modal
        if (!ctrl && shift && e.key === '?') {
            e.preventDefault();
            this.openShortcutsModal();
            return;
        }

        // Enter in find input → find next
        if (e.key === 'Enter' &&
            this.state.findPanelOpen &&
            document.activeElement === this.elements.findInput) {
            e.preventDefault();
            shift ? this.findPrev() : this.findNext();
            return;
        }

        // Escape → close panels in priority order
        if (e.key === 'Escape') {
            if (this.elements.shortcutsModal?.classList.contains('open')) {
                this.closeShortcutsModal();
            } else if (this.state.findPanelOpen) {
                this.closeFindReplace();
            } else if (this.elements.toast?.classList.contains('show')) {
                this.elements.toast.classList.remove('show');
            }
        }
    }

    // ─────────────────────────────────────────────
    //  UTILITIES
    // ─────────────────────────────────────────────
    setCurrentYear() {
        if (this.elements.currentYear) {
            this.elements.currentYear.textContent = new Date().getFullYear();
        }
    }

    showToast(message) {
        const el = this.elements.toast;
        if (!el) return;

        clearTimeout(this.toastTimer);
        el.classList.remove('show');

        const msgEl = el.querySelector('.toast-message');
        if (msgEl) msgEl.textContent = message;

        requestAnimationFrame(() => el.classList.add('show'));

        this.toastTimer = setTimeout(() => {
            el.classList.remove('show');
            this.toastTimer = null;
        }, 2500);
    }

    // ─────────────────────────────────────────────
    //  WRITING LIMIT TRACKER
    // ─────────────────────────────────────────────
    setPreset(value, type, btn) {
        this.state.limitValue   = value;
        this.state.limitType    = type;
        this.state.activePreset = String(value);

        if (this.elements.limitInput) this.elements.limitInput.value = '';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn?.classList.add('active');

        this.updateLimitTracker();
    }

    handleCustomLimit() {
        const value = parseInt(this.elements.limitInput?.value);
        const type  = this.elements.limitTypeSelect?.value || 'chars';

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.state.activePreset = null;

        if (value && value > 0) {
            this.state.limitValue = value;
            this.state.limitType  = type;
        } else {
            this.state.limitValue = null;
        }

        this.updateLimitTracker();
    }

    clearLimit() {
        this.state.limitValue   = null;
        this.state.limitType    = 'chars';
        this.state.activePreset = null;

        if (this.elements.limitInput) this.elements.limitInput.value = '';
        if (this.elements.limitTypeSelect) this.elements.limitTypeSelect.value = 'chars';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));

        this.updateLimitTracker();
    }

    updateLimitTracker() {
        const { limitValue, limitType, lastAnalysisResult } = this.state;
        const { limitBarWrap, limitBarFill, limitCounter } = this.elements;
        if (!limitBarWrap) return;

        if (!limitValue) {
            limitBarWrap.classList.remove('visible');
            return;
        }

        limitBarWrap.classList.add('visible');

        let current = 0;
        if (lastAnalysisResult) {
            current = limitType === 'words' ? lastAnalysisResult.words : lastAnalysisResult.characters;
        } else {
            const text = this.elements.textInput?.value || '';
            current = limitType === 'words'
                ? (text.trim() ? text.trim().split(/\s+/).length : 0)
                : text.length;
        }

        const pct    = Math.min((current / limitValue) * 100, 100);
        const isOver = current > limitValue;
        const unit   = limitType === 'words' ? 'words' : 'chars';

        if (limitBarFill) {
            limitBarFill.style.width = `${pct}%`;
            limitBarFill.classList.toggle('over-limit', isOver);
        }

        if (limitCounter) {
            if (isOver) {
                const over = (current - limitValue).toLocaleString();
                limitCounter.textContent = `${over} ${unit} over limit`;
                limitCounter.classList.add('over-limit');
            } else {
                const left = (limitValue - current).toLocaleString();
                limitCounter.textContent =
                    `${current.toLocaleString()} / ${limitValue.toLocaleString()} ${unit} · ${left} left`;
                limitCounter.classList.remove('over-limit');
            }
        }
    }

    // ─────────────────────────────────────────────
    //  CLEANUP
    // ─────────────────────────────────────────────
    cleanup() {
        clearTimeout(this.autoSaveTimer);
        clearTimeout(this.analysisTimer);
        clearTimeout(this.toastTimer);
        if (this.rafId) cancelAnimationFrame(this.rafId);
    }
}

// ── APPLICATION STARTUP ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.textyApp = new TextyApp();
    } catch (err) {
        console.error('Failed to initialize TEXTY:', err);
    }
});
