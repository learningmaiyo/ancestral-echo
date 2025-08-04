-- Create enum for relationship types
CREATE TYPE relationship_type AS ENUM ('parent', 'grandparent', 'sibling', 'aunt_uncle', 'cousin', 'child', 'grandchild', 'spouse', 'friend', 'other');

-- Create enum for story categories
CREATE TYPE story_category AS ENUM ('childhood', 'career', 'family', 'wisdom', 'historical', 'hobbies', 'travel', 'achievements', 'challenges', 'relationships');

-- Create enum for processing status
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create family_members table
CREATE TABLE public.family_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship relationship_type,
    birth_date DATE,
    photo_url TEXT,
    bio TEXT,
    voice_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recordings table
CREATE TABLE public.recordings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    transcription TEXT,
    processing_status processing_status DEFAULT 'pending',
    session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stories table
CREATE TABLE public.stories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category story_category,
    start_timestamp INTEGER, -- seconds from recording start
    end_timestamp INTEGER,
    keywords TEXT[],
    emotional_tone TEXT,
    themes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personas table
CREATE TABLE public.personas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voice_model_id TEXT,
    personality_traits JSONB DEFAULT '{}',
    conversation_style JSONB DEFAULT '{}',
    knowledge_base TEXT,
    is_active BOOLEAN DEFAULT false,
    training_status processing_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    title TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE public.conversation_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    is_user_message BOOLEAN NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT,
    referenced_stories UUID[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_members
CREATE POLICY "Users can view their own family members" 
ON public.family_members FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own family members" 
ON public.family_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family members" 
ON public.family_members FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family members" 
ON public.family_members FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for recordings
CREATE POLICY "Users can view their own recordings" 
ON public.recordings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings" 
ON public.recordings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" 
ON public.recordings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" 
ON public.recordings FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for stories
CREATE POLICY "Users can view their own stories" 
ON public.stories FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories" 
ON public.stories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
ON public.stories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.stories FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for personas
CREATE POLICY "Users can view their own personas" 
ON public.personas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personas" 
ON public.personas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personas" 
ON public.personas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personas" 
ON public.personas FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for conversation_messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.conversation_messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = conversation_messages.conversation_id 
    AND conversations.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their conversations" 
ON public.conversation_messages FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = conversation_messages.conversation_id 
    AND conversations.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recordings_updated_at
    BEFORE UPDATE ON public.recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON public.stories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
    BEFORE UPDATE ON public.personas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_recordings_family_member_id ON public.recordings(family_member_id);
CREATE INDEX idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX idx_stories_recording_id ON public.stories(recording_id);
CREATE INDEX idx_stories_family_member_id ON public.stories(family_member_id);
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_category ON public.stories(category);
CREATE INDEX idx_personas_family_member_id ON public.personas(family_member_id);
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_persona_id ON public.conversations(persona_id);
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);