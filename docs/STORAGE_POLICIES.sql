-- ============================================
-- STORAGE POLICIES — bucket "activity-images"
-- ICU Class Bank Hana (MVP)
-- ============================================
-- Prasyarat: buat bucket "activity-images" (private) lewat
-- Supabase Dashboard → Storage → New bucket.
--
-- Catatan: MVP ini memakai anon key tanpa Supabase Auth penuh,
-- sehingga policy diizinkan untuk role anon. Perketat saat produksi.

-- Izinkan upload (INSERT) ke bucket activity-images
CREATE POLICY "icu_upload_activity_images"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'activity-images');

-- Izinkan baca (SELECT) objek di bucket activity-images
CREATE POLICY "icu_read_activity_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'activity-images');

-- Izinkan update/replace (upsert) objek di bucket activity-images
CREATE POLICY "icu_update_activity_images"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'activity-images')
  WITH CHECK (bucket_id = 'activity-images');

-- Izinkan hapus objek di bucket activity-images
CREATE POLICY "icu_delete_activity_images"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'activity-images');
