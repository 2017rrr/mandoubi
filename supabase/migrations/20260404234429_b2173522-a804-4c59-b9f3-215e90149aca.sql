-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;

-- chat-media policies
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated users can read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can read chat media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-media');

-- delivery-photos policies
CREATE POLICY "Authenticated users can upload delivery photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

CREATE POLICY "Authenticated users can read delivery photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'delivery-photos');

CREATE POLICY "Anyone can read delivery photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'delivery-photos');

-- receipts policies
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Anyone can read receipts"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'receipts');