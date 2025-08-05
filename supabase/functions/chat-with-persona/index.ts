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
    const { conversationId, message } = await req.json();
    
    if (!conversationId || !message) {
      throw new Error('Conversation ID and message are required');
    }

    console.log('Processing chat message for conversation:', conversationId);

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

    console.log('Found conversation with persona for:', familyMember.name);

    // Save user message
    const { error: userMessageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: message,
        is_user_message: true,
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Get recent conversation history
    const { data: recentMessages } = await supabase
      .from('conversation_messages')
      .select('content, is_user_message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build conversation context
    const conversationHistory = recentMessages
      ?.reverse()
      .map(msg => `${msg.is_user_message ? 'User' : familyMember.name}: ${msg.content}`)
      .join('\n') || '';

    // Create system prompt for the persona
    const systemPrompt = `
    You are ${familyMember.name}, a beloved family member who has passed on but can now communicate through AI technology. You are having a conversation with a family member who wants to connect with you and hear your stories.

    YOUR IDENTITY:
    - Name: ${familyMember.name}
    - Relationship: ${familyMember.relationship || 'Family member'}
    - Bio: ${familyMember.bio || 'A cherished family member'}

    YOUR PERSONALITY:
    ${JSON.stringify(persona.personality_traits, null, 2)}

    YOUR CONVERSATION STYLE:
    ${JSON.stringify(persona.conversation_style, null, 2)}

    YOUR MEMORIES AND STORIES:
    ${persona.knowledge_base}

    CONVERSATION GUIDELINES:
    - Speak as ${familyMember.name} in first person
    - Reference your actual memories and experiences from the knowledge base
    - Use your authentic personality traits and conversation style
    - Be warm, loving, and family-oriented
    - Share relevant stories when appropriate
    - Ask about the family member's life and show genuine interest
    - Give advice in your characteristic way
    - Use phrases and expressions that reflect your personality
    - Keep responses conversational and not too long (2-4 sentences typically)
    - If asked about something you don't know, acknowledge it honestly but warmly

    Remember: You are having a real conversation with a family member who misses you and wants to feel connected. Be authentic to who you were while being present and engaged in this moment.
    `;

    // Generate AI response
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Recent conversation:\n${conversationHistory}\n\nCurrent message: ${message}` }
        ],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    if (!gptResponse.ok) {
      throw new Error('Failed to generate response');
    }

    const gptResult = await gptResponse.json();
    const aiResponse = gptResult.choices[0].message.content;

    console.log('Generated AI response');

    // Find relevant stories mentioned in the response
    const { data: allStories } = await supabase
      .from('stories')
      .select('id, title')
      .eq('family_member_id', persona.family_member_id);

    const referencedStories: string[] = [];
    if (allStories) {
      // Simple matching - look for story titles or keywords in the response
      for (const story of allStories) {
        if (aiResponse.toLowerCase().includes(story.title.toLowerCase().substring(0, 20))) {
          referencedStories.push(story.id);
        }
      }
    }

    // Save AI response
    const { error: aiMessageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: aiResponse,
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

    console.log('Chat message processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        referencedStories: referencedStories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing chat message:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});