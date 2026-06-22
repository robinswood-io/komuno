-- Repeat the orphan CJD seed cleanup after removing application-level auto-seeding.
-- Some standalone instances may have recreated cjd-amiens when the federation
-- admin overview/organizations endpoints were opened between 0022 and this fix.

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
