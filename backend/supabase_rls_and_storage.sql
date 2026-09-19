-- ==============================================================================
-- Supabase RLS and Storage Security Policies Migration for mo7eb
-- ==============================================================================
-- IMPORTANT: Run this SQL script in your Supabase SQL Editor as a Project Owner / Postgres Superuser.
-- Note: The application connects via Prisma using the connection pooler with server-side role checks.
-- If direct Supabase client access / PostgREST is exposed, the following RLS policies secure every table.

-- 1. Enable RLS on all Application Tables
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MerchantInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Provider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Package" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SubscriptionCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MerchantPaymentObligation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CustomerCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PointTransaction" ENABLE ROW LEVEL SECURITY;

-- 2. Providers and Packages: Publicly readable for active items
DROP POLICY IF EXISTS "Public can view active providers" ON "Provider";
CREATE POLICY "Public can view active providers"
  ON "Provider" FOR SELECT
  USING ("isActive" = true);

DROP POLICY IF EXISTS "Public can view active packages" ON "Package";
CREATE POLICY "Public can view active packages"
  ON "Package" FOR SELECT
  USING ("isActive" = true);

DROP POLICY IF EXISTS "Public can view active payment methods" ON "PaymentMethod";
CREATE POLICY "Public can view active payment methods"
  ON "PaymentMethod" FOR SELECT
  USING ("isActive" = true);

-- 3. Service Role full access (Express backend runtime)
-- The backend uses prisma with postgres pooler/service role, granting full administrative access
DROP POLICY IF EXISTS "Service role has full access to all tables" ON "User";
CREATE POLICY "Service role has full access to all tables"
  ON "User" FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Storage Bucket Setup: "invoice-images" (Private Bucket)
-- Ensure the storage bucket exists and is marked PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-images',
  'invoice-images',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage Object Policies (Controlled via Backend Service Role / Signed URLs)
-- Users cannot directly read or list objects in the private bucket without signed URLs
DROP POLICY IF EXISTS "Service role storage manage" ON storage.objects;
CREATE POLICY "Service role storage manage"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'invoice-images')
  WITH CHECK (bucket_id = 'invoice-images');
