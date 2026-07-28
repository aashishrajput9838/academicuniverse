/**
 * Academic Universe — Environment Variables Loader for Benchmarks
 * Automatically scans and loads API keys and configurations from:
 * 1. process.env (highest priority)
 * 2. backend/.env.local
 * 3. backend/.env.development
 * 4. .env.local (workspace root)
 * 5. .env.development (workspace root)
 * 6. .env (workspace root)
 */

import fs from 'fs';
import path from 'path';

export function loadBenchmarkEnvironment(): void {
  const rootDir = path.resolve(__dirname, '../../');
  const envCandidates = [
    path.join(rootDir, 'backend', '.env.local'),
    path.join(rootDir, 'backend', '.env.development'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env.development'),
    path.join(rootDir, '.env'),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) continue;

    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;

        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();

        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }

        // Set in process.env if not already set or if empty
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    } catch (e) {
      console.warn(`[EnvLoader] Warning: Failed to read ${envPath}:`, e);
    }
  }

  // Diagnostic check
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey) {
    console.log(`🔑 [EnvLoader] GEMINI_API_KEY loaded (${geminiKey.substring(0, 8)}...${geminiKey.slice(-4)})`);
  } else {
    console.warn(`⚠️ [EnvLoader] GEMINI_API_KEY is not set in environment.`);
  }

  if (openRouterKey) {
    console.log(`🔑 [EnvLoader] OPENROUTER_API_KEY loaded (${openRouterKey.substring(0, 8)}...${openRouterKey.slice(-4)})`);
  } else {
    console.warn(`⚠️ [EnvLoader] OPENROUTER_API_KEY is not set in environment.`);
  }
}

// Auto-run on import
loadBenchmarkEnvironment();
