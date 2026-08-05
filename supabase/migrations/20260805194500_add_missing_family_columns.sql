ALTER TABLE public.point_australia 
ADD COLUMN IF NOT EXISTS "spouseDetails" text DEFAULT '',
ADD COLUMN IF NOT EXISTS "childrenCount" integer DEFAULT 0;
