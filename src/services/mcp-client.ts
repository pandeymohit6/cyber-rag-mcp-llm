import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let client: Client | undefined;
let transport: StdioClientTransport | undefined;
let cachedTools: any[] | undefined;

export async function getMcpTools() {
  if (cachedTools) return cachedTools;
  const tenantId = process.env.MCP_TENANT_ID;
  if (!tenantId) throw new Error('MCP_TENANT_ID must be configured for the API process');

  client = new Client({ name: 'cyber-llm-orchestrator', version: '1.0.0' });
  const command = process.env.MCP_COMMAND || process.execPath;
  const args = process.env.MCP_ARGS
    ? JSON.parse(process.env.MCP_ARGS) as string[]
    : ['dist/mcp/server.js'];

  transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, MCP_TENANT_ID: tenantId } as Record<string, string>
  });
  await client.connect(transport);
  const listed = await client.listTools();
  cachedTools = listed.tools;
  return cachedTools;
}

export async function callMcpTool(name: string, args: Record<string, unknown>) {
  if (!client) await getMcpTools();
  return client!.callTool({ name, arguments: args });
}

export async function closeMcpClient() {
  cachedTools = undefined;
  if (client) await client.close();
  client = undefined;
  transport = undefined;
}
