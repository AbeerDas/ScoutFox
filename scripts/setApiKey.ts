/**
 * Helper script to set YouTube API key for local development
 * 
 * Usage:
 *   npm run set-api-key
 * 
 * This script writes the API key to a local file that can be imported
 * at build time. For production, use a backend proxy instead.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const API_KEY_FILE = path.join(process.cwd(), 'api-key.local.ts');

async function promptApiKey(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter your YouTube Data API v3 key: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('ScoutFox - API Key Setup');
  console.log('========================\n');
  console.log('This script will save your API key locally for development.');
  console.log('⚠️  WARNING: Do not commit api-key.local.ts to version control!\n');

  const apiKey = await promptApiKey();

  if (!apiKey) {
    console.error('Error: API key cannot be empty.');
    process.exit(1);
  }

  // Validate API key format (basic check - YouTube API keys are typically 39 characters)
  if (apiKey.length < 20) {
    console.warn('Warning: API key seems too short. Please verify it is correct.');
  }

  // Write to local file
  const content = `/**
 * Local API key file (DO NOT COMMIT TO VERSION CONTROL)
 * This file is git-ignored and used only for local development
 */

export const YOUTUBE_API_KEY = '${apiKey}';
`;

  try {
    fs.writeFileSync(API_KEY_FILE, content, 'utf-8');
    console.log(`\n API key saved to ${API_KEY_FILE}`);
    console.log('   This file is git-ignored and will not be committed.\n');
    console.log('Next steps:');
    console.log('1. Build the extension: npm run build');
    console.log('2. Or start dev server: npm run dev');
    console.log('3. Load the extension in Chrome\n');
  } catch (error) {
    console.error('Error writing API key file:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
