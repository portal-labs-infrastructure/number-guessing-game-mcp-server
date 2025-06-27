import express from 'express';
import morgan from 'morgan';
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import mcpRoutes from './routes/mcp.routes';
import { PORT, BASE_URL, OAUTH_ISSUER_URL, DOCS_URL } from './config';
import packageJson from '../package.json';
import { db } from './services/firestore.service';

const app = express();
app.set('trust proxy', 1 /* number of proxies between user and server */);
app.use(express.json());
app.use(morgan('dev'));

const serverUrl = new URL('mcp', BASE_URL);
const issuerUrl = new URL(OAUTH_ISSUER_URL);

app.use(
  mcpAuthMetadataRouter({
    oauthMetadata: {
      issuer: issuerUrl.toString(),
      authorization_endpoint: issuerUrl.toString() + 'oauth/authorize',
      token_endpoint: issuerUrl.toString() + 'oauth/token',
      registration_endpoint: issuerUrl.toString() + 'oauth/register',
      scopes_supported: ['default'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      service_documentation: new URL(DOCS_URL).toString(),
      revocation_endpoint: issuerUrl.toString() + 'oauth/revoke',
      code_challenge_methods_supported: ['S256'],
    },
    resourceServerUrl: serverUrl,
    serviceDocumentationUrl: new URL(DOCS_URL),
    scopesSupported: ['default'],
    resourceName: packageJson.name,
  }),
);

app.use(
  '/mcp',
  requireBearerAuth({
    verifier: {
      verifyAccessToken: async (token) => {
        // Use db to verify the token
        const tokenDoc = await db
          .collection('oauth_access_tokens')
          .doc(token)
          .get();
        if (!tokenDoc.exists) {
          throw new Error(`Token ${token} not found`);
        }
        const data = tokenDoc.data();
        return {
          token,
          clientId: data?.client_id,
          scopes: data?.scope,
          extra: {
            user_id: data?.user_id,
          },
        };
      },
    },
    requiredScopes: ['default'],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(serverUrl),
  }),
  mcpRoutes,
);

app.get('/', (req, res) => {
  const statusToSend = 200;

  res.status(statusToSend).send('OK');
});

app.listen(PORT, () => {
  const port = `MCP Game Server (HTTP Stateful) listening on port ${PORT}`;
  const rootEndpoint = `Root MCP endpoint available at /mcp (POST, GET, DELETE)`;

  console.log(`${port}\n${rootEndpoint}`);
});
