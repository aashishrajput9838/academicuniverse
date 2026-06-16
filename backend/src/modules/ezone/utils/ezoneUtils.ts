import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneUtils');

export function sanitizeEzoneData(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    // 1. Remove common HTML tags
    let clean = text.replace(/<[^>]*>?/gm, ' ');
    
    // 2. Remove technical fragments and CSS-like patterns
    const blacklist = [
        /\.apexcharts[a-z-]*/gi,
        /iframe/gi,
        /script/gi,
        /style/gi,
        /translateY\([^)]*\)/gi,
        /display\s*:\s*[a-z-]+/gi,
        /position\s*:\s*[a-z-]+/gi,
        /color\s*:\s*#[0-9a-f]+/gi,
        /background\s*:\s*[a-z]+/gi,
        /padding\s*:\s*[0-9]+px/gi,
        /!important/gi,
        /\{[\s\S]*?\}/g, // CSS blocks
        /\s\s+/g // Multiple spaces
    ];

    blacklist.forEach(pattern => {
        clean = clean.replace(pattern, ' ');
    });

    return clean.trim();
}

export function isValidEzoneValue(value: any): boolean {
    if (typeof value !== 'string') return true;
    if (!value || value === 'N/A') return true;

    const suspiciousTerms = [
        '.apexcharts', 'iframe', 'script', 'style', 'translateY(', 
        'display:flex', 'position:absolute', 'fill:', 'stroke:',
        'data-v-', 'ng-content', 'react-root'
    ];

    return !suspiciousTerms.some(term => value.toLowerCase().includes(term.toLowerCase()));
}
