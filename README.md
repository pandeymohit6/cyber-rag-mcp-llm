# Cyber Proactive Defence — RAG + MCP + LLM

Enterprise starter implementation using Express + TypeScript, MongoDB Atlas Vector Search,
OpenAI Responses API and the official MCP TypeScript SDK v1 compatibility line.

## Architecture

- Express API: JWT authentication, tenant scoping, chat, document ingestion and incident APIs.
- RAG: chunking, OpenAI embeddings, MongoDB Atlas Vector Search and source citations.
- LLM: OpenAI Responses API with a bounded function-calling loop.
- MCP: separate stdio server exposing read-only incident tools and a summary resource.
- Security: tenant ID comes from verified JWT claims in the API; MCP uses a deployment-bound
  `MCP_TENANT_ID`, never a model-provided tenant argument.

## Requirements

- Node.js 22+
- MongoDB Atlas cluster with Vector Search enabled
- OpenAI API key
- MongoDB database user with least-privilege access

## Run

```bash
cp .env.example .env
npm install
# Fill .env values
npm run dev
```

Create the Atlas Vector Search index:

```bash
node scripts/create-vector-index.js
```

The index collection name defaults to `securitychunks` (Mongoose lowercases the model name).

## API

All `/api/*` routes require `Authorization: Bearer <JWT>`.
JWT claims must include `sub`, `tenantId`, `roles`, and the configured issuer.

- `GET /health`
- `POST /api/documents` — `{ "filename": "ir-runbook.txt", "text": "..." }`
- `GET /api/documents`
- `POST /api/chat` — `{ "question": "Summarize critical incidents in the last 24 hours" }`
- `GET /api/incidents?severity=critical&limit=50`
- `POST /api/incidents/ingest` — admin/ingestion-service role; batch of up to 1000 records

## MCP

The LLM orchestrator is an MCP client: it starts a tenant-bound stdio MCP worker, discovers tools with `listTools`, exposes those tools as OpenAI function tools, and forwards model-requested calls through MCP `callTool`. The worker is isolated by `MCP_TENANT_ID`.

Build before starting the API so `dist/mcp/server.js` exists:

```bash
npm run build
```

This sample runs MCP over stdio as a separate tenant-bound process:

```bash
MCP_TENANT_ID=tenant-acme npm run dev:mcp
```

The API process also starts this worker automatically using `MCP_COMMAND` and `MCP_ARGS`.
Do not expose stdio MCP directly to untrusted clients. For multi-tenant deployments, run
isolated API/MCP worker pools per tenant or replace this transport with authenticated
Streamable HTTP and derive tenant identity from verified session credentials.

Tools:
- `search_incidents`
- `get_host_summary`

Resource:
- `cyber://tenant/incident-summary`

## Vector index

The supplied script creates a 1536-dimensional cosine vector index and a tenant filter.
If you switch embedding models, update dimensions and re-index every document.

## Important production gaps to close before deployment

1. Add PDF/DOCX parsers in an isolated ingestion worker; this starter accepts extracted text.
2. Move embedding/indexing to a queue (BullMQ/Kafka/RabbitMQ) with retries and a dead-letter queue.
3. Add rate limits, request-size limits per tenant, WAF and secret manager integration.
4. Validate JWT issuer, audience, key rotation and algorithm; use JWKS for an enterprise IdP.
5. Add tenant-scoped MongoDB indexes and enforce tenant filters in every query.
6. Add authorization checks for every MCP tool; keep write/remediation tools approval-gated.
7. Add prompt-injection defenses: retrieved text is untrusted, tool arguments are validated,
   and tools must enforce authorization independently of the model.
8. Add retention policies, encryption at rest/in transit, PII/secrets redaction and audit retention.
9. Add OpenTelemetry traces, metrics, structured logs, token/cost telemetry and alerting.
10. Add integration tests, load tests, dependency scanning, container scanning and CI/CD gates.
11. Add conversation persistence with tenant/user ownership and retention controls.
12. Add hybrid retrieval (keyword + vector), reranking, query expansion and evaluation datasets.

## Data model

- `securitydocuments`: tenantId, filename, sha256, status, chunkCount, createdAt
- `securitychunks`: tenantId, documentId, source, content, chunkNo, embedding, metadata
- `incidents`: tenantId, incidentId, severity, status, title, description, hostId, source, occurredAt
- `auditlogs`: tenantId, actorId, action, resource, requestId, outcome, details, createdAt

## Limitations

This is a runnable starter/reference implementation, not a certified security product.
The sample MCP server is stdio-based and tenant-bound to one process. The REST chat path uses
application function tools; the MCP server is separately consumable by an MCP host. A production
orchestrator should connect to MCP using the MCP client SDK and bridge discovered tools into
the LLM tool loop. No destructive remediation capability is included.
