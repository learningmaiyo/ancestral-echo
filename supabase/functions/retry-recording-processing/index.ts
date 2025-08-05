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
    const body = await req.json();
    const { recordingId } = body;
    
    if (!recordingId) {
      console.error('Missing recordingId in request body:', body);
      throw new Error('Recording ID is required');
    }

    console.log('Retrying processing for recording:', recordingId);
    
    // Validate recordingId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recordingId)) {
      throw new Error('Invalid recording ID format');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify recording exists before processing
    console.log('Verifying recording exists...');
    const { data: existingRecording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, processing_status, audio_url')
      .eq('id', recordingId)
      .single();

    if (fetchError || !existingRecording) {
      console.error('Recording not found:', fetchError);
      throw new Error(`Recording not found: ${recordingId}`);
    }

    console.log('Recording status before retry:', existingRecording.processing_status);

    // Reset recording status to pending
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ processing_status: 'pending' })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Failed to update recording status:', updateError);
      throw new Error(`Failed to reset recording status: ${updateError.message}`);
    }

    // Call the process-recording function
    console.log('Calling process-recording function...');
    
    const { data, error } = await supabase.functions.invoke('process-recording', {
      body: { recordingId }
    });

    if (error) {
      console.error('Process-recording function error:', error);
      throw new Error(`Processing failed: ${error.message || 'Unknown error from process-recording function'}`);
    }

    console.log('Process-recording function response:', data);

    console.log('Processing retried successfully for recording:', recordingId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recording processing retried successfully',
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error retrying recording processing:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});