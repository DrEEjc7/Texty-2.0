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
        this.setTheme(this.state.theme);
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

            // === IMPROVED PASTE HANDLER ===
            this.elements.textInput.addEventListener('paste', (e) => {
                // Don't prevent default - let browser handle paste first
                setTimeout(() => {
                    // Get the current content after paste
                    const currentText = this.elements.textInput.value;
                    
                    // Check if we actually got HTML content from clipboard
                    const clipboardData = e.clipboardData || window.clipboardData;
                    const hasHtmlContent = clipboardData && clipboardData.types && 
                                         clipboardData.types.includes('text/html');
                    
                    // Only process if we detect rich formatting
                    if (hasHtmlContent) {
                        const htmlContent = clipboardData.getData('text/html');
                        if (htmlContent && htmlContent !== currentText) {
                            // Strip formatting from the HTML content
                            const cleanText = TextFormatter.stripFormatting(htmlContent);
                            this.elements.textInput.value = cleanText;
                            this.updateAnalysis();
                            this.showToast('Rich formatting stripped, line breaks preserved');
                            return;
                        }
                    }
                    
                    // For plain text or if HTML processing didn't change anything, just update analysis
                    this.updateAnalysis();
                }, 10); // Small delay to let paste complete
            });
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
        
        // Update statistics efficiently
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
        if (element && element.textContent !== value) {
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
            const originalValue = this.elements.textInput.value;
            const strippedValue = TextFormatter.stripFormatting(originalValue);
            
            if (originalValue !== strippedValue) {
                this.elements.textInput.value = strippedValue;
                this.updateAnalysis();
                this.showToast('Formatting stripped');
            } else {
                this.showToast('No formatting to strip');
            }
            
            this.setButtonLoading('stripFormatBtn', false);
        }, 100);
    }

    autoFormat() {
        if (!this.elements.textInput) return;
        
        this.setButtonLoading('autoFormatBtn', true);
        
        setTimeout(() => {
            const originalValue = this.elements.textInput.value;
            const formattedValue = TextFormatter.autoFormat(originalValue);
            
            if (originalValue !== formattedValue) {
                this.elements.textInput.value = formattedValue;
                this.updateAnalysis();
                this.showToast('Text auto-formatted');
            } else {
                this.showToast('Text already well-formatted');
            }
            
            this.setButtonLoading('autoFormatBtn', false);
        }, 100);
    }

    convertCase(caseType) {
        if (!this.elements.textInput) return;
        
        const originalValue = this.elements.textInput.value;
        if (!originalValue.trim()) {
            this.showToast('No text to convert');
            return;
        }
        
        const convertedValue = CaseConverter.convert(originalValue, caseType);
        
        if (originalValue !== convertedValue) {
            this.elements.textInput.value = convertedValue;
            this.updateAnalysis();
            this.showToast(`Converted to ${caseType} case`);
        } else {
            this.showToast(`Text already in ${caseType} case`);
        }
    }

    // === LOREM GENERATOR ===
    generateLorem() {
        if (!this.elements.loremOutput) return;
        
        this.setButtonLoading('generateBtn', true);
        
        setTimeout(() => {
            try {
                const type = this.elements.loremType?.value || 'paragraphs';
                const count = Math.max(1, Math.min(50, parseInt(this.elements.loremCount?.value) || 3));
                const style = this.elements.loremStyle?.value || 'english';
                
                this.elements.loremOutput.value = LoremGenerator.generate(type, count, style);
                this.showToast('Lorem text generated');
            } catch (error) {
                console.error('Lorem generation error:', error);
                this.showToast('Error generating lorem text');
            } finally {
                this.setButtonLoading('generateBtn', false);
            }
        }, 200);
    }
    
    // === UTILITY METHODS ===
    generateInitialLorem() {
        if (this.elements.loremOutput && !this.elements.loremOutput.value.trim()) {
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
        if (!element || !element.value.trim()) {
            this.showToast('Nothing to copy');
            return;
        }
        
        try {
            await TextUtils.copyToClipboard(element.value);
            this.showToast(message);
        } catch (err) {
            console.error('Copy failed:', err);
            this.showToast('Failed to copy');
        }
    }

    clearText(elementId) {
        const element = this.elements[elementId];
        if (!element) return;
        
        if (!element.value.trim()) {
            this.showToast('Nothing to clear');
            return;
        }
        
        element.value = '';
        if (elementId === 'textInput') {
            this.updateAnalysis();
        }
        this.showToast('Text cleared');
    }

    setButtonLoading(buttonId, loading) {
        const button = this.elements[buttonId];
        if (!button) return;
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showToast(message) {
        if (!this.elements.toast || !message) return;
        
        const messageElement = this.elements.toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        // Clear any existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.elements.toast.classList.add('show');
        this.toastTimeout = setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2500);
    }

    // === KEYBOARD SHORTCUTS ===
    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            let handled = true;
            
            switch(e.key.toLowerCase()) {
                case 'k':
                    this.clearText('textInput');
                    break;
                case 'f':
                    this.autoFormat();
                    break;
                case 's':
                    this.stripFormatting();
                    break;
                case 'g':
                    this.generateLorem();
                    break;
                case 'd':
                    this.toggleTheme();
                    break;
                default:
                    handled = false;
            }
            
            if (handled) {
                e.preventDefault();
            }
        }
        
        // Escape key closes toast
        if (e.key === 'Escape' && this.elements.toast?.classList.contains('show')) {
            this.elements.toast.classList.remove('show');
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
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
        
        // Show user-friendly error
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #ef4444; color: white; padding: 1rem 2rem;
            border-radius: 8px; z-index: 9999; font-family: sans-serif;
        `;
        errorDiv.textContent = 'Failed to load TEXTY. Please refresh the page.';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }
});

// === KEYBOARD SHORTCUTS HELP ===
document.addEventListener('keydown', (e) => {
    if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        
        const shortcuts = [
            'Ctrl/Cmd + K - Clear text',
            'Ctrl/Cmd + F - Auto format',
            'Ctrl/Cmd + S - Strip formatting',
            'Ctrl/Cmd + G - Generate lorem',
            'Ctrl/Cmd + D - Toggle theme',
            'Shift + ? - Show this help',
            'Escape - Close notifications'
        ];
        
        alert(`TEXTY Keyboard Shortcuts:\n\n${shortcuts.join('\n')}`);
    }
});
