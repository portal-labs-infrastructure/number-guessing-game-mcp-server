import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Cache for the HTML content ---
let cachedHtmlContent: ReadResourceResult | null = null;

/**
 * Creates a resource that serves a simple, static HTML page.
 * This version caches the HTML content in memory after the first read.
 * @param server The McpServer instance.
 * @param resourceUriString The full URI for this resource.
 * @returns The RegisteredResource object.
 */
export function setupSimpleHtmlPageResource(
  server: McpServer,
  resourceUriString: string,
): RegisteredResource {
  return server.resource(
    'simple_interactive_page',
    resourceUriString,
    { description: 'A simple interactive HTML page with JavaScript.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      // Serve from cache if available.
      if (cachedHtmlContent) {
        console.log('[HtmlPageResource] Serving HTML page from cache.');
        return cachedHtmlContent;
      }

      // --- First-time read and cache population ---
      console.log(
        '[HtmlPageResource] Cache miss. Reading HTML page from filesystem.',
      );
      try {
        // Use process.cwd() for a reliable path from the project root.
        const htmlFilePath = path.resolve(
          process.cwd(),
          'assets/simple_interactive.html',
        );
        const htmlString = await fs.readFile(htmlFilePath, 'utf-8');

        const result: ReadResourceResult = {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html',
              text: htmlString,
            },
          ],
        };

        // Store the result in the cache for the next request.
        cachedHtmlContent = result;
        console.log(
          '[HtmlPageResource] HTML page content cached successfully.',
        );

        return result;
      } catch (error) {
        console.error('[HtmlPageResource] Failed to read HTML file:', error);
        throw new Error('Server error: Could not load interactive page.');
      }
    },
  );
}
