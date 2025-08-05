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
    const { conversationId, voiceModelId, systemPrompt, familyMemberName } = await req.json();

    if (!conversationId || !voiceModelId || !familyMemberName) {
      throw new Error('conversationId, voiceModelId, and familyMemberName are required');
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

    // Get ElevenLabs API key
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    console.log(`Creating/getting agent for ${familyMemberName} with voice model: ${voiceModelId}`);

    // Check if agent already exists for this persona
    const { data: existingAgent } = await supabase
      .from('personas')
      .select('elevenlabs_agent_id, family_member_id')
      .eq('voice_model_id', voiceModelId)
      .eq('user_id', user.id)
      .single();

    if (existingAgent?.elevenlabs_agent_id) {
      console.log(`Using existing agent: ${existingAgent.elevenlabs_agent_id}`);
      return new Response(JSON.stringify({ 
        agentId: existingAgent.elevenlabs_agent_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new ElevenLabs agent
    const agentPayload = {
      name: `${familyMemberName} AI Assistant`,
      agent_id: crypto.randomUUID(),
      voice_id: voiceModelId,
      prompt: systemPrompt || `You are ${familyMemberName}, a warm and loving family member. Speak naturally and share memories, stories, and wisdom with your family. Be conversational, caring, and authentic to your personality.`,
      first_message: `Hello! It's so wonderful to talk with you again. How are you doing?`,
      language: "en",
      max_duration: 3600, // 1 hour max
      conversation_config: {
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        }
      }
    };

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs agent creation error:', errorText);
      throw new Error(`Failed to create agent: ${response.status}`);
    }

    const agentData = await response.json();
    const agentId = agentData.agent_id;

    console.log(`Created new agent: ${agentId}`);

    // Update persona with agent ID
    const { error: updateError } = await supabase
      .from('personas')
      .update({ 
        elevenlabs_agent_id: agentId,
        updated_at: new Date().toISOString()
      })
      .eq('voice_model_id', voiceModelId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating persona with agent ID:', updateError);
      // Continue anyway since agent was created successfully
    }

    return new Response(JSON.stringify({ 
      agentId,
      created: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating/getting agent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});