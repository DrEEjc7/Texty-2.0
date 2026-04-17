/**
 * TEXTY V4 — Text Processing Engine
 * Core text manipulation and analysis utilities. No DOM interaction here.
 */

// === TEXT STATISTICS ===
class TextAnalyzer {
    // Cache for syllable counts to improve performance
    static syllableCache = new Map();

    static analyze(text) {
        if (!text || !text.trim()) {
            return this.getEmptyStats();
        }

        const words      = this.getWords(text);
        const sentences  = this.getSentences(text);
        const paragraphs = this.getParagraphs(text);
        const characters = text.length;
        const wordCount  = words.length;

        let fleschScore = 0;
        let gradeLevel  = '—';

        if (wordCount > 10 && sentences.length > 0) {
            const avgWordsPerSentence  = wordCount / sentences.length;
            const avgSyllablesPerWord  = this.calculateAvgSyllables(words);
            fleschScore = this.calculateFleschScore(avgWordsPerSentence, avgSyllablesPerWord);
            gradeLevel  = this.getGradeLevel(fleschScore);
        }

        const readingTime = this.calculateReadingTime(wordCount);
        const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
        const avgWordLength = wordCount > 0
            ? (words.reduce((sum, w) => sum + w.length, 0) / wordCount).toFixed(1)
            : '—';

        return {
            words:          wordCount,
            uniqueWords,
            characters,
            sentences:      sentences.length,
            paragraphs:     paragraphs.length,
            avgWordLength,
            readingTime,
            fleschScore:    Math.round(fleschScore),
            gradeLevel,
            keywords:       wordCount > 20 ? this.extractKeywords(words) : []
        };
    }

    static calculateReadingTime(wordCount) {
        if (wordCount === 0) return '0';
        if (wordCount < 100) return '< 1';
        return Math.ceil(wordCount / 200);
    }

    static getEmptyStats() {
        return {
            words: 0, uniqueWords: 0, characters: 0,
            sentences: 0, paragraphs: 0, avgWordLength: '—',
            readingTime: 0, fleschScore: 0, gradeLevel: '—', keywords: []
        };
    }

    static getWords(text) {
        const trimmed = text.trim();
        return trimmed ? trimmed.split(/\s+/) : [];
    }

    static getSentences(text) {
        return text.split(/[.!?]+\s+|[.!?]+$/).filter(s => s.trim().length > 0);
    }

    static getParagraphs(text) {
        return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    }

    static countSyllables(word) {
        if (!word || word.length === 0) return 0;

        word = word.toLowerCase().trim();

        if (this.syllableCache.has(word)) return this.syllableCache.get(word);

        let count;

        if (/^\d+$/.test(word)) {
            count = word.length;
        } else if (word.length <= 3) {
            count = 1;
        } else {
            const cleaned = word
                .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
                .replace(/^y/, '');
            const matches = cleaned.match(/[aeiouy]{1,2}/g);
            count = Math.max(1, matches ? matches.length : 1);
        }

        if (this.syllableCache.size > 1000) {
            const firstKey = this.syllableCache.keys().next().value;
            this.syllableCache.delete(firstKey);
        }
        this.syllableCache.set(word, count);

        return count;
    }

    static calculateAvgSyllables(words) {
        if (words.length === 0) return 0;
        return words.reduce((total, word) => total + this.countSyllables(word), 0) / words.length;
    }

    static calculateFleschScore(avgWords, avgSyllables) {
        if (avgWords === 0 || avgSyllables === 0 || isNaN(avgWords) || isNaN(avgSyllables)) return 0;
        const score = 206.835 - (1.015 * avgWords) - (84.6 * avgSyllables);
        return Math.max(0, Math.min(100, score));
    }

    static getGradeLevel(score) {
        if (score <= 0 || isNaN(score)) return '—';
        if (score >= 90) return '5th Grade';
        if (score >= 80) return '6th Grade';
        if (score >= 70) return '7th Grade';
        if (score >= 60) return '8th–9th';
        if (score >= 50) return '10th–12th';
        if (score >= 30) return 'College';
        return 'Graduate';
    }

