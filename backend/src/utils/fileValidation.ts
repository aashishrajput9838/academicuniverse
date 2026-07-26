import { Buffer } from 'buffer';

export function isPdfMagic(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
}

export async function isDocxMagic(buffer: Buffer): Promise<boolean> {
  if (buffer.length < 4 || buffer.slice(0, 2).toString('ascii') !== 'PK') {
    return false;
  }
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 65536));
  return text.includes('[Content_Types].xml');
}
