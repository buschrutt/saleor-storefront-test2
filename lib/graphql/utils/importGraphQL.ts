import { readFileSync } from 'fs';
import { join } from 'path';

export function importGraphQL(filePath: string): string {
    try {
        const fullPath = join(process.cwd(), filePath);
        return readFileSync(fullPath, 'utf-8').trim();
    } catch (error) {
        console.error(`Failed to read GraphQL file: ${filePath}`, error);
        throw error;
    }
}