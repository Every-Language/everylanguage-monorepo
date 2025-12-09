-- Allow system admins to insert, update, and delete MANUAL donations
-- Manual donations are created by admins through the admin dashboard
-- Regular donations go through edge functions with service role keys
-- ============================================================================
-- INSERT: System admins can insert donations if is_manual = true
CREATE POLICY donations_insert_manual ON donations FOR insert TO authenticated
WITH
  CHECK (
    -- Must be a system admin
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
    -- AND the donation must be marked as manual
    AND is_manual = TRUE
  );


-- UPDATE: System admins can update donations if is_manual = true
CREATE POLICY donations_update_manual ON donations
FOR UPDATE
  TO authenticated USING (
    -- Must be a system admin
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
    -- AND the donation must be marked as manual
    AND is_manual = TRUE
  )
WITH
  CHECK (
    -- Ensure the donation remains marked as manual after update
    is_manual = TRUE
  );


-- DELETE: System admins can delete donations if is_manual = true
CREATE POLICY donations_delete_manual ON donations FOR delete TO authenticated USING (
  -- Must be a system admin
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
  -- AND the donation must be marked as manual
  AND is_manual = TRUE
);


-- Add comments explaining the policies
comment ON policy donations_insert_manual ON donations IS 'System admins can insert manual donations (is_manual = true) through the admin dashboard';


comment ON policy donations_update_manual ON donations IS 'System admins can update manual donations (is_manual = true)';


comment ON policy donations_delete_manual ON donations IS 'System admins can delete manual donations (is_manual = true)';
