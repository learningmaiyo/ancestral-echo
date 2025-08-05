import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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
    const { conversationId } = await req.json();

    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get the conversation and persona details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        personas (
          name,
          personality_traits,
          conversation_style,
          voice_model_id,
          knowledge_base
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    const persona = conversation.personas;
    if (!persona) {
      throw new Error('Persona not found for this conversation');
    }

    // Get ElevenLabs API key
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    // Create a custom prompt for the voice agent based on the persona
    const systemPrompt = `You are ${persona.name}, speaking as if you were alive and talking to a family member. 

Personality: ${persona.personality_traits}
Communication Style: ${persona.conversation_style}

Background Knowledge: ${persona.knowledge_base}

Important instructions:
- Speak naturally and conversationally as ${persona.name}
- Reference your memories and experiences from your knowledge base when relevant
- Keep responses concise but warm and personal
- Ask follow-up questions to engage in meaningful conversation
- Never break character or mention that you are an AI
- Use the speaking style and vocabulary that matches your personality`;

    // Generate signed URL for ElevenLabs Conversational AI
    // Note: For now, we'll return the agent configuration. 
    // In production, you'd create specific voice agents in ElevenLabs dashboard
    // and use their agent IDs here to generate signed URLs
    
    const agentConfig = {
      systemPrompt,
      personaName: persona.name,
      voiceId: persona.voice_model_id || "9BWtsMINqrJLrRacOk9x", // Default to Aria voice
      conversationId: conversationId
    };

    console.log(`Generated voice agent config for persona: ${persona.name}`);

    return new Response(JSON.stringify({ 
      agentConfig,
      // For demo purposes - in production you'd return a signed URL
      // signedUrl: generatedSignedUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error generating voice agent URL:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});