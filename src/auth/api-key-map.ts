import * as fs from 'fs';
import * as path from 'path';

export function loadApiKeyMap(): Record<string, string> {
  const filePath = path.join(__dirname, '..', '..', 'api-keys.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as Record<string, string>;
}

// This can be imported wherever needed, or
export const API_KEY_MAP = loadApiKeyMap();
