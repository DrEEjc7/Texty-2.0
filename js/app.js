/**
 * TEXTY - Text Processing Engine & Application Controller
 * Core text manipulation, analysis utilities, and DOM interaction
 */

// === TEXT STATISTICS ===
class TextAnalyzer {
    static analyze(text) {
        if (!text || !text.trim()) {
            return this.getEmptyStats();
        }

        const words = this.getWords(text);
        const sentences = this.getSentences(text);
        const paragraphs = this.getParagraphs(text);
        const characters = text.length;
        const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
        const avgSyllablesPerWord = this.calculateAvgSyllables(words);
        const fleschScore = this.calculateFleschScore(avgWordsPerSentence, avgSyllablesPerWord);
        
        return {
            words: words.length,
            characters,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            readingTime: Math.ceil(words.length / 200),
            fleschScore: Math.round(fleschScore),
            gradeLevel: this.getGradeLevel(fleschScore),
            keywords: this.extractKeywords(words)
        };
    }

    static getEmptyStats() {
        return {
            words: 0, characters: 0, sentences: 0, paragraphs: 0,
            readingTime: 0, fleschScore: 0, gradeLevel: '—', keywords: []
        };
    }

    static getWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }

    static getSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    static getParagraphs(text) {
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    }

    static countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
    
    static calculateAvgSyllables(words) {
        if (words.length === 0) return 0;
        return words.reduce((total, word) => total + this.countSyllables(word), 0) / words.length;
    }

    static calculateFleschScore(avgWords, avgSyllables) {
        return 206.835 - (1.015 * avgWords) - (84.6 * avgSyllables);
    }

    static getGradeLevel(score) {
        if (score >= 90) return '5th Grade';
        if (score >= 80) return '6th Grade';
        if (score >= 70) return '7th Grade';
        if (score >= 60) return '8th-9th Grade';
        if (score >= 50) return '10th-12th Grade';
        if (score >= 30) return 'College';
        return 'Graduate';
    }

    static extractKeywords(words) {
        const stopWords = new Set([
            'the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 
            'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'any'
        ]);
        
        const wordCount = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (cleanWord.length > 2 && !stopWords.has(cleanWord)) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });
        
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([word]) => word);
    }
}

// === TEXT FORMATTING ===
class TextFormatter {
    static stripFormatting(text) {
        if (!text) return '';
        
        // Remove HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;
        
        // Normalize whitespace
        return text.replace(/[ \t]+/g, ' ')
                  .replace(/\n\s*\n\s*/g, '\n\n')
                  .trim();
    }

