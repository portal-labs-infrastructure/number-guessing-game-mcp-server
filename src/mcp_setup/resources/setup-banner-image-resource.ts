import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Cache ---
// We'll store the prepared resource content here after the first read.
let cachedBannerContent: ReadResourceResult | null = null;

/**
 * Creates a resource that serves the banner image.
 * This version caches the image content in memory after the first read to improve performance.
 * @param server The McpServer instance.
 * @param resourceUriString The full URI for this resource.
 * @returns The RegisteredResource object.
 */
export function setupBannerImageResource(
  server: McpServer,
  resourceUriString: string,
): RegisteredResource {
  return server.resource(
    'banner_image',
    resourceUriString,
    { description: 'The official banner image for the Guessing Game.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      // If we already have the content in our cache, return it immediately.
      if (cachedBannerContent) {
        console.log('[BannerResource] Serving banner from cache.');
        return cachedBannerContent;
      }

      // --- First-time read and cache population ---
      console.log(
        '[BannerResource] Cache miss. Reading banner from filesystem.',
      );
      try {
        // Make sure the path is correct relative to the execution directory.
        // This assumes you run your script from the project root.
        const imageFilePath = path.resolve(process.cwd(), 'assets/banner.webp');
        const imageBuffer = await fs.readFile(imageFilePath);
        const base64EncodedBlob = imageBuffer.toString('base64');

        // Prepare the result object
        const result: ReadResourceResult = {
          contents: [
            {
              uri: uri.href,
              mimeType: 'image/webp',
              blob: base64EncodedBlob,
            },
          ],
        };

        // Store it in the cache for subsequent requests.
        cachedBannerContent = result;
        console.log('[BannerResource] Banner content cached successfully.');

        return result;
      } catch (error) {
        console.error(
          '[BannerResource] Failed to read banner image file:',
          error,
        );
        throw new Error('Server error: Could not load banner image.');
      }
    },
  );
}
