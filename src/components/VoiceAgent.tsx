import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceAgentProps {
  conversationId: string;
  familyMemberName: string;
  onMessage?: (message: any) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  conversationId,
  familyMemberName,
  onMessage
}) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);

  // Initialize ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to voice agent');
      setIsConnecting(false);
      setConversationStarted(true);
      toast({
        title: "Voice chat connected",
        description: `You can now talk with ${familyMemberName}`,
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from voice agent');
      setIsConnecting(false);
      setConversationStarted(false);
    },
    onMessage: (message) => {
      console.log('Received message:', message);
      // Update transcript with user input and AI responses
      if (message.source === 'user') {
        setTranscript(prev => prev + `You: ${message.message}\n`);
        // Save user message to database
        saveMessage(message.message, true);
      } else if (message.source === 'ai') {
        setTranscript(prev => prev + `${familyMemberName}: ${message.message}\n`);
        // Save AI response to database
        saveMessage(message.message, false);
        // Notify parent component
        onMessage?.(message);
      }
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      toast({
        title: "Voice chat error",
        description: typeof error === 'string' ? error : 'An error occurred during voice chat',
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  });

  // Save message to database
  const saveMessage = async (content: string, isUserMessage: boolean) => {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          content,
          is_user_message: isUserMessage,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Get voice agent configuration and create dynamic agent
  const getAgentConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-voice-agent-url', {
        body: { conversationId }
      });

      if (error) {
        throw error;
      }

      setAgentConfig(data.agentConfig);
      return data.agentConfig;
    } catch (error) {
      console.error('Error getting agent config:', error);
      toast({
        title: "Configuration error", 
        description: "Failed to get voice agent configuration",
        variant: "destructive",
      });
      return null;
    }
  };

  // Create or get ElevenLabs agent for the family member
  const getOrCreateAgent = async (config: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-or-create-elevenlabs-agent', {
        body: { 
          conversationId,
          voiceModelId: config.voiceModelId,
          systemPrompt: config.systemPrompt,
          familyMemberName
        }
      });

      if (error) {
        throw error;
      }

      return data.agentId;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: "Agent creation error",
        description: "Failed to create voice agent",
        variant: "destructive",
      });
      return null;
    }
  };

  // Start voice conversation
  const startVoiceChat = async () => {
    setIsConnecting(true);
    setTranscript('');

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get agent configuration
      const config = await getAgentConfig();
      if (!config) {
        setIsConnecting(false);
        return;
      }

      // Check if we have a voice model for this family member
      if (!config.voiceModelId) {
        toast({
          title: "Voice not ready",
          description: `Please clone ${familyMemberName}'s voice first to enable voice chat.`,
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      // Create or get ElevenLabs agent dynamically
      const agentId = await getOrCreateAgent(config);
      if (!agentId) {
        setIsConnecting(false);
        return;
      }

      // Get signed URL for the agent
      const { data: signedUrlData, error: urlError } = await supabase.functions.invoke('get-elevenlabs-signed-url', {
        body: { agentId }
      });

      if (urlError || !signedUrlData?.signedUrl) {
        toast({
          title: "Connection error",
          description: "Failed to get voice chat connection",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      // Start actual ElevenLabs conversation
      await conversation.startSession({ 
        agentId,
        overrides: {
          agent: {
            prompt: { prompt: config.systemPrompt },
            firstMessage: `Hello! It's so wonderful to talk with you again.`
          }
        }
      });

    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast({
        title: "Microphone access required",
        description: "Please allow microphone access to use voice chat",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  // End voice conversation
  const endVoiceChat = async () => {
    try {
      await conversation.endSession();
      setTranscript('');
      setIsMuted(false);
      setConversationStarted(false);
    } catch (error) {
      console.error('Error ending voice chat:', error);
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual mute functionality with ElevenLabs
    // You would typically call conversation.setVolume({ volume: isMuted ? 1 : 0 });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversation.endSession().catch(console.error);
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Chat with {familyMemberName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnecting && (
              <div className="flex items-center gap-2 text-yellow-600">
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
                Connecting...
              </div>
            )}
            {conversationStarted && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                Connected
              </div>
            )}
            {conversation.isSpeaking && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                {familyMemberName} is speaking...
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!conversationStarted ? (
            <Button
              onClick={startVoiceChat}
              disabled={isConnecting}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
            </Button>
          ) : (
            <>
              <Button
                onClick={endVoiceChat}
                variant="destructive"
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Chat
              </Button>
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="space-y-2">
            <h4 className="font-medium">Live Conversation</h4>
            <div className="bg-muted p-3 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {transcript || 'Conversation will appear here...'}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!conversationStarted && !isConnecting && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Click "Start Voice Chat" to begin a voice conversation with {familyMemberName}.</p>
            <p>Make sure your microphone is working and you're in a quiet environment.</p>
            {!agentConfig?.voiceModelId && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-800 mb-2">Voice Clone Required:</p>
                <p className="text-amber-700 text-xs">
                  To enable voice chat, you need to clone {familyMemberName}'s voice first. 
                  Go to the Family Members page and use the Voice Clone Manager to upload audio samples.
                </p>
              </div>
            )}
          </div>
        )}

        {conversationStarted && (
          <div className="text-sm text-muted-foreground">
            <p>You're now connected! Start speaking naturally to {familyMemberName}.</p>
            <p className="mt-1">The conversation will be saved to your chat history.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};