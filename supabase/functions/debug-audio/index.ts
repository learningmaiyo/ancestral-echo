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
    const { recordingId } = await req.json();
    
    if (!recordingId) {
      throw new Error('Recording ID is required');
    }

    console.log('Debugging recording:', recordingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found');
    }

    console.log('Recording found:', {
      id: recording.id,
      audio_url: recording.audio_url,
      processing_status: recording.processing_status
    });

    // Test downloading the audio file
    try {
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

      // Test OpenAI API key
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('OpenAI API key is configured');

      // Test a simple OpenAI request (not audio transcription)
      try {
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
        });

        console.log('OpenAI API test status:', testResponse.status);
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error('OpenAI API test failed:', errorText);
          throw new Error(`OpenAI API test failed: ${testResponse.status} - ${errorText}`);
        }

        console.log('OpenAI API is accessible');

      } catch (error) {
        console.error('OpenAI API test error:', error);
        throw new Error(`OpenAI API connection failed: ${error.message}`);
      }

      // Test small transcription
      try {
        const formData = new FormData();
        const fileName = recording.audio_url.split('/').pop() || 'audio.mp3';
        formData.append('file', new File([audioData], fileName, { type: 'audio/mpeg' }));
        formData.append('model', 'whisper-1');

        console.log('Testing transcription with OpenAI...');
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });

        console.log('Transcription response status:', transcriptionResponse.status);

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.error('Transcription failed:', errorText);
          
          return new Response(
            JSON.stringify({ 
              success: false,
              error: `Transcription failed: ${transcriptionResponse.status} - ${errorText}`,
              details: {
                recording_id: recordingId,
                audio_size: audioSize,
                file_name: fileName,
                openai_status: transcriptionResponse.status
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const transcriptionResult = await transcriptionResponse.json();
        console.log('Transcription successful:', transcriptionResult.text?.substring(0, 100) + '...');

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Audio debugging completed successfully',
            details: {
              recording_id: recordingId,
              audio_size: audioSize,
              file_name: fileName,
              transcription_preview: transcriptionResult.text?.substring(0, 200) + '...'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Transcription test error:', error);
        throw new Error(`Transcription test failed: ${error.message}`);
      }

    } catch (error) {
      console.error('Audio processing error:', error);
      throw new Error(`Audio processing failed: ${error.message}`);
    }

  } catch (error) {
    console.error('Debug function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});