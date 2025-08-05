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

    console.log('Retrying processing for recording:', recordingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reset recording status to pending
    const { error: updateError } = await supabase
      .from('recordings')
      .update({ processing_status: 'pending' })
      .eq('id', recordingId);

    if (updateError) {
      throw new Error(`Failed to reset recording status: ${updateError.message}`);
    }

    // Call the process-recording function
    const { data, error } = await supabase.functions.invoke('process-recording', {
      body: { recordingId }
    });

    if (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }

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