import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneDataValidator');

export class EzoneDataValidator {
    private static instance: EzoneDataValidator;

    private suspiciousTerms = [
        '.apexcharts', 'iframe', 'script', 'style', 'translateY(', 
        'display:flex', 'position:absolute', 'fill:', 'stroke:',
        'data-v-', 'ng-content', 'react-root', '<script', '<style',
        'display:block', 'visibility:', 'opacity:', 'z-index:'
    ];

    public static getInstance(): EzoneDataValidator {
        if (!EzoneDataValidator.instance) {
            EzoneDataValidator.instance = new EzoneDataValidator();
        }
        return EzoneDataValidator.instance;
    }

    /**
     * Validates that the data does not contain any raw HTML, CSS, or JS fragments.
     */
    public validate(data: any): void {
        this.checkValue(data);
    }

    private checkValue(val: any): void {
        if (typeof val === 'string') {
            const lowerVal = val.toLowerCase();
            
            // Check for suspicious terms
            for (const term of this.suspiciousTerms) {
                if (lowerVal.includes(term.toLowerCase())) {
                    logger.error(`Validation failed: Suspicious term found: "${term}" in value: "${val.substring(0, 100)}"`);
                    throw new Error(`Data validation failed: Field contains forbidden technical fragment "${term}".`);
                }
            }

            // Check for HTML tags
            if (/<[^>]*>?/gm.test(val)) {
                logger.error(`Validation failed: HTML tags detected in value: "${val.substring(0, 100)}"`);
                throw new Error('Data validation failed: HTML tags detected in extracted data.');
            }

        } else if (Array.isArray(val)) {
            val.forEach(item => this.checkValue(item));
        } else if (typeof val === 'object' && val !== null) {
            Object.values(val).forEach(v => this.checkValue(v));
        }
    }

    /**
     * Returns true if a value is considered "clean" and valid for storage
     */
    public isValidValue(value: any): boolean {
        try {
            this.checkValue(value);
            return true;
        } catch (error) {
            return false;
        }
    }
}
