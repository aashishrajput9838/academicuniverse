"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
const IV_LENGTH = 16; // For AES-256-CBC
class EncryptionUtil {
    /**
     * Encrypts a string using AES-256-CBC
     * @param text The text to encrypt
     * @returns An object containing the IV and encrypted data
     */
    static encrypt(text) {
        if (!ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
        };
    }
    /**
     * Decrypts a string using AES-256-CBC
     * @param encryptedData The encrypted data
     * @param iv The initialization vector
     * @returns The decrypted string
     */
    static decrypt(encryptedData, iv) {
        if (!ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.EncryptionUtil = EncryptionUtil;
