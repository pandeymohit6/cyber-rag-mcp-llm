import { Incident } from '../models.js';

export async function searchIncidents(
  tenantId: string, args: { severity: string | null; hours: number }
) {
  const since = new Date(Date.now() - args.hours * 60 * 60 * 1000);
  const filter: Record<string, unknown> = { tenantId, occurredAt: { $gte: since } };
  if (args.severity) filter.severity = args.severity;
  const rows = await Incident.find(filter)
    .select('incidentId severity status title description hostId source occurredAt')
    .sort({ occurredAt: -1 }).limit(100).lean();
  return { count: rows.length, incidents: rows };
}

export async function getHostSummary(tenantId: string, hostId: string) {
  const [summary] = await Incident.aggregate([
    { $match: { tenantId, hostId } },
    { $group: {
      _id: '$hostId', total: { $sum: 1 },
      critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
      high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
      latest: { $max: '$occurredAt' }
    }}
  ]);
  return summary ?? { hostId, total: 0, critical: 0, high: 0, latest: null };
}
