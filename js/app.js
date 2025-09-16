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
        // Cache all DOM elements for performance
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
        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('input',
                TextUtils.debounce(() => this.updateAnalysis(), 250)
            );

            // --- Start of new, corrected paste handler ---
            this.elements.textInput.addEventListener('paste', (e) => {
                e.preventDefault(); // Stop the browser's default paste behavior

                // Get the pasted text from the clipboard, preferring HTML content
                const pastedHtml = (e.clipboardData || window.clipboardData).getData('text/html');
                const pastedText = (e.clipboardData || window.clipboardData).getData('text/plain');

                // Use our improved function to clean the text from HTML if available, otherwise use plain text
                const cleanText = TextFormatter.stripFormatting(pastedHtml || pastedText);

                // Insert the clean text into the textarea
                // Using document.execCommand for better undo/redo support
                if (document.execCommand('insertText', false, cleanText)) {
                    // It worked, now we manually trigger the analysis update
                    this.updateAnalysis();
                } else {
                    // Fallback for browsers that don't support insertText
                    const start = this.elements.textInput.selectionStart;
                    const end = this.elements.textInput.selectionEnd;
                    const text = this.elements.textInput.value;
                    this.elements.textInput.value = text.substring(0, start) + cleanText + text.substring(end);
                    this.updateAnalysis();
                }
            });
            // --- End of new, corrected paste handler ---
        }

        // Button event listeners
        this.bindButtonEvent('stripFormatBtn', () => this.stripFormatting());
        this.bindButtonEvent('autoFormatBtn', () => this.autoFormat());
        this.bindButtonEvent('generateBtn', () => this.generateLorem());
        this.bindButtonEvent('copyLoremBtn', () => this.copyText('loremOutput', 'Lorem copied to clipboard'));
        this.bindButtonEvent('clearLoremBtn', () => this.clearText('loremOutput'));
        this.bindButtonEvent('themeToggle', () => this.toggleTheme());

        // Case conversion buttons
        this.elements.caseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.convertCase(btn.dataset.case);
            });
        });

        // Lorem settings auto-regenerate
        ['loremType', 'loremCount', 'loremStyle'].forEach(id => {
            if (this.elements[id]) {
                this.elements[id].addEventListener('change', () => this.generateLorem());
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    bindButtonEvent(elementKey, handler) {
        if (this.elements[elementKey]) {
            this.elements[elementKey].addEventListener('click', handler);
        }
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
        if (!this.elements.themeToggle) return;
        
        const sunIcon = `<svg class="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`;
        
        const moonIcon = `<svg class="theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`;
        
        this.elements.themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    }

    // === CORE APP LOGIC ===
    updateAnalysis() {
        const text = this.elements.textInput?.value || '';
        const analysis = TextAnalyzer.analyze(text);
        
        // Update statistics
        this.updateElement('wordCount', TextUtils.formatNumber(analysis.words));
        this.updateElement('charCount', TextUtils.formatNumber(analysis.characters));
        this.updateElement('sentenceCount', TextUtils.formatNumber(analysis.sentences));
        this.updateElement('paragraphCount', TextUtils.formatNumber(analysis.paragraphs));
        this.updateElement('readingTime', `${analysis.readingTime}m`);
        this.updateElement('readabilityScore', analysis.fleschScore);
        this.updateElement('gradeLevel', analysis.gradeLevel);
        
        this.updateKeywords(analysis.keywords);
    }

    updateElement(id, value) {
        const element = this.elements[id];
        if (element) {
            element.textContent = value;
        }
    }
    
    updateKeywords(keywords) {
        if (!this.elements.keywordsList) return;
        
        if (keywords.length === 0) {
            this.elements.keywordsList.innerHTML = '<span class="no-keywords">Start typing to see keywords...</span>';
        } else {
            this.elements.keywordsList.innerHTML = keywords
                .map(word => `<span class="keyword-tag">${word.toUpperCase()}</span>`)
                .join('');
        }
    }

    // === TEXT PROCESSING ===
    stripFormatting() {
        if (!this.elements.textInput) return;
        
        this.setButtonLoading('stripFormatBtn', true);
        
        setTimeout(() => {
            this.elements.textInput.value = TextFormatter.stripFormatting(this.elements.textInput.value);
            this.updateAnalysis();
            this.setButtonLoading('stripFormatBtn', false);
            this.showToast('Formatting stripped');
        }, 100);
    }

    autoFormat() {
        if (!this.elements.textInput) return;
        
        this.setButtonLoading('autoFormatBtn', true);
        
        setTimeout(() => {
            this.elements.textInput.value = TextFormatter.autoFormat(this.elements.textInput.value);
            this.updateAnalysis();
            this.setButtonLoading('autoFormatBtn', false);
            this.showToast('Text auto-formatted');
        }, 100);
    }

    convertCase(caseType) {
        if (!this.elements.textInput) return;
        
        this.elements.textInput.value = CaseConverter.convert(this.elements.textInput.value, caseType);
        this.updateAnalysis();
        this.showToast(`Converted to ${caseType} case`);
    }

    // === LOREM GENERATOR ===
    generateLorem() {
        if (!this.elements.loremOutput) return;
        
        this.setButtonLoading('generateBtn', true);
        
        setTimeout(() => {
            const type = this.elements.loremType?.value || 'paragraphs';
            const count = parseInt(this.elements.loremCount?.value) || 3;
            const style = this.elements.loremStyle?.value || 'english';
            
            this.elements.loremOutput.value = LoremGenerator.generate(type, count, style);
            this.setButtonLoading('generateBtn', false);
            this.showToast('Lorem text generated');
        }, 200);
    }
    
    // === UTILITY METHODS ===
    generateInitialLorem() {
        if (this.elements.loremOutput && !this.elements.loremOutput.value) {
            this.generateLorem();
        }
    }

    setCurrentYear() {
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    async copyText(elementId, message = 'Copied to clipboard') {
        const element = this.elements[elementId];
        if (!element || !element.value) {
            this.showToast('Nothing to copy');
            return;
        }
        
        try {
            await TextUtils.copyToClipboard(element.value);
            this.showToast(message);
        } catch (err) {
            this.showToast('Failed to copy');
        }
    }

    clearText(elementId) {
        const element = this.elements[elementId];
        if (element) {
            element.value = '';
            if (elementId === 'textInput') {
                this.updateAnalysis();
            }
            this.showToast('Text cleared');
        }
    }

    setButtonLoading(buttonId, loading) {
        const button = this.elements[buttonId];
        if (button) {
            if (loading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    }

    showToast(message) {
        if (!this.elements.toast) return;
        
        const messageElement = this.elements.toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        this.elements.toast.classList.add('show');
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2500);
    }

    // === KEYBOARD SHORTCUTS ===
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'k':
                    e.preventDefault();
                    this.clearText('textInput');
                    break;
                case 'f':
                    e.preventDefault();
                    this.autoFormat();
                    break;
                case 's':
                    e.preventDefault();
                    this.stripFormatting();
                    break;
                case 'g':
                    e.preventDefault();
                    this.generateLorem();
                    break;
                case 'd':
                    e.preventDefault();
                    this.toggleTheme();
                    break;
            }
        }
        
        // Escape key closes toast
        if (e.key === 'Escape') {
            if (this.elements.toast?.classList.contains('show')) {
                this.elements.toast.classList.remove('show');
            }
        }
    }
}

// === APPLICATION STARTUP ===
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.textyApp = new TextyApp();
    } catch (error) {
        console.error('Failed to initialize TEXTY:', error);
    }
});

// === KEYBOARD SHORTCUTS HELP ===
document.addEventListener('keydown', (e) => {
    if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        alert(`TEXTY Keyboard Shortcuts:
        
Ctrl/Cmd + K - Clear text
Ctrl/Cmd + F - Auto format
Ctrl/Cmd + S - Strip formatting  
Ctrl/Cmd + G - Generate lorem
Ctrl/Cmd + D - Toggle theme
Shift + ? - Show this help
Escape - Close notifications`);
    }
});
