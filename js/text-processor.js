/**
 * TEXTY v2 - Text Processing Engine
 * Core text manipulation and analysis utilities. No DOM interaction here.
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

    static getWords = (text) => text.trim().split(/\s+/).filter(Boolean);
    static getSentences = (text) => text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    static getParagraphs = (text) => text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    static countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }
    
    static calculateAvgSyllables = (words) => words.length === 0 ? 0 : words.reduce((total, word) => total + this.countSyllables(word), 0) / words.length;
    static calculateFleschScore = (avgWords, avgSyllables) => 206.835 - (1.015 * avgWords) - (84.6 * avgSyllables);

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
        const stopWords = new Set(['the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'i', 'you', 'it', 'not', 'or', 'be', 'are']);
        const wordCount = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
            if (cleanWord.length > 2 && !stopWords.has(cleanWord)) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });
        return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([word]) => word);
    }
}

// === TEXT FORMATTING ===
class TextFormatter {
    static stripFormatting(text) {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text.replace(/<[^>]*>/g, '');
        text = textarea.value;
        return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim();
    }

    static autoFormat(text) {
        if (!text || !text.trim()) return '';
        const paragraphs = text.split(/\n\s*\n/);
        const formatLine = (line) => line.replace(/\s+/g, ' ').trim()
            .replace(/\s+([,.!?;:])/g, '$1')
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
            .replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
            .replace(/\bi\b/g, 'I');
        return paragraphs.map(p => p.split('\n').map(formatLine).filter(Boolean).join('\n')).filter(Boolean).join('\n\n');
    }
}

// === CASE CONVERSION ===
class CaseConverter {
    static convert(text, caseType) {
        if (!text) return '';
        switch(caseType) {
            case 'upper': return text.toUpperCase();
            case 'lower': return text.toLowerCase();
            case 'title': return text.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            case 'sentence': return text.toLowerCase().replace(/(^|\. *)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
            default: return text;
        }
    }
}

// === LOREM IPSUM GENERATOR ===
class LoremGenerator {
    static libraries = {
        latin: ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt'],
        english: ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog', 'and', 'packs', 'my', 'box', 'with', 'five', 'dozen', 'liquor', 'jugs'],
        tech: ['algorithm', 'database', 'framework', 'application', 'interface', 'protocol', 'cloud', 'microservices', 'container', 'kubernetes', 'docker', 'api'],
        business: ['strategy', 'growth', 'innovation', 'market', 'customer', 'revenue', 'profit', 'investment', 'portfolio', 'stakeholder', 'partnership']
    };

    static generate(type, count, style) {
        const library = this.libraries[style] || this.libraries.english;
        if (type === 'words') return this.generateWords(count, library);
        if (type === 'sentences') return this.generateSentences(count, library);
        return this.generateParagraphs(count, library);
    }

    static generateWords = (count, lib) => Array.from({ length: count }, () => lib[Math.floor(Math.random() * lib.length)]).join(' ') + '.';
    static generateSentences(count, lib) {
        const sentences = [];
        for (let i = 0; i < count; i++) {
            const words = this.generateWords(Math.floor(Math.random() * 10) + 5, lib);
            sentences.push(words.charAt(0).toUpperCase() + words.slice(1));
        }
        return sentences.join(' ');
    }
    static generateParagraphs(count, lib) {
        return Array.from({ length: count }, () => this.generateSentences(Math.floor(Math.random() * 4) + 3, lib)).join('\n\n');
    }
}

// === UTILITIES ===
class TextUtils {
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text);
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
}
