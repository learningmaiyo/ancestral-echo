import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not set');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ElevenLabs API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Testing ElevenLabs API connection...');

    // First test: Get available voices
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!voicesResponse.ok) {
      const errorData = await voicesResponse.json();
      console.error('ElevenLabs voices API error:', errorData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `ElevenLabs API error: ${errorData.detail?.message || 'Failed to fetch voices'}`,
        status: voicesResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const voicesData = await voicesResponse.json();
    console.log('Available voices:', voicesData.voices?.length || 0);

    // Second test: Generate a short audio sample
    const testText = "ElevenLabs test successful!";
    const voiceId = "9BWtsMINqrJLrRacOk9x"; // Aria voice

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json();
      console.error('ElevenLabs TTS API error:', errorData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `ElevenLabs TTS error: ${errorData.detail?.message || 'Failed to generate speech'}`,
        status: ttsResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert audio to base64 for testing (small sample)
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioSize = audioBuffer.byteLength;
    
    console.log('TTS test successful, audio size:', audioSize, 'bytes');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'ElevenLabs API is working correctly',
      voicesCount: voicesData.voices?.length || 0,
      audioGenerated: true,
      audioSize: audioSize,
      testText: testText,
      voiceUsed: "Aria (9BWtsMINqrJLrRacOk9x)"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error testing ElevenLabs:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Test failed: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});