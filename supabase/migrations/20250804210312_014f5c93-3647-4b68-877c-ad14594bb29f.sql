-- Add trigger to update updated_at columns for all tables
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

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX idx_recordings_family_member_id ON public.recordings(family_member_id);
CREATE INDEX idx_recordings_processing_status ON public.recordings(processing_status);
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_family_member_id ON public.stories(family_member_id);
CREATE INDEX idx_stories_recording_id ON public.stories(recording_id);
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_family_member_id ON public.personas(family_member_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_persona_id ON public.conversations(persona_id);
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);