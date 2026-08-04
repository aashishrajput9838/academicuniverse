"use strict";
/**
 * Academic Universe — Pluggable University Template Engine
 * Supports modular, independent university templates for full visual diversity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTemplateD = exports.DefaultTemplateC = exports.DefaultTemplateB = exports.DefaultTemplateA = exports.TemplateEngine = void 0;
exports.hexToRgb = hexToRgb;
const pdf_lib_1 = require("pdf-lib");
class TemplateEngine {
    constructor() {
        this.templates = new Map();
    }
    registerTemplate(template) {
        this.templates.set(template.config.id, template);
    }
    getTemplate(templateId) {
        const t = this.templates.get(templateId);
        if (!t) {
            // Fallback to TEMPLATE_A if requested template not found
            return this.templates.get('TEMPLATE_A') || this.getDefaultTemplate();
        }
        return t;
    }
    getAllTemplateIds() {
        return Array.from(this.templates.keys());
    }
    getAllTemplates() {
        return Array.from(this.templates.values()).map((t) => t.config);
    }
    getDefaultTemplate() {
        return new DefaultTemplateA();
    }
}
exports.TemplateEngine = TemplateEngine;
/** Helper function to convert Hex color to PDF RGB */
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return (0, pdf_lib_1.rgb)(r, g, b);
}
/** Built-in Template A: Vivekananda Technical University (VTU) */
class DefaultTemplateA {
    constructor() {
        this.config = {
            id: 'TEMPLATE_A',
            name: 'Vivekananda Technical University',
            shortCode: 'VTU',
            location: 'New Delhi, India (Fictional Institution)',
            tagline: 'Excellence in Engineering and Research',
            primaryColor: '#1a2e5a', // Navy
            secondaryColor: '#3b82f6',
            fontFamily: 'Helvetica',
            headerStyle: 'RULED',
            watermarkText: 'SYNTHETIC RESEARCH DATASET',
        };
    }
    async renderDocument(doc, page, data) {
        const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const primaryRgb = hexToRgb(this.config.primaryColor);
        const { width, height } = page.getSize();
        // 1. Header Bar
        page.drawRectangle({
            x: 30,
            y: height - 80,
            width: width - 60,
            height: 50,
            color: primaryRgb,
        });
        page.drawText(this.config.name.toUpperCase(), {
            x: 45,
            y: height - 55,
            size: 16,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText(this.config.tagline, {
            x: 45,
            y: height - 70,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.8, 0.9, 1),
        });
        // 2. Ruled horizontal lines
        page.drawLine({
            start: { x: 30, y: height - 90 },
            end: { x: width - 30, y: height - 90 },
            thickness: 2,
            color: primaryRgb,
        });
    }
}
exports.DefaultTemplateA = DefaultTemplateA;
/** Built-in Template B: Sri Ramanujan Institute of Technology (SRIT) */
class DefaultTemplateB {
    constructor() {
        this.config = {
            id: 'TEMPLATE_B',
            name: 'Sri Ramanujan Institute of Technology',
            shortCode: 'SRIT',
            location: 'Bengaluru, India (Fictional Institution)',
            tagline: 'Innovation, Research, Technology',
            primaryColor: '#0d5e3f', // Emerald
            secondaryColor: '#10b981',
            fontFamily: 'Helvetica',
            headerStyle: 'GRADIENT_BAR',
            watermarkText: 'SYNTHETIC RESEARCH DATASET',
        };
    }
    async renderDocument(doc, page, data) {
        const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const primaryRgb = hexToRgb(this.config.primaryColor);
        const { width, height } = page.getSize();
        page.drawRectangle({
            x: 0,
            y: height - 70,
            width,
            height: 70,
            color: primaryRgb,
        });
        page.drawText(this.config.name, {
            x: 35,
            y: height - 45,
            size: 18,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText(`${this.config.location} | ${this.config.tagline}`, {
            x: 35,
            y: height - 60,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.9, 0.95, 0.9),
        });
    }
}
exports.DefaultTemplateB = DefaultTemplateB;
/** Built-in Template C: National Institute of Eng. & Sciences (NIES) */
class DefaultTemplateC {
    constructor() {
        this.config = {
            id: 'TEMPLATE_C',
            name: 'National Institute of Eng. & Sciences',
            shortCode: 'NIES',
            location: 'Pune, India (Fictional Institution)',
            tagline: 'Knowledge, Integrity, Innovation',
            primaryColor: '#8b0000', // Crimson
            secondaryColor: '#ef4444',
            fontFamily: 'Times-Roman',
            headerStyle: 'TRIPLE_BORDER',
            watermarkText: 'SYNTHETIC RESEARCH DATASET',
        };
    }
    async renderDocument(doc, page, data) {
        const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.TimesRomanBold);
        const font = await doc.embedFont(pdf_lib_1.StandardFonts.TimesRoman);
        const primaryRgb = hexToRgb(this.config.primaryColor);
        const { width, height } = page.getSize();
        // Outer double border
        page.drawRectangle({
            x: 20,
            y: 20,
            width: width - 40,
            height: height - 40,
            borderColor: primaryRgb,
            borderWidth: 2,
        });
        page.drawRectangle({
            x: 24,
            y: 24,
            width: width - 48,
            height: height - 48,
            borderColor: primaryRgb,
            borderWidth: 0.5,
        });
        page.drawText(this.config.name.toUpperCase(), {
            x: 40,
            y: height - 60,
            size: 16,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(this.config.location, {
            x: 40,
            y: height - 75,
            size: 10,
            font,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
    }
}
exports.DefaultTemplateC = DefaultTemplateC;
/** Built-in Template D: Indira Gandhi College of Engineering (IGCE) */
class DefaultTemplateD {
    constructor() {
        this.config = {
            id: 'TEMPLATE_D',
            name: 'Indira Gandhi College of Engineering',
            shortCode: 'IGCE',
            location: 'Mumbai, India (Fictional Institution)',
            tagline: 'Empowering Minds, Shaping Future',
            primaryColor: '#4b0082', // Royal Purple
            secondaryColor: '#8b5cf6',
            fontFamily: 'Helvetica',
            headerStyle: 'DIAGONAL_ACCENT',
            watermarkText: 'SYNTHETIC RESEARCH DATASET',
        };
    }
    async renderDocument(doc, page, data) {
        const fontBold = await doc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const primaryRgb = hexToRgb(this.config.primaryColor);
        const { width, height } = page.getSize();
        // Top purple bar
        page.drawRectangle({
            x: 30,
            y: height - 65,
            width: width - 60,
            height: 45,
            color: primaryRgb,
        });
        page.drawText(this.config.name, {
            x: 45,
            y: height - 48,
            size: 16,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText(this.config.tagline, {
            x: 45,
            y: height - 60,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.9, 0.8, 1),
        });
    }
}
exports.DefaultTemplateD = DefaultTemplateD;
