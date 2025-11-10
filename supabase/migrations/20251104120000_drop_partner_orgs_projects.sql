-- Drop the unused partner_orgs_projects table
-- This table is being replaced by the sponsorship flow: 
-- partner_org → sponsorship → sponsorship_allocation → project
DROP TABLE IF EXISTS public.partner_orgs_projects cascade;


comment ON schema public IS 'Partner org relationships now managed through sponsorships and sponsorship_allocations';
