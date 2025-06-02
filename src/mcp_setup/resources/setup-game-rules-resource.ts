import {
  McpServer,
  RegisteredResource,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises'; // For reading the PDF file asynchronously
import * as path from 'path'; // For constructing the file path correctly

export function setupGameRulesResource(
  server: McpServer,
  uriString: string,
): RegisteredResource {
  return server.resource(
    'game_rules',
    uriString,
    { description: 'The official rules for the Guessing Game (PDF format).' },
    async (uri: URL): Promise<ReadResourceResult> => {
      // Construct the absolute path to the PDF file
      // __dirname is the directory of the current module (where this .ts/.js file is)
      // Adjust the relative path '../../assets/rules.pdf' as needed based on your project structure
      const pdfFilePath = path.resolve(__dirname, '../../../assets/rules.pdf');

      console.log(
        `[setupGameRulesResource] Reading PDF file from: ${pdfFilePath}`,
      );

      // Read the PDF file into a buffer
      const pdfBuffer = await fs.readFile(pdfFilePath);

      // Encode the buffer to a Base64 string
      const base64EncodedBlob = pdfBuffer.toString('base64');

      console.log(base64EncodedBlob);

      return {
        contents: [
          {
            uri: uri.href, // Use the URI passed to the handler
            mimeType: 'application/pdf',
            blob: base64EncodedBlob,
          },
        ],
      };
    },
  );
}
