import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AssemblyAIRealtimeChat } from '@/utils/AssemblyAIRealtimeChat';
import { supabase } from '@/integrations/supabase/client';

interface AssemblyAIVoiceInterfaceProps {
  conversationId: string;
  familyMemberName: string;
  onMessage?: (message: any) => void;
}

const AssemblyAIVoiceInterface: React.FC<AssemblyAIVoiceInterfaceProps> = ({ 
  conversationId, 
  familyMemberName,
  onMessage 
}) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const chatRef = useRef<AssemblyAIRealtimeChat | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);

  // Save message to database
  const saveMessage = async (content: string, isUserMessage: boolean) => {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          content: content.trim(),
          is_user_message: isUserMessage
        });

      if (error) {
        console.error('Error saving voice message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Generate AI response using the chat function
  const generateAIResponse = async (userTranscript: string) => {
    if (!userTranscript.trim()) return;

    setIsProcessingResponse(true);
    
    try {
      console.log('Generating AI response for:', userTranscript);
      
      const { data, error } = await supabase.functions.invoke('chat-with-persona', {
        body: {
          conversationId,
          message: userTranscript
        }
      });

      if (error) {
        console.error('Error generating AI response:', error);
        toast({
          title: "Response Error",
          description: "Failed to generate AI response",
          variant: "destructive",
        });
        return;
      }

      if (data?.response) {
        // Save AI response and trigger text-to-speech
        await saveMessage(data.response, false);
        
        // Generate speech for the AI response
        await generateSpeech(data.response);
        
        onMessage?.({
          type: 'ai_response',
          content: data.response
        });
      }
    } catch (error) {
      console.error('Error in AI response generation:', error);
    } finally {
      setIsProcessingResponse(false);
    }
  };

  // Generate speech from text
  const generateSpeech = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-speech', {
        body: {
          text,
          voice: 'sage' // or get from persona settings
        }
      });

      if (error) {
        console.error('Error generating speech:', error);
        return;
      }

      if (data?.audioContent) {
        // Play the audio
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play().catch(e => console.error('Error playing audio:', e));
      }
    } catch (error) {
      console.error('Error in speech generation:', error);
    }
  };

  const handleTranscript = (transcript: string, isFinal: boolean) => {
    console.log('Transcript received:', { transcript, isFinal });
    
    if (isFinal) {
      if (transcript.trim()) {
        // Add to final transcripts
        setFinalTranscripts(prev => [...prev, transcript]);
        
        // Save user message
        saveMessage(transcript, true);
        
        // Generate AI response
        generateAIResponse(transcript);
        
        onMessage?.({
          type: 'user_transcript',
          content: transcript
        });
      }
      
      // Clear current transcript
      setCurrentTranscript('');
    } else {
      // Update current partial transcript
      setCurrentTranscript(transcript);
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    setIsConnecting(false);
    
    if (connected) {
      toast({
        title: "Voice Connected",
        description: `You can now speak with ${familyMemberName}`,
      });
    }
  };

  const handleError = (error: string) => {
    console.error('AssemblyAI error:', error);
    toast({
      title: "Connection Error",
      description: error,
      variant: "destructive",
    });
  };

  const startVoiceChat = async () => {
    setIsConnecting(true);
    
    try {
      chatRef.current = new AssemblyAIRealtimeChat(
        handleTranscript,
        handleConnectionChange,
        handleError
      );
      
      await chatRef.current.init();
      
    } catch (error) {
      console.error('Error starting voice chat:', error);
      setIsConnecting(false);
      
      toast({
        title: "Connection Failed",
        description: error instanceof Error 
          ? error.message 
          : 'Failed to start voice conversation. Please check your microphone permissions.',
        variant: "destructive",
      });
    }
  };

  const endVoiceChat = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsRecording(true);
    setCurrentTranscript('');
    setFinalTranscripts([]);
    
    toast({
      title: "Voice Disconnected",
      description: "Voice conversation ended",
    });
  };

  const toggleRecording = () => {
    if (!chatRef.current) return;
    
    if (isRecording) {
      chatRef.current.stopRecording();
      setIsRecording(false);
      toast({
        title: "Recording Paused",
        description: "Microphone is now muted",
      });
    } else {
      chatRef.current.startRecordingManual();
      setIsRecording(true);
      toast({
        title: "Recording Resumed",
        description: "Microphone is now active",
      });
    }
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Voice Conversation (AssemblyAI)</h3>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2">
            {isConnecting && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Connecting...</span>
              </>
            )}
            
            {isConnected && !isProcessingResponse && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">
                  {isRecording ? 'Listening...' : 'Recording paused'}
                </span>
              </div>
            )}
            
            {isProcessingResponse && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{familyMemberName} is thinking...</span>
              </div>
            )}
          </div>

          {/* Live Transcript */}
          {(currentTranscript || finalTranscripts.length > 0) && (
            <div className="bg-muted p-3 rounded-lg text-sm text-left space-y-2 max-h-40 overflow-y-auto">
              {finalTranscripts.map((transcript, index) => (
                <div key={index} className="border-b border-border pb-1 mb-1">
                  <span className="font-medium text-blue-600">You: </span>
                  {transcript}
                </div>
              ))}
              {currentTranscript && (
                <div className="opacity-70">
                  <span className="font-medium text-blue-600">You: </span>
                  {currentTranscript}
                  <span className="animate-pulse">|</span>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!isConnected ? (
              <Button 
                onClick={startVoiceChat}
                disabled={isConnecting}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                Start Voice Chat
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleRecording}
                  variant={isRecording ? "outline" : "destructive"}
                  size="sm"
                  className="gap-2"
                >
                  {isRecording ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {isRecording ? 'Pause' : 'Resume'}
                </Button>
                
                <Button
                  onClick={endVoiceChat}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  End Chat
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center">
            {!isConnected ? (
              <p>Click "Start Voice Chat" to begin speaking with {familyMemberName}</p>
            ) : (
              <p>Speak naturally - your words will be transcribed and {familyMemberName} will respond with voice</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssemblyAIVoiceInterface;