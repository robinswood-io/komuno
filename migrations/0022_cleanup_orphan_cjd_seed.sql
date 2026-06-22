-- Clean up the historical CJD Amiens seed on non-CJD / empty instances.
-- 0021 introduced the federation tables and seeded cjd-amiens as a safe baseline
-- for the existing CJD80 production database. Because the same migration also runs
-- on other Komuno instances (for example REP), remove that baseline when it is
-- clearly orphaned: no owned/origin events, no organization relations and no event
-- syndications reference it. This preserves CJD80, where existing events were
-- backfilled to cjd-amiens, while keeping standalone/external instances isolated.

DELETE FROM organizations o
WHERE o.slug = 'cjd-amiens'
  AND NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.organization_id = o.id OR e.origin_organization_id = o.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM organization_relations r
    WHERE r.from_organization_id = o.id OR r.to_organization_id = o.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM event_syndications s
    WHERE s.source_organization_id = o.id OR s.target_organization_id = o.id
  );

DELETE FROM organization_networks n
WHERE n.slug = 'cjd'
  AND NOT EXISTS (
    SELECT 1 FROM organizations remaining
    WHERE remaining.network_id = n.id
  );
