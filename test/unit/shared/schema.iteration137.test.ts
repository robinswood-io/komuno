import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 137', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers member relation / tracking metric / tracking alert optional transform branches', () => {
    const relation = schema.insertMemberRelationSchema.safeParse({
      memberEmail: 'm1@example.com',
      relatedMemberEmail: 'm2@example.com',
      relationType: 'custom',
      description: 'Relation <historique>',
      createdBy: 'author.test@example.com',
    });

    expect(relation.success).toBe(true);
    if (relation.success) {
      expect(relation.data.description).toBe('Relation historique');
      expect(relation.data.createdBy).toBe('author.test@example.com');
    }

    const metric = schema.insertTrackingMetricSchema.safeParse({
      entityType: 'member',
      entityId: 'metric-137',
      entityEmail: 'metric@example.com',
      metricType: 'activity',
      metricData: 'payload <json>',
      description: 'Description <métrique>',
      recordedBy: 'recorder.ops@example.com',
    });

    expect(metric.success).toBe(true);
    if (metric.success) {
      expect(metric.data.metricData).toBe('payload json');
      expect(metric.data.description).toBe('Description métrique');
      expect(metric.data.recordedBy).toBe('recorder.ops@example.com');
    }

    const alert = schema.insertTrackingAlertSchema.safeParse({
      entityType: 'patron',
      entityId: 'alert-137',
      entityEmail: 'alert@example.com',
      alertType: 'needs_followup',
      title: 'Alerte <suivi>',
      message: 'Message <important>',
      createdBy: 'monitor.bot@example.com',
    });

    expect(alert.success).toBe(true);
    if (alert.success) {
      expect(alert.data.createdBy).toBe('monitor.bot@example.com');
      expect(alert.data.title).toBe('Alerte suivi');
      expect(alert.data.message).toBe('Message important');
    }
  });
});
