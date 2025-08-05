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

  let recordingId: string;
  
  try {
    const body = await req.json();
    recordingId = body.recordingId;
    
    if (!recordingId) {
      throw new Error('Recording ID is required');
    }

    console.log('Processing recording:', recordingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select(`
        *,
        family_members (
          id,
          name,
          bio,
          relationship
        )
      `)
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found');
    }

    console.log('Found recording:', recording.id);

    // Update status to processing
    await supabase
      .from('recordings')
      .update({ processing_status: 'processing' })
      .eq('id', recordingId);

    // Step 1: Transcribe audio using AssemblyAI
    console.log('Starting transcription...');
    
    // Validate AssemblyAI API key
    const assemblyAIApiKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIApiKey) {
      throw new Error('AssemblyAI API key not configured');
    }
    
    // Download and validate audio file
    let transcriptionResponse;
    
    try {
      // Extract the file path from the full URL
      const urlPath = new URL(recording.audio_url).pathname;
      const filePath = urlPath.split('/storage/v1/object/public/recordings/')[1];
      
      console.log('Downloading audio file:', filePath);
      
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('recordings')
        .download(filePath);

      if (downloadError || !audioData) {
        console.error('Download error:', downloadError);
        throw new Error(`Failed to download audio file: ${downloadError?.message || 'No data received'}`);
      }

      // Validate audio file
      const audioSize = audioData.size;
      console.log('Audio file size:', audioSize, 'bytes');
      
      if (audioSize === 0) {
        throw new Error('Audio file is empty');
      }
      
      // No size limit check needed for AssemblyAI (it handles large files well)
      
      console.log('Uploading audio to AssemblyAI...');
      
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
        console.error('AssemblyAI upload error:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload audio to AssemblyAI (${uploadResponse.status}): ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Audio uploaded to AssemblyAI:', uploadResult.upload_url);

      // Submit transcription request
      console.log('Sending transcription request to AssemblyAI...');
      
      transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
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

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('AssemblyAI transcription request error:', transcriptionResponse.status, errorText);
        throw new Error(`Failed to request transcription from AssemblyAI (${transcriptionResponse.status}): ${errorText}`);
      }
      
    } catch (error) {
      console.error('Audio transcription failed:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }

    let transcriptionResult = await transcriptionResponse.json();
    console.log('Transcription request submitted, ID:', transcriptionResult.id);

    // Poll for completion
    while (transcriptionResult.status !== 'completed' && transcriptionResult.status !== 'error') {
      console.log('Polling transcription status:', transcriptionResult.status);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionResult.id}`, {
        headers: {
          'authorization': assemblyAIApiKey,
        },
      });

      if (pollResponse.ok) {
        transcriptionResult = await pollResponse.json();
      } else {
        throw new Error('Failed to poll transcription status');
      }
    }

    if (transcriptionResult.status === 'error') {
      console.error('AssemblyAI transcription error:', transcriptionResult.error);
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    }

    const transcription = transcriptionResult.text;
    console.log('Transcription completed successfully');

    // Update recording with transcription
    await supabase
      .from('recordings')
      .update({ transcription })
      .eq('id', recordingId);

    // Step 2: Process transcription into stories using GPT
    console.log('Processing stories...');
    
    const storyPrompt = `
    You are an AI family historian. Analyze this family recording transcription and extract meaningful stories. 

    Family Member: ${recording.family_members.name}
    Relationship: ${recording.family_members.relationship || 'Unknown'}
    Context: ${recording.context || 'General conversation'}
    Bio: ${recording.family_members.bio || 'No bio available'}

    Transcription:
    "${transcription}"

    Please extract and format distinct stories from this transcription. For each story, provide:
    1. A clear, descriptive title
    2. The full story content (clean, readable prose)
    3. Category (childhood, family_traditions, career, love_story, wisdom, funny_moment, historical, other)
    4. Emotional tone (happy, sad, nostalgic, funny, serious, proud, grateful, other)
    5. Keywords (3-7 relevant keywords)
    6. Themes (2-4 main themes)

    Return ONLY a valid JSON array with this structure:
    [
      {
        "title": "Story title",
        "content": "Full story content in readable prose",
        "category": "category_name",
        "emotional_tone": "tone",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "themes": ["theme1", "theme2"]
      }
    ]

    If no clear stories can be extracted, return an empty array [].
    `;

    // Get OpenAI API key for story processing
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured - skipping story processing');
      // Update recording status to completed without story processing
      await supabase
        .from('recordings')
        .update({ processing_status: 'completed' })
        .eq('id', recordingId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Recording transcribed successfully (story processing skipped)',
          transcription: transcription 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a family historian AI that extracts and formats family stories. Always return valid JSON.' },
          { role: 'user', content: storyPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('GPT story processing error:', gptResponse.status, errorText);
      throw new Error(`Failed to process stories with GPT (${gptResponse.status}): ${errorText}`);
    }

    const gptResult = await gptResponse.json();
    let stories;
    
    try {
      stories = JSON.parse(gptResult.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse GPT response as JSON:', gptResult.choices[0].message.content);
      stories = [];
    }

    console.log('Extracted stories:', stories.length);

    // Step 3: Save stories to database
    const storyInserts = stories.map((story: any) => ({
      user_id: recording.user_id,
      family_member_id: recording.family_member_id,
      recording_id: recording.id,
      title: story.title,
      content: story.content,
      category: story.category,
      emotional_tone: story.emotional_tone,
      keywords: story.keywords,
      themes: story.themes,
    }));

    if (storyInserts.length > 0) {
      const { error: storiesError } = await supabase
        .from('stories')
        .insert(storyInserts);

      if (storiesError) {
        console.error('Error inserting stories:', storiesError);
      }
    }

    // Step 4: Update or create persona
    console.log('Updating persona...');
    
    // Get all stories for this family member to build knowledge base
    const { data: allStories } = await supabase
      .from('stories')
      .select('title, content, emotional_tone, themes, keywords')
      .eq('family_member_id', recording.family_member_id);

    if (allStories && allStories.length > 0) {
      // Build knowledge base from all stories
      const knowledgeBase = allStories.map(s => 
        `Title: ${s.title}\nContent: ${s.content}\nTone: ${s.emotional_tone}\nThemes: ${s.themes?.join(', ')}`
      ).join('\n\n---\n\n');

      // Extract personality traits and conversation style
      const personalityPrompt = `
      Based on these family stories about ${recording.family_members.name}, create a personality profile and conversation style.
      
      Stories:
      ${knowledgeBase}

      Return ONLY valid JSON with this structure:
      {
        "personality_traits": {
          "speaking_style": "description of how they speak",
          "values": ["core values they demonstrate"],
          "interests": ["main interests and passions"],
          "characteristics": ["personality characteristics"],
          "life_philosophy": "their approach to life"
        },
        "conversation_style": {
          "greeting_style": "how they typically greet people",
          "storytelling_approach": "how they tell stories",
          "humor_style": "their sense of humor",
          "advice_giving": "how they give advice",
          "emotional_expression": "how they express emotions"
        }
      }
      `;

      const personalityResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an AI that analyzes family stories to create personality profiles. Always return valid JSON.' },
            { role: 'user', content: personalityPrompt }
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });

      let personalityData = {
        personality_traits: {},
        conversation_style: {}
      };

      if (personalityResponse.ok) {
        const personalityResult = await personalityResponse.json();
        try {
          personalityData = JSON.parse(personalityResult.choices[0].message.content);
        } catch (e) {
          console.error('Failed to parse personality response as JSON:', e);
          console.error('Raw response:', personalityResult.choices[0].message.content);
        }
      } else {
        const errorText = await personalityResponse.text();
        console.error('Personality generation error:', personalityResponse.status, errorText);
      }

      // Check if persona exists
      const { data: existingPersona } = await supabase
        .from('personas')
        .select('id')
        .eq('family_member_id', recording.family_member_id)
        .eq('user_id', recording.user_id)
        .single();

      if (existingPersona) {
        // Update existing persona
        await supabase
          .from('personas')
          .update({
            knowledge_base: knowledgeBase,
            personality_traits: personalityData.personality_traits,
            conversation_style: personalityData.conversation_style,
            training_status: 'completed',
            is_active: true,
          })
          .eq('id', existingPersona.id);
      } else {
        // Create new persona
        await supabase
          .from('personas')
          .insert({
            user_id: recording.user_id,
            family_member_id: recording.family_member_id,
            knowledge_base: knowledgeBase,
            personality_traits: personalityData.personality_traits,
            conversation_style: personalityData.conversation_style,
            training_status: 'completed',
            is_active: true,
          });
      }

      console.log('Persona updated successfully');
    }

    // Update recording status to completed
    await supabase
      .from('recordings')
      .update({ processing_status: 'completed' })
      .eq('id', recordingId);

    console.log('Processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recording processed successfully',
        storiesCount: stories.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing recording:', error);
    
    // Update recording status to failed if recordingId is available
    if (recordingId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('recordings')
          .update({ processing_status: 'failed' })
          .eq('id', recordingId);
      } catch (e) {
        console.error('Failed to update recording status to failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});