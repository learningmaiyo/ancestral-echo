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
    console.log('Debug audio function started');
    
    const body = await req.json().catch(() => ({}));
    console.log('Request body:', body);
    
    const { recordingId } = body;
    
    if (!recordingId) {
      console.error('Missing recordingId in request');
      throw new Error('Recording ID is required');
    }

    console.log('Debugging recording:', recordingId);

    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const assemblyAIApiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      assemblyAIApiKey: !!assemblyAIApiKey
    });
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    if (!assemblyAIApiKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      console.error('Recording error:', recordingError);
      throw new Error(`Recording not found: ${recordingError?.message || 'Unknown error'}`);
    }

    console.log('Recording found:', {
      id: recording.id,
      audio_url: recording.audio_url,
      processing_status: recording.processing_status
    });

    // Test downloading the audio file
    const urlPath = new URL(recording.audio_url).pathname;
    const filePath = urlPath.split('/storage/v1/object/public/recordings/')[1];
    
    console.log('Attempting to download file:', filePath);
    
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('recordings')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    if (!audioData) {
      throw new Error('No audio data received');
    }

    const audioSize = audioData.size;
    console.log('Audio file downloaded successfully:');
    console.log('- Size:', audioSize, 'bytes');
    console.log('- Type:', audioData.type);

    // Test AssemblyAI API access
    console.log('Testing AssemblyAI API access...');
    
    // First, upload the audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIApiKey,
      },
      body: audioData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AssemblyAI upload failed:', errorText);
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Audio uploaded to AssemblyAI:', uploadResult.upload_url);

    // Submit transcription request
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        speaker_labels: true,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error('AssemblyAI transcription request failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Transcription request failed: ${transcriptResponse.status} - ${errorText}`,
          message: 'Transcription API call failed',
          details: {
            recording_id: recordingId,
            audio_size: audioSize,
            assemblyai_status: transcriptResponse.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcriptResult = await transcriptResponse.json();
    console.log('Transcription request submitted, ID:', transcriptResult.id);

    // Poll for completion (with timeout for debug purposes)
    let transcript = transcriptResult;
    const maxAttempts = 10; // Limit polling for debug
    let attempts = 0;

    while (transcript.status !== 'completed' && transcript.status !== 'error' && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}, status: ${transcript.status}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcript.id}`, {
        headers: {
          'authorization': assemblyAIApiKey,
        },
      });

      if (pollResponse.ok) {
        transcript = await pollResponse.json();
      }
      
      attempts++;
    }

    if (transcript.status === 'error') {
      console.error('AssemblyAI transcription error:', transcript.error);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Transcription failed: ${transcript.error}`,
          message: 'Transcription processing failed',
          details: {
            recording_id: recordingId,
            audio_size: audioSize,
            assemblyai_status: transcript.status,
            assemblyai_error: transcript.error
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transcript.status !== 'completed') {
      console.log('Transcription still processing after timeout');
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Audio debugging completed - transcription still processing',
          details: {
            recording_id: recordingId,
            audio_size: audioSize,
            assemblyai_status: transcript.status,
            note: 'Transcription submitted successfully but still processing'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transcription successful:', transcript.text?.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Audio debugging completed successfully',
        details: {
          recording_id: recordingId,
          audio_size: audioSize,
          audio_type: audioData.type,
          transcription_preview: transcript.text?.substring(0, 200) + '...',
          assemblyai_status: transcript.status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Debug function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Debug test failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});