    static autoFormat(text) {
        if (!text || !text.trim()) return '';
        
        const paragraphs = text.split(/\n\s*\n/);
        
        const formatLine = (line) => {
            return line.replace(/\s+/g, ' ').trim()
                .replace(/\s+([,.!?;:])/g, '$1')
                .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
                .replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
                .replace(/\bi\b/g, 'I')
                .replace(/\s+'/g, "'")
                .replace(/'\s+/g, "'");
        };
        
        return paragraphs
            .map(p => p.split('\n').map(formatLine).filter(Boolean).join('\n'))
            .filter(Boolean)
            .join('\n\n');
    }
}

// === CASE CONVERSION ===
class CaseConverter {
    static convert(text, caseType) {
        if (!text) return '';
        
        switch(caseType) {
            case 'upper': 
                return text.toUpperCase();
            case 'lower': 
                return text.toLowerCase();
            case 'title': 
                return text.replace(/\w\S*/g, txt => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
            case 'sentence': 
                return text.toLowerCase().replace(/(^|\. *)([a-z])/g, (_, p1, p2) => 
                    p1 + p2.toUpperCase()
                );
            default: 
                return text;
        }
    }
}

// === LOREM IPSUM GENERATOR ===
class LoremGenerator {
    static libraries = {
        latin: [
            'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 
            'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore'
        ],
        english: [
            'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'beautiful',
            'landscape', 'mountain', 'river', 'forest', 'sunshine', 'peaceful', 'journey'
        ],
        tech: [
            'algorithm', 'database', 'framework', 'application', 'interface', 'protocol', 
            'cloud', 'microservices', 'container', 'kubernetes', 'docker', 'api'
        ],
        business: [
            'strategy', 'growth', 'innovation', 'market', 'customer', 'revenue', 'profit', 
            'investment', 'portfolio', 'stakeholder', 'partnership', 'collaboration'
        ]
    };

    static generate(type, count, style) {
        const library = this.libraries[style] || this.libraries.english;
        
        if (type === 'words') return this.generateWords(count, library);
        if (type === 'sentences') return this.generateSentences(count, library);
        return this.generateParagraphs(count, library);
    }

    static generateWords(count, lib) {
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(lib[Math.floor(Math.random() * lib.length)]);
        }
        return words.join(' ') + '.';
    }

    static generateSentences(count, lib) {
        const sentences = [];
        for (let i = 0; i < count; i++) {
            const wordCount = Math.floor(Math.random() * 10) + 5;
            const words = this.generateWords(wordCount, lib);
            sentences.push(words.charAt(0).toUpperCase() + words.slice(1));
        }
        return sentences.join(' ');
    }

    static generateParagraphs(count, lib) {
        const paragraphs = [];
        for (let i = 0; i < count; i++) {
            const sentenceCount = Math.floor(Math.random() * 4) + 3;
            paragraphs.push(this.generateSentences(sentenceCount, lib));
        }
        return paragraphs.join('\n\n');
    }
}

// === UTILITIES ===
class TextUtils {
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static formatNumber(num) {
        return num.toLocaleString();
    }
}

/**
 * TEXTY - Main Application Controller
 */
class TextyApp {
    constructor() {
        this.elements = {};
        this.state = {
            theme: 'light'
        };
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.initializeTheme();
        this.setCurrentYear();
        this.generateInitialLorem();
        this.updateAnalysis(); // Initialize with empty stats
    }

    cacheElements() {
        // Text processing elements
        this.elements.textInput = document.getElementById('textInput');
        this.elements.stripFormatBtn = document.getElementById('stripFormatBtn');
        this.elements.autoFormatBtn = document.getElementById('autoFormatBtn');
        this.elements.caseButtons = document.querySelectorAll('[data-case]');

        // Lorem generator elements
        this.elements.loremType = document.getElementById('loremType');
        this.elements.loremCount = document.getElementById('loremCount');
        this.elements.loremStyle = document.getElementById('loremStyle');
        this.elements.loremOutput = document.getElementById('loremOutput');
        this.elements.generateBtn = document.getElementById('generateBtn');
        this.elements.copyLoremBtn = document.getElementById('copyLoremBtn');
        this.elements.clearLoremBtn = document.getElementById('clearLoremBtn');

        // Statistics elements
        this.elements.wordCount = document.getElementById('wordCount');
        this.elements.charCount = document.getElementById('charCount');
        this.elements.sentenceCount = document.getElementById('sentenceCount');
        this.elements.paragraphCount = document.getElementById('paragraphCount');
        this.elements.readingTime = document.getElementById('readingTime');
        this.elements.readabilityScore = document.getElementById('readabilityScore');
        this.elements.gradeLevel = document.getElementById('gradeLevel');
        
        // Theme toggle and misc
        this.elements.themeToggle = document.getElementById('themeToggle');
        this.elements.keywordsList = document.getElementById('keywordsList');
        this.elements.toast = document.getElementById('toast');
    }

    bindEvents() {
        // Text input with debounced analysis
        if (this.elements.textInput) {
            this.elements.textInput.addEventListener('input', 
                TextUtils.debounce(() => this.updateAnalysis(), 250)
            );
            
            // Auto-format on paste
            this.elements.textInput.addEventListener('paste', () => {
                setTimeout(() => {
                    this.autoStripAndFormat();
                }, 50);
            });
        }

        // Text processing buttons
        this.bindButtonEvent('stripFormatBtn', () => this.stripFormatting());
        this.bindButtonEvent('autoFormatBtn', () => this.autoFormat());

        // Case converter buttons
        this.elements.caseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const caseType = btn.getAttribute('data-case');
                this.convertCase(caseType);
            });
        });

        // Lorem generator buttons
        this.bindButtonEvent('generateBtn', () => this.generateLorem());
        this.bindButtonEvent('copyLoremBtn', () => this.copyText('loremOutput'));
        this.bindButtonEvent('clearLoremBtn', () => this.clearText('loremOutput'));

        // Lorem settings auto-regenerate
        ['loremType', 'loremCount', 'loremStyle'].forEach(id => {
            const element = this.elements[id];
            if (element) {
                element.addEventListener('change', () => this.generateLorem());
            }
        });

        // Theme toggle
        this.bindButtonEvent('themeToggle', () => this.toggleTheme());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    bindButtonEvent(elementKey, handler) {
        if (this.elements[elementKey]) {
            this.elements[elementKey].addEventListener('click', handler);
        }
    }

    // === THEME MANAGEMENT ===
    initializeTheme() {
        const savedTheme = localStorage.getItem('texty-theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('texty-theme', theme);
        
        // Update theme toggle icon
        this.updateThemeIcon(theme);
    }

    updateThemeIcon(theme) {
        if (!this.elements.themeToggle) return;
        
        const iconHtml = theme === 'dark' 
            ? `<svg class="theme-icon sun-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <circle cx="12" cy="12" r="5"/>
                 <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
               </svg>`
            : `<svg class="theme-icon moon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
               </svg>`;
        
        this.elements.themeToggle.innerHTML = iconHtml;
    }

    // === TEXT ANALYSIS ===
    updateAnalysis() {
        const text = this.elements.textInput?.value || '';
        const analysis = TextAnalyzer.analyze(text);
        
        this.updateStatistics(analysis);
        this.updateKeywords(analysis.keywords);
    }

    updateStatistics(analysis) {
        this.updateElement('wordCount', TextUtils.formatNumber(analysis.words));
        this.updateElement('charCount', TextUtils.formatNumber(analysis.characters));
        this.updateElement('sentenceCount', TextUtils.formatNumber(analysis.sentences));
        this.updateElement('paragraphCount', TextUtils.formatNumber(analysis.paragraphs));
        this.updateElement('readingTime', `${analysis.readingTime}m`);
        this.updateElement('readabilityScore', analysis.fleschScore);
        this.updateElement('gradeLevel', analysis.gradeLevel);
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

    updateElement(id, value) {
        if (this.elements[id]) {
            this.elements[id].textContent = value;
        }
    }

    // === TEXT PROCESSING ===
    stripFormatting() {
        if (!this.elements.textInput) return;
        
        this.setButtonLoading('stripFormatBtn', true);
        
        setTimeout(() => {
            const formatted = TextFormatter.stripFormatting(this.elements.textInput.value);
            this.elements.textInput.value = formatted;
            this.updateAnalysis();
            this.setButtonLoading('stripFormatBtn', false);
            this.showToast('Formatting stripped');
        }, 100);
    }

    autoFormat() {
        if (!this.elements.textInput) return;
        
        this.setButtonLoading('autoFormatBtn', true);
        
        setTimeout(() => {
            const formatted = TextFormatter.autoFormat(this.elements.textInput.value);
            this.elements.textInput.value = formatted;
            this.updateAnalysis();
            this.setButtonLoading('autoFormatBtn', false);
            this.showToast('Text auto-formatted');
        }, 100);
    }

    autoStripAndFormat() {
        if (!this.elements.textInput) return;
        
        let text = this.elements.textInput.value;
        text = TextFormatter.stripFormatting(text);
        text = TextFormatter.autoFormat(text);
        this.elements.textInput.value = text;
        this.updateAnalysis();
    }

    convertCase(caseType) {
        if (!this.elements.textInput) return;
        
        const converted = CaseConverter.convert(this.elements.textInput.value, caseType);
        this.elements.textInput.value = converted;
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
            
            const lorem = LoremGenerator.generate(type, count, style);
            this.elements.loremOutput.value = lorem;
            
            this.setButtonLoading('generateBtn', false);
            this.showToast('Lorem text generated');
        }, 200);
    }

    generateInitialLorem() {
        if (this.elements.loremOutput && !this.elements.loremOutput.value) {
            this.generateLorem();
        }
    }

    // === UTILITY FUNCTIONS ===
    async copyText(elementId) {
        const element = this.elements[elementId];
        if (!element || !element.value) {
            this.showToast('Nothing to copy');
            return;
        }
        
        try {
            await TextUtils.copyToClipboard(element.value);
            this.showToast('Copied to clipboard');
        } catch (err) {
            this.showToast('Failed to copy');
        }
    }

    clearText(elementId) {
        const element = this.elements[elementId];
        if (element) {
            element.value = '';
            if (elementId === 'textInput') this.updateAnalysis();
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
        
        const toast = this.elements.toast;
        const messageElement = toast.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    setCurrentYear() {
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
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
});/**
 * TEXTY - Text Processing Engine & Application Controller
 * Core text manipulation, analysis utilities, and DOM interaction
 */

// === TEXT STATISTICS ===
class TextAnalyzer {
    static analyze(text) {
        if (!text || !text.trim()) {
            return this.getEmptyStats();
        }

        const words = this.getWords(text);
        const sentences = this.getSentences(text);
        const paragraphs = this.getParagraphs(text);
        const characters = text.length;
        const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
        const avgSyllablesPerWord = this.calculateAvgSyllables(words);
        const fleschScore = this.calculateFleschScore(avgWordsPerSentence, avgSyllablesPerWord);
        
        return {
            words: words.length,
            characters,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            readingTime: Math.ceil(words.length / 200),
            fleschScore: Math.round(fleschScore),
            gradeLevel: this.getGradeLevel(fleschScore),
            keywords: this.extractKeywords(words)
        };
    }

    static getEmptyStats() {
        return {
            words: 0, characters: 0, sentences: 0, paragraphs: 0,
            readingTime: 0, fleschScore: 0, gradeLevel: '—', keywords: []
        };
    }

    static getWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }

    static getSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    }

    static getParagraphs(text) {
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    }

    static countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
    
    static calculateAvgSyllables(words) {
        if (words.length === 0) return 0;
        return words.reduce((total, word) => total + this.countSyllables(word), 0) / words.length;
    }

    static calculateFleschScore(avgWords, avgSyllables) {
        return 206.835 - (1.015 * avgWords) - (84.6 * avgSyllables);
    }

    static getGradeLevel(score) {
        if (score >= 90) return '5th Grade';
        if (score >= 80) return '6th Grade';
        if (score >= 70) return '7th Grade';
        if (score >= 60) return '8th-9th Grade';
        if (score >= 50) return '10th-12th Grade';
        if (score >= 30) return 'College';
        return 'Graduate';
    }

    static extractKeywords(words) {
        const stopWords = new Set([
            'the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 
            'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'any'
        ]);
        
        const wordCount = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (cleanWord.length > 2 && !stopWords.has(cleanWord)) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });
        
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7)
            .map(([word]) => word);
    }
}

