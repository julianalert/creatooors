-- Migration to add profile scraping fields to creator table
-- Run this in your Supabase SQL editor

-- Add new columns to the creator table
ALTER TABLE creator 
ADD COLUMN platform TEXT,
ADD COLUMN profile_data JSONB,
ADD COLUMN scraped_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX idx_creator_platform ON creator(platform);
CREATE INDEX idx_creator_scraped_at ON creator(scraped_at);

-- Add comments for documentation
COMMENT ON COLUMN creator.platform IS 'Social media platform: instagram, tiktok, or youtube';
COMMENT ON COLUMN creator.profile_data IS 'Scraped profile data from ScrapeCreators API';
COMMENT ON COLUMN creator.scraped_at IS 'Timestamp when profile data was last scraped';
