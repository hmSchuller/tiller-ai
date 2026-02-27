import { mkdir, writeFile as fsWriteFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await fsWriteFile(filePath, content, 'utf-8');
}
