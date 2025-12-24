-- Add foreign key constraint from bases.region_id to regions.id
-- This was originally planned but never implemented
-- This enables PostgREST to automatically detect the relationship
ALTER TABLE bases
ADD CONSTRAINT bases_region_id_fkey FOREIGN key (region_id) REFERENCES regions (id) ON DELETE SET NULL;


-- Add comment
comment ON CONSTRAINT bases_region_id_fkey ON bases IS 'Foreign key reference to regions table';
