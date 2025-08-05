import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, fullResponse } = await req.json();
    
    if (!conversationId || !fullResponse) {
      throw new Error('Conversation ID and full response are required');
    }

    console.log('Completing chat message for conversation:', conversationId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        personas (
          id,
          family_member_id,
          family_members (
            name,
            relationship,
            bio
          )
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      throw new Error('Conversation not found');
    }

    const persona = conversation.personas;
    const familyMember = persona.family_members;

    // Find relevant stories mentioned in the response
    const { data: allStories } = await supabase
      .from('stories')
      .select('id, title')
      .eq('family_member_id', persona.family_member_id);

    const referencedStories: string[] = [];
    if (allStories) {
      // Simple matching - look for story titles or keywords in the response
      for (const story of allStories) {
        if (fullResponse.toLowerCase().includes(story.title.toLowerCase().substring(0, 20))) {
          referencedStories.push(story.id);
        }
      }
    }

    // Save AI response
    const { error: aiMessageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: fullResponse,
        is_user_message: false,
        referenced_stories: referencedStories.length > 0 ? referencedStories : null,
      });

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log('Chat message completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        referencedStories: referencedStories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error completing chat message:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});