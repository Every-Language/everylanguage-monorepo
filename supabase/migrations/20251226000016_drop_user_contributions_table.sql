-- Drop user_contributions table
-- Migration: 20251226000016_drop_user_contributions_table.sql
-- This migration drops the user_contributions table as requested
DROP TABLE IF EXISTS public.user_contributions cascade;
