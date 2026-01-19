-- Placeholder data for local donation flow testing
-- Inserts minimal regions/languages with funding to populate donation selectors.

-- Regions
INSERT INTO regions (id, name, level)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Region North', 'country'),
  ('22222222-2222-2222-2222-222222222222', 'Test Region South', 'country')
ON CONFLICT (id) DO NOTHING;

-- Languages
INSERT INTO language_entities (id, name, level)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Language Alpha', 'language'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Language Beta', 'language')
ON CONFLICT (id) DO NOTHING;

-- Language ↔ Region links
INSERT INTO language_entities_regions (
  id,
  language_entity_id,
  region_id,
  dominance_level
)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1.0),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 0.8)
ON CONFLICT (language_entity_id, region_id) DO NOTHING;

-- Language funding
INSERT INTO language_funding (
  id,
  language_entity_id,
  funding_status,
  budget_cents
)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'available', 250000),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'available', 150000)
ON CONFLICT (language_entity_id) DO NOTHING;

-- Refresh cached region funding to include placeholder data
REFRESH MATERIALIZED VIEW public.region_funding_cached;
