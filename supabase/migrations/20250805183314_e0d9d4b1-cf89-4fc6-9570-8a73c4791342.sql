-- Add elevenlabs_agent_id column to personas table for dynamic agent management
ALTER TABLE public.personas 
ADD COLUMN elevenlabs_agent_id TEXT;