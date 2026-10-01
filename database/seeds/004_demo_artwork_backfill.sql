-- =============================================================================
-- PlaySphere — Backfill Local Placeholder Ground Artwork
-- Safe to re-run. Existing image galleries are preserved.
-- =============================================================================

BEGIN;

UPDATE grounds AS ground
SET images = COALESCE(
  (
    SELECT jsonb_agg(sport_images.image_url)
    FROM (
      SELECT DISTINCT CASE sport.slug
        WHEN 'football' THEN '/images/demo/grounds/realistic/ground-football.jpg'
        WHEN 'cricket' THEN '/images/demo/grounds/realistic/ground-cricket.jpg'
        WHEN 'basketball' THEN '/images/demo/grounds/realistic/ground-basketball.jpg'
        WHEN 'volleyball' THEN '/images/demo/grounds/realistic/ground-volleyball.jpg'
        WHEN 'badminton' THEN '/images/demo/grounds/realistic/ground-badminton.jpg'
        ELSE '/images/demo/grounds/realistic/ground-multisport.jpg'
      END AS image_url
      FROM ground_sports AS ground_sport
      JOIN sports AS sport ON sport.id = ground_sport.sport_id
      WHERE ground_sport.ground_id = ground.id
      ORDER BY image_url
    ) AS sport_images
  ),
  '["/images/demo/grounds/realistic/ground-multisport.jpg"]'::jsonb
)
WHERE ground.images IS NULL OR ground.images = '[]'::jsonb;

COMMIT;
