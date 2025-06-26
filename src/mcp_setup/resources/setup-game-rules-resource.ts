import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Cache for the PDF content ---
// This will hold the prepared resource content after the first read.
let cachedRulesContent: ReadResourceResult | null = null;

/**
 * Creates a resource that serves the game rules PDF.
 * This version caches the PDF content in memory after the first read for efficiency.
 * @param server The McpServer instance.
 * @param resourceUriString The full URI for this resource.
 * @returns The RegisteredResource object.
 */
export function setupGameRulesResource(
  server: McpServer,
  resourceUriString: string,
): RegisteredResource {
  return server.resource(
    'game_rules',
    resourceUriString,
    { description: 'The official rules for the Guessing Game (PDF format).' },
    async (uri: URL): Promise<ReadResourceResult> => {
      // If the content is already cached, return it immediately.
      if (cachedRulesContent) {
        console.log('[GameRulesResource] Serving rules PDF from cache.');
        return cachedRulesContent;
      }

      // --- First-time read and cache population ---
      console.log(
        '[GameRulesResource] Cache miss. Reading rules PDF from filesystem.',
      );
      try {
        // Use process.cwd() for a more reliable path from the project root.
        // Assumes you run your script from the project root directory.
        const pdfFilePath = path.resolve(process.cwd(), 'assets/rules.pdf');
        const pdfBuffer = await fs.readFile(pdfFilePath);
        const base64EncodedBlob = pdfBuffer.toString('base64');

        // Prepare the result object that will be cached.
        const result: ReadResourceResult = {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/pdf',
              blob: base64EncodedBlob,
            },
          ],
        };

        // Store the result in our cache for subsequent requests.
        cachedRulesContent = result;
        console.log(
          '[GameRulesResource] Rules PDF content cached successfully.',
        );

        return result;
      } catch (error) {
        console.error(
          '[GameRulesResource] Failed to read rules PDF file:',
          error,
        );
        throw new Error('Server error: Could not load game rules.');
      }
    },
  );
}
