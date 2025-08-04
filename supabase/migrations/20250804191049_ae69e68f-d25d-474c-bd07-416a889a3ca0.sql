-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);

-- Create policies for recordings bucket
CREATE POLICY "Users can view their own recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own recordings" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);