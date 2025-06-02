import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises'; // For reading the image file asynchronously
import * as path from 'path'; // For constructing the file path correctly

/**
 * Creates a resource that serves the banner image.
 * @param server The McpServer instance.
 * @param baseUriString The base URI string for the server (e.g., "mcp://YourGameServerName").
 * @returns The RegisteredResource object.
 */
export function setupBannerImageResource(
  server: McpServer,
  resourceUriString: string, // e.g., "mcp://YourGameServerName"
): RegisteredResource {
  return server.resource(
    'banner_image', // The name part of the URI path for the resource
    resourceUriString,
    { description: 'The official banner image for the Guessing Game.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      const imageFilePath = path.resolve(
        __dirname,
        '../../../assets/banner.webp',
      );

      console.log(
        `[setupBannerImageResource] Reading image file from: ${imageFilePath}`,
      );

      // Read the image file into a buffer
      const imageBuffer = await fs.readFile(imageFilePath);

      // Encode the buffer to a Base64 string
      const base64EncodedBlob = imageBuffer.toString('base64');

      // Log only a snippet for large images to avoid flooding console
      console.log(
        `[setupBannerImageResource] Base64 Encoded Image Blob (first 60 chars): ${base64EncodedBlob.substring(0, 60)}...`,
      );
      console.log(
        `[setupBannerImageResource] Image Buffer Length: ${imageBuffer.length}, Base64 Length: ${base64EncodedBlob.length}`,
      );

      return {
        contents: [
          {
            uri: uri.href, // Use the URI passed to the handler
            mimeType: 'image/webp', // Correct MIME type for a webp image
            blob: base64EncodedBlob,
          },
        ],
      };
    },
  );
}
