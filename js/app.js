/**
 * TEXTY v2 - Main Application Controller
 * Handles DOM, events, and app initialization.
 */
class TextyApp {
    constructor() {
        this.elements = {};
        this.state = {
            theme: localStorage.getItem('texty-theme') || 'light'
        };
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setTheme(this.state.theme); // Set initial theme
        this.setCurrentYear();
        this.generateInitialLorem();
        this.updateAnalysis();
    }

    cacheElements() {
        // Cache all DOM elements here for performance
        this.elements.textInput = document.getElementById('textInput');
        this.elements.stripFormatBtn = document.getElementById('stripFormatBtn');
        this.elements.autoFormatBtn = document.getElementById('autoFormatBtn');
        this.elements.caseButtons = document.querySelectorAll('[data-case]');
        this.elements.loremType = document.getElementById('loremType');
        this.elements.loremCount = document.getElementById('loremCount');
        this.elements.loremStyle = document.getElementById('loremStyle');
        this.elements.loremOutput = document.getElementById('loremOutput');
        this.elements.generateBtn = document.getElementById('generateBtn');
        this.elements.copyLoremBtn = document.getElementById('copyLoremBtn');
        this.elements.clearLoremBtn = document.getElementById('clearLoremBtn');
        this.elements.wordCount = document.getElementById('wordCount');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.sentenceCount = document.getElementById('sentenceCount');
        this.elements.paragraphCount = document.getElementById('paragraphCount');
        this.elements.readingTime = document.getElementById('readingTime');
        this.elements.readabilityScore = document.getElementById('readabilityScore');
        this.elements.gradeLevel = document.getElementById('gradeLevel');
        this.elements.keywordsList = document.getElementById('keywordsList');
        this.elements.themeToggle = document.getElementById('themeToggle');
        this.elements.toast = document.getElementById('toast');
    }

    bindEvents() {
        // Text input with debounced analysis
        this.elements.textInput.addEventListener('input', TextUtils.debounce(() => this.updateAnalysis(), 250));
        
        // Buttons
        this.elements.stripFormatBtn.addEventListener('click', () => this.stripFormatting());
        this.elements.autoFormatBtn.addEventListener('click', () => this.autoFormat());
        this.elements.generateBtn.addEventListener('click', () => this.generateLorem());
        this.elements.copyLoremBtn.addEventListener('click', () => this.copyText('loremOutput', 'Lorem copied'));
        this.elements.clearLoremBtn.addEventListener('click', () => this.clearText('loremOutput'));
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Dynamic event listeners
        this.elements.caseButtons.forEach(btn => btn.addEventListener('click', () => this.convertCase(btn.dataset.case)));
        ['loremType', 'loremCount', 'loremStyle'].forEach(id => this.elements[id].addEventListener('change', () => this.generateLorem()));
    }

    // === THEME MANAGEMENT ===
    setTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('texty-theme', theme);
        this.updateThemeIcon(theme);
    }

    toggleTheme() {
        const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    updateThemeIcon(theme) {
        const sunIcon = `<svg class="theme-icon sun-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
        const moonIcon = `<svg class="theme-icon moon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        this.elements.themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    }

    // === CORE APP LOGIC ===
    updateAnalysis() {
        const analysis = TextAnalyzer.analyze(this.elements.textInput.value);
        Object.keys(analysis).forEach(key => this.updateElement(key, analysis[key]));
        this.updateKeywords(analysis.keywords);
    }

    updateElement(id, value) {
        const el = this.elements[id];
        if (!el) return;
        if (typeof value === 'number') value = value.toLocaleString();
        if (id === 'readingTime') value = `${value}m`;
        el.textContent = value;
    }
    
    updateKeywords(keywords) {
        if (keywords.length === 0) {
            this.elements.keywordsList.innerHTML = '<span class="no-keywords">Start typing...</span>';
        } else {
            this.elements.keywordsList.innerHTML = keywords.map(w => `<span class="keyword-tag">${w.toUpperCase()}</span>`).join('');
        }
    }

    stripFormatting() {
        this.elements.textInput.value = TextFormatter.stripFormatting(this.elements.textInput.value);
        this.updateAnalysis();
        this.showToast('Formatting stripped');
    }

    autoFormat() {
        this.elements.textInput.value = TextFormatter.autoFormat(this.elements.textInput.value);
        this.updateAnalysis();
        this.showToast('Text auto-formatted');
    }

    convertCase(caseType) {
        this.elements.textInput.value = CaseConverter.convert(this.elements.textInput.value, caseType);
        this.updateAnalysis();
        this.showToast(`Converted to ${caseType} case`);
    }

    generateLorem() {
        const { loremType, loremCount, loremStyle } = this.elements;
        this.elements.loremOutput.value = LoremGenerator.generate(loremType.value, parseInt(loremCount.value), loremStyle.value);
    }
    
    // === UTILITY METHODS ===
    generateInitialLorem = () => !this.elements.loremOutput.value && this.generateLorem();
    setCurrentYear = () => document.getElementById('currentYear').textContent = new Date().getFullYear();

    async copyText(elementId, message) {
        const text = this.elements[elementId].value;
        if (!text) return;
        await TextUtils.copyToClipboard(text);
        this.showToast(message);
    }

    clearText(elementId) {
        this.elements[elementId].value = '';
        if (elementId === 'textInput') this.updateAnalysis();
    }

    showToast(message) {
        this.elements.toast.querySelector('.toast-message').textContent = message;
        this.elements.toast.classList.add('show');
        setTimeout(() => this.elements.toast.classList.remove('show'), 2500);
    }
}

// === APPLICATION STARTUP ===
document.addEventListener('DOMContentLoaded', () => new TextyApp());
