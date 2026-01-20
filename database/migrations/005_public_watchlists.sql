-- Migration: 005_public_watchlists.sql
-- Description: Adds privacy and discovery fields to watchlist_folders

-- Add fields to watchlist_folders
ALTER TABLE watchlist_folders 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for faster slug lookup
CREATE INDEX IF NOT EXISTS idx_watchlist_folders_slug ON watchlist_folders(slug);

-- Create index for public discovery
CREATE INDEX IF NOT EXISTS idx_watchlist_folders_public ON watchlist_folders(is_public) WHERE is_public = TRUE;

-- Update existing records to have a default slug based on ID if they don't have one
-- This is a fallback to ensure uniqueness
UPDATE watchlist_folders 
SET slug = 'watchlist-' || id::text 
WHERE slug IS NULL;