// === TEXT FORMATTING ===
class TextFormatter {
    static stripFormatting(text) {
        if (!text) return '';
        
        // Remove HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;
        
        // Normalize whitespace
        return text.replace(/[ \t]+/g, ' ')
                  .replace(/\n\s*\n\s*/g, '\n\n')
                  .trim();
    }

    static autoFormat(text) {
        if (!text || !text.trim()) return '';
        
        const paragraphs = text.split(/\n\s*\n/);
        
        const formatLine = (line) => {
            return line.replace(/\s+/g, ' ').trim()
                .replace(/\s+([,.!?;:])/g, '$1')
                .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
                .replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
                .replace(/\bi\b/g, 'I')
                .replace(/\s+'/g, "'")
                .replace(/'\s+/g, "'");
        };
        
        return paragraphs
            .map(p => p.split('\n').map(formatLine).filter(Boolean).join('\n'))
            .filter(Boolean)
            .join('\n\n');
    }
}

// === CASE CONVERSION ===
class CaseConverter {
    static convert(text, caseType) {
        if (!text) return '';
        
        switch(caseType) {
            case 'upper': 
                return text.toUpperCase();
            case 'lower': 
                return text.toLowerCase();
            case 'title': 
                return text.replace(/\w\S*/g, txt => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
            case 'sentence': 
                return text.toLowerCase().replace(/(^|\. *)([a-z])/g, (_, p1, p2) => 
                    p1 + p2.toUpperCase()
                );
            default: 
                return text;
        }
    }
}

// === LOREM IPSUM GENERATOR ===
class LoremGenerator {
    static libraries = {
        latin: [
            'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 
            'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore'
        ],
        english: [
            'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'beautiful',
            'landscape', 'mountain', 'river', 'forest', 'sunshine', 'peaceful', 'journey'
        ],
        tech: [
            'algorithm', 'database', 'framework', 'application', 'interface', 'protocol', 
            'cloud', 'microservices', 'container', 'kubernetes', 'docker', 'api'
        ],
        business: [
            'strategy', 'growth', 'innovation', 'market', 'customer', 'revenue', 'profit', 
            'investment', 'portfolio', 'stakeholder', 'partnership', 'collaboration'
        ]
    };

    static generate(type, count, style) {
        const library = this.libraries[style] || this.libraries.english;
        
        if (type === 'words') return this.generateWords(count, library);
        if (type === 'sentences') return this.generateSentences(count, library);
        return this.generateParagraphs(count, library);
    }

    static generateWords(count, lib) {
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(lib[Math.floor(Math.random() * lib.length)]);
        }
        return words.join(' ') + '.';
    }

    static generateSentences(count, lib) {
        const sentences = [];
        for (let i = 0; i < count; i++) {
            const wordCount = Math.floor(Math.random() * 10) + 5;
            const words = this.generateWords(wordCount, lib);
            sentences.push(words.charAt(0).toUpperCase() + words.slice(1));
        }
        return sentences.join(' ');
    }

    static generateParagraphs(count, lib) {
        const paragraphs = [];
        for (let i = 0; i < count; i++) {
            const sentenceCount = Math.floor(Math.random() * 4) + 3;
            paragraphs.push(this.generateSentences(sentenceCount, lib));
        }
        return paragraphs.join('\n\n');
    }
}

// === UTILITIES ===
class TextUtils {
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
