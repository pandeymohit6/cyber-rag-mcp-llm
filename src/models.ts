import mongoose, { Schema } from 'mongoose';

const SecurityChunkSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  documentId: { type: Schema.Types.ObjectId, required: true, index: true },
  source: { type: String, required: true },
  content: { type: String, required: true },
  chunkNo: { type: Number, required: true },
  embedding: { type: [Number], required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
SecurityChunkSchema.index({ tenantId: 1, documentId: 1 });
export const SecurityChunk = mongoose.model('SecurityChunk', SecurityChunkSchema);

const DocumentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  sha256: { type: String, required: true },
  status: { type: String, enum: ['processing', 'indexed', 'failed'], default: 'processing' },
  chunkCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });
DocumentSchema.index({ tenantId: 1, sha256: 1 }, { unique: true });
export const SecurityDocument = mongoose.model('SecurityDocument', DocumentSchema);

const IncidentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  incidentId: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], index: true },
  status: { type: String, default: 'open', index: true },
  title: String,
  description: String,
  hostId: String,
  source: String,
  occurredAt: { type: Date, index: true },
  raw: Schema.Types.Mixed
}, { timestamps: true });
IncidentSchema.index({ tenantId: 1, incidentId: 1 }, { unique: true });
IncidentSchema.index({ tenantId: 1, occurredAt: -1 });
export const Incident = mongoose.model('Incident', IncidentSchema);

const AuditSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  actorId: String,
  action: String,
  resource: String,
  requestId: String,
  outcome: String,
  details: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });
export const AuditLog = mongoose.model('AuditLog', AuditSchema);
