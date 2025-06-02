import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function setupSimpleHtmlPageResource(
  server: McpServer,
  resourceUriString: string,
): RegisteredResource {
  return server.resource(
    'simple_interactive_page', // The 'name' or path segment for this resource type
    resourceUriString, // The full, unique URI for this specific resource instance
    { description: 'A simple interactive HTML page with JavaScript.' },
    async (uri: URL): Promise<ReadResourceResult> => {
      const htmlFilePath = path.resolve(
        __dirname,
        '../../../assets/simple_interactive.html',
      );

      console.log(
        `[setupSimpleHtmlPageResource] Reading HTML file from: ${htmlFilePath}`,
      );

      // Read the HTML file content as a UTF-8 string
      const htmlString = await fs.readFile(htmlFilePath, 'utf-8');

      console.log(
        `[setupSimpleHtmlPageResource] HTML content length: ${htmlString.length} characters.`,
      );
      console.log(
        `[setupSimpleHtmlPageResource] HTML content snippet: ${htmlString.substring(0, 200)}...`,
      );

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/html',
            text: htmlString,
          },
        ],
      };
    },
  );
}
