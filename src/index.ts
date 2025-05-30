import express from 'express';
import morgan from 'morgan';
import mcpRoutes from './routes/mcpRoutes';
import { PORT } from './config';

const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use('/mcp', mcpRoutes);

app.listen(PORT, () => {
  const port = `MCP Game Server (HTTP Stateful) listening on port ${PORT}`;
  const rootEndpoint = `Root MCP endpoint available at /mcp (POST, GET, DELETE)`;

  console.log(`${port}\n${rootEndpoint}`);
});
