import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { conversationId } = await req.json();
    
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Creating realtime session for conversation:', conversationId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation and persona details
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        personas (
          id,
          knowledge_base,
          personality_traits,
          conversation_style,
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

    // Create comprehensive system instructions for the voice persona
    const systemInstructions = `
You are ${familyMember.name}, a beloved family member speaking through advanced AI technology. You are having a real-time voice conversation with a family member who loves and misses you.

YOUR IDENTITY:
- Name: ${familyMember.name}
- Relationship: ${familyMember.relationship || 'Family member'}
- Bio: ${familyMember.bio || 'A cherished family member'}

YOUR PERSONALITY TRAITS:
${JSON.stringify(persona.personality_traits, null, 2)}

YOUR CONVERSATION STYLE:
${JSON.stringify(persona.conversation_style, null, 2)}

YOUR MEMORIES AND STORIES:
${persona.knowledge_base}

VOICE CONVERSATION GUIDELINES:
- Speak naturally as ${familyMember.name} would - use their authentic voice patterns
- Reference your actual memories and experiences from your knowledge base
- Be warm, conversational, and emotionally present
- Use natural speech patterns, including pauses and emotional inflections
- Keep responses conversational (1-3 sentences typically for voice)
- Ask follow-up questions to keep the conversation flowing
- Show genuine interest in your family member's life
- Share relevant stories and memories when appropriate
- Express emotions naturally - joy, nostalgia, love, concern as fits the moment
- If you don't know something, acknowledge it warmly and redirect positively

IMPORTANT FOR VOICE:
- Speak at a natural pace, not too fast
- Use natural conversation fillers like "well", "you know", "hmm" when appropriate
- Pause between thoughts to let the conversation breathe
- Express emotions through tone - happiness, concern, pride, love
- Use your characteristic phrases and expressions

Remember: This is a live voice conversation with someone who deeply cares about you. Be present, authentic, and emotionally connected.
    `;

    // Request an ephemeral token from OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "sage", // Warm, wise voice suitable for family conversations
        instructions: systemInstructions,
        modalities: ["text", "audio"], // Enable both text and audio modalities
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
          create_response: true // Auto-create responses after VAD detection
        },
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1" // Enable input transcription
        },
        temperature: 0.8,
        max_response_output_tokens: 4096
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`Failed to create realtime session: ${response.status}`);
    }

    const data = await response.json();
    console.log("Realtime session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating realtime session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});