import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, User, Loader2, Heart, MessageCircle, Mic } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import VoiceInterface from '@/components/VoiceInterface';

interface Message {
  id: string;
  content: string;
  is_user_message: boolean;
  created_at: string;
  referenced_stories?: string[];
}

interface Conversation {
  id: string;
  title: string;
  personas: {
    family_members: {
      name: string;
      photo_url: string;
    };
  };
}

const Chat = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    fetchConversation();
    fetchMessages();
    
    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('conversation-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const fetchConversation = async () => {
    if (!user || !conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          personas(
            family_members(name, photo_url)
          )
        `)
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        navigate('/conversations');
        return;
      }

      setConversation(data);
    } catch (error) {
      console.error('Error:', error);
      navigate('/conversations');
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversationId) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Add user message optimistically
      const optimisticMessage: Message = {
        id: 'temp-' + Date.now(),
        content: messageText,
        is_user_message: true,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Send to backend
      const { data, error } = await supabase.functions.invoke('chat-with-persona', {
        body: {
          conversationId,
          message: messageText
        }
      });

      if (error) {
        throw error;
      }

      // Remove optimistic message and let realtime handle the actual messages
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleVoiceMessage = (event: any) => {
    // Handle voice events and convert them to text messages for display
    if (event.type === 'response.audio_transcript.done') {
      const aiMessage: Message = {
        id: 'voice-' + Date.now(),
        content: event.transcript || 'Voice response',
        is_user_message: false,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Conversation not found</h2>
          <Button onClick={() => navigate('/conversations')}>
            Back to Conversations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/conversations')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Conversations
            </Button>
            <div className="flex items-center gap-3">
              {conversation.personas.family_members.photo_url ? (
                <img
                  src={conversation.personas.family_members.photo_url}
                  alt={conversation.personas.family_members.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div>
                <h1 className="font-semibold">{conversation.title}</h1>
                <p className="text-xs text-muted-foreground">
                  AI Persona of {conversation.personas.family_members.name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <Tabs defaultValue="text" className="flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="text" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Text Chat
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Mic className="h-4 w-4" />
              Voice Chat
            </TabsTrigger>
          </TabsList>

          {/* Text Chat Tab */}
          <TabsContent value="text" className="flex-1 flex flex-col space-y-6">
            {/* Messages */}
            <div className="flex-1 space-y-4 max-w-4xl mx-auto w-full">
              {messages.length === 0 ? (
                <Card className="p-8 text-center">
                  <CardContent>
                    <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Start a conversation with {conversation.personas.family_members.name}
                    </h3>
                    <p className="text-muted-foreground">
                      Ask about their memories, get advice, or just have a chat. They're here to connect with you.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_user_message ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.is_user_message
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-2 ${
                        message.is_user_message 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {conversation.personas.family_members.name} is typing...
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="max-w-4xl mx-auto w-full">
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${conversation.personas.family_members.name}...`}
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || sending}
                      size="sm"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Voice Chat Tab */}
          <TabsContent value="voice" className="flex-1 flex flex-col items-center justify-center">
            <div className="max-w-md w-full">
              <VoiceInterface
                conversationId={conversationId!}
                familyMemberName={conversation.personas.family_members.name}
                onMessage={handleVoiceMessage}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Chat;