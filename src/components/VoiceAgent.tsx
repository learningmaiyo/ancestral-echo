import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [isLoading, setIsLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate speech using TTS
  const generateSpeech = async (text: string) => {
    try {
      setIsPlaying(true);
      const { data, error } = await supabase.functions.invoke('generate-speech', {
        body: { 
          text, 
          personaId: agentConfig?.conversationId 
        }
      });

      if (error) throw error;

      // Play the audio
      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: "Speech error",
        description: "Failed to generate speech",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
    }
  };

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

  // Send message and get TTS response
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Add user message to transcript
      setTranscript(prev => prev + `You: ${userMessage}\n`);
      await saveMessage(userMessage, true);

      // Get agent config if not already loaded
      if (!agentConfig) {
        const config = await getAgentConfig();
        if (!config) return;
      }

      // Simulate AI response (in real implementation, this would call a chat API)
      const aiResponse = `Thank you for sharing that with me. As ${familyMemberName}, I appreciate you taking the time to talk with me.`;
      
      // Add AI response to transcript
      setTranscript(prev => prev + `${familyMemberName}: ${aiResponse}\n`);
      await saveMessage(aiResponse, false);
      
      // Generate and play speech
      await generateSpeech(aiResponse);
      
      onMessage?.({ message: aiResponse, source: 'ai' });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chat
  const initializeChat = async () => {
    setIsLoading(true);
    try {
      const config = await getAgentConfig();
      if (config) {
        setTranscript(`Voice chat with ${familyMemberName} is ready. Type a message to start...\n`);
        toast({
          title: "Chat ready",
          description: `You can now chat with ${familyMemberName}`,
        });
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeChat();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Chat with {familyMemberName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Processing...
            </div>
          )}
          {isPlaying && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              {familyMemberName} is speaking...
            </div>
          )}
          {!isLoading && !isPlaying && agentConfig && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              Ready
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder={`Type a message to ${familyMemberName}...`}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!currentMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation Transcript */}
        {transcript && (
          <div className="space-y-2">
            <h4 className="font-medium">Conversation</h4>
            <div className="bg-muted p-3 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {transcript || 'Conversation will appear here...'}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!agentConfig && !isLoading && (
          <div className="text-sm text-muted-foreground">
            <p>Setting up voice chat with {familyMemberName}...</p>
          </div>
        )}

        {agentConfig && !transcript && (
          <div className="text-sm text-muted-foreground">
            <p>Type a message above to start chatting with {familyMemberName}.</p>
            <p className="mt-1">Messages will be spoken aloud using their voice.</p>
          </div>
        )}

        {/* Hidden audio element for playing TTS */}
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      </CardContent>
    </Card>
  );
};