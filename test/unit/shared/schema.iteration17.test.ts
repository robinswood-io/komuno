import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 17 - table constraints/indexes remaining branches', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers eventSponsorships constraints and foreign-key references', () => {
    const eventSponsorshipConfig = getTableConfig(schema.eventSponsorships);

    expect(eventSponsorshipConfig.indexes).toHaveLength(4);
    expect(eventSponsorshipConfig.uniqueConstraints).toHaveLength(1);
    expect(eventSponsorshipConfig.foreignKeys).toHaveLength(2);

    const indexNames = eventSponsorshipConfig.indexes.map((indexDef) => indexDef.config.name);
    expect(indexNames).toContain('event_sponsorships_event_id_idx');
    expect(indexNames).toContain('event_sponsorships_patron_id_idx');
    expect(indexNames).toContain('event_sponsorships_status_idx');
    expect(indexNames).toContain('event_sponsorships_level_idx');

    const uniqueNames = eventSponsorshipConfig.uniqueConstraints.map((constraint) =>
      constraint.getName(),
    );
    expect(uniqueNames).toContain('event_sponsorships_event_id_patron_id_unique');

    const fkToEvent = eventSponsorshipConfig.foreignKeys[0]?.reference();
    const fkToPatron = eventSponsorshipConfig.foreignKeys[1]?.reference();

    expect(fkToEvent?.foreignTable).toBe(schema.events);
    expect(fkToEvent?.columns.map((column) => column.name)).toEqual(['event_id']);
    expect(fkToEvent?.foreignColumns.map((column) => column.name)).toEqual(['id']);

    expect(fkToPatron?.foreignTable).toBe(schema.patrons);
    expect(fkToPatron?.columns.map((column) => column.name)).toEqual(['patron_id']);
    expect(fkToPatron?.foreignColumns.map((column) => column.name)).toEqual(['id']);
  });

  it('covers trackingMetrics/trackingAlerts/featureConfig index callbacks', () => {
    const trackingMetricsConfig = getTableConfig(schema.trackingMetrics);
    const trackingAlertsConfig = getTableConfig(schema.trackingAlerts);
    const featureConfig = getTableConfig(schema.featureConfig);

    expect(trackingMetricsConfig.indexes).toHaveLength(5);
    expect(trackingAlertsConfig.indexes).toHaveLength(8);
    expect(featureConfig.indexes).toHaveLength(1);

    const trackingMetricIndexNames = trackingMetricsConfig.indexes.map(
      (indexDef) => indexDef.config.name,
    );
    expect(trackingMetricIndexNames).toContain('tracking_metrics_entity_type_idx');
    expect(trackingMetricIndexNames).toContain('tracking_metrics_metric_type_idx');
    expect(trackingMetricIndexNames).toContain('tracking_metrics_recorded_at_idx');

    const trackingAlertIndexNames = trackingAlertsConfig.indexes.map(
      (indexDef) => indexDef.config.name,
    );
    expect(trackingAlertIndexNames).toContain('tracking_alerts_alert_type_idx');
    expect(trackingAlertIndexNames).toContain('tracking_alerts_is_read_idx');
    expect(trackingAlertIndexNames).toContain('tracking_alerts_created_at_idx');

    expect(featureConfig.indexes[0]?.config.name).toBe('feature_config_key_idx');
  });
});
