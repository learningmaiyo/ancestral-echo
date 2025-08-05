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

  // Get voice agent configuration
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

      // For now, we'll simulate the connection since we need ElevenLabs agent IDs
      // In production, you would use the actual agent ID and signed URL
      console.log('Starting voice chat with config:', config);
      
      // Simulate connection for demo
      setTimeout(() => {
        setIsConnecting(false);
        setConversationStarted(true);
        setTranscript(`Connected to ${familyMemberName}. Start speaking...\n`);
        toast({
          title: "Voice chat ready",
          description: `You can now talk with ${familyMemberName}. This is a demo mode - full ElevenLabs integration requires agent setup.`,
        });
      }, 1000);

      // TODO: Replace with actual ElevenLabs agent connection
      // const agentId = 'your-elevenlabs-agent-id'; // Get this from ElevenLabs dashboard
      // await conversation.startSession({ 
      //   agentId,
      //   overrides: {
      //     agent: {
      //       prompt: { prompt: config.systemPrompt },
      //       firstMessage: `Hello! It's so wonderful to talk with you again.`
      //     },
      //     tts: { voiceId: config.voiceId }
      //   }
      // });

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
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-amber-800 mb-2">Setup Required:</p>
              <p className="text-amber-700 text-xs">
                To enable full ElevenLabs Conversational AI, you need to:
              </p>
              <ol className="text-amber-700 text-xs mt-1 ml-4 list-decimal space-y-1">
                <li>Create a Conversational AI agent in your ElevenLabs dashboard</li>
                <li>Configure the agent with the persona's voice and personality</li>
                <li>Get the agent ID and update the code</li>
                <li>Uncomment the actual ElevenLabs integration code</li>
              </ol>
            </div>
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