    static extractKeywords(words, count = 7, minFrequency = 2) {
        const stopWords = new Set([
            'the', 'and', 'to', 'of', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with',
            'i', 'you', 'it', 'not', 'or', 'be', 'are', 'from', 'at', 'as', 'your', 'all', 'any',
            'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
            'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
            'let', 'put', 'say', 'she', 'too', 'use', 'have', 'been', 'other', 'were', 'which',
            'their', 'what', 'there', 'when', 'will', 'would', 'about', 'into', 'than', 'them',
            'these', 'some', 'could', 'only', 'may', 'then', 'such', 'an', 'but', 'we', 'he',
            'me', 'my', 'so', 'up', 'if', 'no', 'do', 'just', 'they', 'very', 'more', 'even',
            'also', 'well', 'back', 'after', 'should', 'each', 'where', 'those', 'much', 'own',
            'most', 'through', 'being', 'over', 'here', 'both', 'while', 'under', 'same', 'us'
        ]);

        const wordCount = {};
        words.forEach(word => {
            const clean = word.toLowerCase().replace(/[^\w]/g, '').replace(/^\d+$/, '');
            if (clean.length > 2 && !stopWords.has(clean)) {
                wordCount[clean] = (wordCount[clean] || 0) + 1;
            }
        });

        return Object.entries(wordCount)
            .filter(([, freq]) => freq >= minFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([word]) => word);
    }
}

