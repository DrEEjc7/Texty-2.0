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
            words: 0, 
            characters: 0, 
            sentences: 0, 
            paragraphs: 0,
            readingTime: 0, 
            fleschScore: 0, 
            gradeLevel: '—', 
            keywords: []
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
            'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'any',
            'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
            'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
            'let', 'put', 'say', 'she', 'too', 'use'
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
        
        // Normalize whitespace but PRESERVE line breaks
        return text.replace(/[ \t]+/g, ' ')        // Multiple spaces/tabs → single space
                  .replace(/\n[ \t]+/g, '\n')      // Remove spaces/tabs after line breaks
                  .replace(/[ \t]+\n/g, '\n')      // Remove spaces/tabs before line breaks
                  .replace(/\n{3,}/g, '\n\n')      // Multiple line breaks → double line break max
                  .trim();
    }

    static autoFormat(text) {
        if (!text || !text.trim()) return '';
        
        // Split into paragraphs (double line breaks)
        const paragraphs = text.split(/\n\s*\n/);
        
        const formatLine = (line) => {
            return line.replace(/[ \t]+/g, ' ')                              // Multiple spaces → single space
                      .trim()                                                // Remove leading/trailing spaces
                      .replace(/\s+([,.!?;:])/g, '$1')                      // Remove space before punctuation
                      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')               // Ensure space after sentence ending
                      .replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase()) // Capitalize sentences
                      .replace(/\bi\b/g, 'I')                               // Fix lowercase "i"
                      .replace(/\s+'/g, "'")                                // Fix apostrophes
                      .replace(/'\s+/g, "'");
        };
        
        return paragraphs
            .map(paragraph => {
                // Split paragraph into lines and preserve intentional line breaks
                const lines = paragraph.split('\n');
                return lines
                    .map(line => line.trim() ? formatLine(line) : '') // Format non-empty lines
                    .join('\n');                                      // Rejoin with original line breaks
            })
            .filter(Boolean)     // Remove empty paragraphs
            .join('\n\n');       // Rejoin paragraphs with double line breaks
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
            'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
            'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud'
        ],
        english: [
            'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'beautiful',
            'landscape', 'mountain', 'river', 'forest', 'sunshine', 'peaceful', 'journey',
            'adventure', 'discover', 'explore', 'amazing', 'wonderful', 'incredible'
        ],
        tech: [
            'algorithm', 'database', 'framework', 'application', 'interface', 'protocol', 
            'cloud', 'microservices', 'container', 'kubernetes', 'docker', 'api',
            'scalability', 'performance', 'infrastructure', 'deployment', 'optimization'
        ],
        business: [
            'strategy', 'growth', 'innovation', 'market', 'customer', 'revenue', 'profit', 
            'investment', 'portfolio', 'stakeholder', 'partnership', 'collaboration',
            'efficiency', 'productivity', 'transformation', 'competitive', 'advantage'
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
            const wordCount = Math.floor(Math.random() * 12) + 5;
            const words = [];
            for (let j = 0; j < wordCount; j++) {
                words.push(lib[Math.floor(Math.random() * lib.length)]);
            }
            words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
            sentences.push(words.join(' ') + '.');
        }
        return sentences.join(' ');
    }

    static generateParagraphs(count, lib) {
        const paragraphs = [];
        for (let i = 0; i < count; i++) {
            const sentenceCount = Math.floor(Math.random() * 5) + 3;
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
            textArea.style.top = '-999999px';
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
