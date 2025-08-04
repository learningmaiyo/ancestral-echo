-- Add voice model tracking to personas table
ALTER TABLE public.personas 
ADD COLUMN voice_model_id TEXT,
ADD COLUMN voice_model_status TEXT DEFAULT 'pending' CHECK (voice_model_status IN ('pending', 'training', 'ready', 'failed')),
ADD COLUMN voice_samples_count INTEGER DEFAULT 0;

-- Create voice_samples table to track audio samples used for cloning
CREATE TABLE public.voice_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  quality_score DECIMAL(3,2), -- 0.00 to 1.00
  is_used_for_training BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

-- Voice samples policies
CREATE POLICY "Users can view their own voice samples" 
ON public.voice_samples 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.personas p 
  WHERE p.id = voice_samples.persona_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create voice samples for their personas" 
ON public.voice_samples 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.personas p 
  WHERE p.id = voice_samples.persona_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update their own voice samples" 
ON public.voice_samples 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.personas p 
  WHERE p.id = voice_samples.persona_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own voice samples" 
ON public.voice_samples 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.personas p 
  WHERE p.id = voice_samples.persona_id 
  AND p.user_id = auth.uid()
));

-- Add trigger for voice_samples updated_at
CREATE TRIGGER update_voice_samples_updated_at
BEFORE UPDATE ON public.voice_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();