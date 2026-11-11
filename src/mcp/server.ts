import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema, ListToolsRequestSchema,
  ListResourcesRequestSchema, ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Incident } from '../models.js';
import { searchIncidents, getHostSummary } from '../services/security-tools.js';

// Dedicated stdio MCP server. The MCP host supplies tenant identity via a
// trusted deployment boundary; never accept tenantId from model arguments.
const tenantId = process.env.MCP_TENANT_ID;
if (!tenantId) throw new Error('MCP_TENANT_ID is required for this dedicated tenant process');

const server = new Server(
  { name: 'cyber-security-tools', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_incidents',
      description: 'Read-only search of recent incidents for this MCP tenant.',
      inputSchema: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical','high','medium','low'] },
          hours: { type: 'number', minimum: 1, maximum: 720 }
        },
        required: ['hours']
      }
    },
    {
      name: 'get_host_summary',
      description: 'Read-only host risk summary for this MCP tenant.',
      inputSchema: { type: 'object', properties: { hostId: { type: 'string' } }, required: ['hostId'] }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const args = request.params.arguments ?? {};
  try {
    if (request.params.name === 'search_incidents') {
      const result = await searchIncidents(tenantId, {
        severity: typeof args.severity === 'string' ? args.severity : null,
        hours: Number(args.hours ?? 24)
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    if (request.params.name === 'get_host_summary') {
      const result = await getHostSummary(tenantId, String(args.hostId ?? ''));
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    return { isError: true, content: [{ type: 'text', text: 'Unknown tool' }] };
  } catch {
    return { isError: true, content: [{ type: 'text', text: 'Tool execution failed' }] };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [{
    uri: 'cyber://tenant/incident-summary',
    name: 'Incident summary',
    description: 'Counts of incidents by severity for the configured tenant.',
    mimeType: 'application/json'
  }]
}));
server.setRequestHandler(ReadResourceRequestSchema, async request => {
  if (request.params.uri !== 'cyber://tenant/incident-summary') throw new Error('Unknown resource');
  const counts = await Incident.aggregate([
    { $match: { tenantId } },
    { $group: { _id: '$severity', count: { $sum: 1 } } }
  ]);
  return {
    contents: [{
      uri: request.params.uri, mimeType: 'application/json',
      text: JSON.stringify(counts)
    }]
  };
});

await connectDb();
const transport = new StdioServerTransport();
await server.connect(transport);
process.on('SIGINT', async () => { await server.close(); await mongoose.disconnect(); process.exit(0); });