// === TEXT FORMATTING ===
class TextFormatter {
    static stripFormatting(text) {
        if (!text) return '';

        if (!text.includes('<')) {
            return text.replace(/[ \t]+/g, ' ')
                       .replace(/[ \t]*\n[ \t]*/g, '\n')
                       .trim();
        }

        text = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
            .replace(/<li[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n');

        const doc = new DOMParser().parseFromString(text, 'text/html');

        return (doc.body.textContent || doc.body.innerText || '')
            .replace(/[ \t]+/g, ' ')
            .replace(/[ \t]*\n[ \t]*/g, '\n')
            .replace(/\n{4,}/g, '\n\n\n')
            .trim();
    }

    /**
     * Removes duplicate lines, keeping the first occurrence of each line.
     * Comparison is exact (case-sensitive, whitespace matters).
     */
    static removeDuplicateLines(text) {
        if (!text) return '';
        const seen = new Set();
        return text
            .split('\n')
            .filter(line => {
                if (seen.has(line)) return false;
                seen.add(line);
                return true;
            })
            .join('\n');
    }

    /**
     * Toggles between straight quotes and curly (typographic) quotes.
     * Detects which style is already in use and converts to the other.
     */
    static convertSmartQuotes(text) {
        if (!text) return '';

        const hasCurly = /[\u2018\u2019\u201C\u201D]/.test(text);

        if (hasCurly) {
            // Curly → straight
            return text
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/[\u201C\u201D]/g, '"');
        }

        // Straight → curly
        return text
            // Paired double quotes: "..." → "..."
            .replace(/"([^"]*)"/g, '\u201C$1\u201D')
            // Paired single quotes: '...' → '...'
            .replace(/'([^']*)'/g, '\u2018$1\u2019')
            // Remaining apostrophes in contractions (it's, don't, etc.)
            .replace(/(\w)'(\w)/g, '$1\u2019$2')
            // Opening double quotes after space or start
            .replace(/(^|\s)"/g, '$1\u201C')
            // Any remaining double quotes → closing
            .replace(/"/g, '\u201D')
            // Opening single quotes after space or start
            .replace(/(^|\s)'/g, '$1\u2018')
            // Any remaining single quotes → closing/apostrophe
            .replace(/'/g, '\u2019');
    }

    // ─── SPACING OPERATIONS ─────────────────────────────────────

    /**
     * Puts each sentence on its own line.
     * Paragraph breaks (double newlines) are preserved.
     * Great for proofreading and reviewing one idea at a time.
     */
    static sentencesPerLine(text) {
        if (!text) return '';
        return text
            .split(/\n{2,}/)
            .map(para =>
                para
                    // Break after sentence terminators (. ! ? : ;) followed by space & Capital/Quote
                    .replace(/([.!?:\;])\s+(?=[A-Z"'\u2018\u201C])/g, '$1\n')
                    // Break BEFORE inline list items (-, •, *, 1.)
                    .replace(/\s+([-•*]|\d+\.)\s+/g, '\n$1 ')
                    .trim()
            )
            .join('\n\n');
    }

    /**
     * Joins hard-wrapped lines into natural paragraphs.
     * Single newlines become spaces; double newlines are preserved.
     * Fixes copy-paste from PDFs and ebooks.
     */
    static joinLines(text) {
        if (!text) return '';
        return text
            .split(/\n{2,}/)
            .map(para =>
                para
                    .split('\n')
                    .map(l => l.trim())
                    .filter(Boolean)
                    .join(' ')
            )
            .join('\n\n');
    }

    /**
     * Collapses multiple consecutive spaces/tabs to a single space.
     * Also trims each line.
     */
    static collapseSpaces(text) {
        if (!text) return '';
        return text
            .split('\n')
            .map(line => line.replace(/[ \t]+/g, ' ').trim())
            .join('\n');
    }

    /**
     * Collapses 3+ consecutive blank lines to a single blank line.
     */
    static collapseBlankLines(text) {
        if (!text) return '';
        return text.replace(/\n{3,}/g, '\n\n').trim();
    }
}

// === CASE CONVERSION ===
class CaseConverter {
    static convert(text, caseType) {
        if (!text) return '';

        switch (caseType) {
            case 'upper':
                return text.toUpperCase();
            case 'lower':
                return text.toLowerCase();
            case 'title':
                return text.replace(/\w\S*/g, txt =>
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
            case 'sentence':
                return text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) =>
                    p1 + p2.toUpperCase()
                );
            default:
                return text;
        }
    }
}

// === FORMATTING EXTRACTION ===
class FormattingExtractor {
    static extractFormatting(html) {
        if (!html || !html.includes('<')) return null;

        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const formatting = {
                fonts: new Set(), sizes: new Set(), weights: new Set(),
                colors: new Set(), styles: new Set(), elements: new Set()
            };

            doc.body.querySelectorAll('*').forEach(el => {
                formatting.elements.add(el.tagName.toLowerCase());
                if (el.style.fontFamily) formatting.fonts.add(el.style.fontFamily.replace(/['"]/g, ''));
                if (el.style.fontSize)   formatting.sizes.add(el.style.fontSize);
                if (el.style.fontWeight) formatting.weights.add(el.style.fontWeight);
                if (el.style.color)      formatting.colors.add(el.style.color);

                const tag = el.tagName.toLowerCase();
                if (['b', 'strong'].includes(tag))  formatting.styles.add('Bold');
                if (['i', 'em'].includes(tag))       formatting.styles.add('Italic');
                if (tag === 'u')                      formatting.styles.add('Underline');
                if (tag === 'strike' || tag === 's') formatting.styles.add('Strikethrough');
                if (/^h[1-6]$/.test(tag))            formatting.styles.add('Heading');

                if (el.hasAttribute('face'))  formatting.fonts.add(el.getAttribute('face'));
                if (el.hasAttribute('size'))  formatting.sizes.add(el.getAttribute('size'));
                if (el.hasAttribute('color')) formatting.colors.add(el.getAttribute('color'));
            });

            return {
                fonts:    Array.from(formatting.fonts).filter(Boolean).slice(0, 5),
                sizes:    Array.from(formatting.sizes).filter(Boolean).slice(0, 5),
                weights:  Array.from(formatting.weights).filter(w => w && w !== '400').slice(0, 5),
                colors:   Array.from(formatting.colors).filter(Boolean).slice(0, 8),
                styles:   Array.from(formatting.styles).filter(Boolean),
                elements: Array.from(formatting.elements)
                              .filter(e => !['div', 'span', 'font'].includes(e)).slice(0, 8),
                hasFormatting: formatting.fonts.size > 0 || formatting.sizes.size > 0 ||
                               formatting.styles.size > 0 || formatting.colors.size > 0
            };
        } catch (err) {
            console.error('Error extracting formatting:', err);
            return null;
        }
    }

    static formatForDisplay(formatting) {
        if (!formatting || !formatting.hasFormatting) return null;

        const display = [];
        if (formatting.fonts.length)    display.push({ label: 'Fonts',    values: formatting.fonts });
        if (formatting.sizes.length)    display.push({ label: 'Sizes',    values: formatting.sizes });
        if (formatting.weights.length)  display.push({ label: 'Weights',  values: formatting.weights });
        if (formatting.colors.length)   display.push({ label: 'Colors',   values: formatting.colors });
        if (formatting.styles.length)   display.push({ label: 'Styles',   values: formatting.styles });
        if (formatting.elements.length) display.push({ label: 'Elements', values: formatting.elements });

        return display;
    }
}

// === UTILITIES ===
class TextUtils {
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            } finally {
                document.body.removeChild(ta);
            }
        });
    }

    static formatNumber(num) {
        return num.toLocaleString();
    }
}
