import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, User, Plus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  started_at: string;
  last_message_at: string;
  persona_id: string;
  personas: {
    id: string;
    family_members: {
      name: string;
      photo_url: string;
    };
  };
}

interface FamilyMember {
  id: string;
  name: string;
  photo_url: string;
  personas: Array<{
    id: string;
    is_active: boolean;
    training_status: string;
  }>;
}

const Conversations = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch conversations - get one per persona (most recent)
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          started_at,
          last_message_at,
          persona_id,
          personas(
            id,
            family_members(name, photo_url)
          )
        `)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      } else {
        // Filter to get only one conversation per persona (most recent)
        const uniqueConversations = conversationsData?.reduce((acc: Conversation[], conv) => {
          const existingIndex = acc.findIndex(c => c.personas?.id === conv.personas?.id);
          if (existingIndex === -1) {
            acc.push(conv);
          } else if (new Date(conv.last_message_at) > new Date(acc[existingIndex].last_message_at)) {
            acc[existingIndex] = conv;
          }
          return acc;
        }, []) || [];
        
        setConversations(uniqueConversations);
      }

      // Fetch family members with active personas
      const { data: familyMembersData, error: familyMembersError } = await supabase
        .from('family_members')
        .select(`
          id,
          name,
          photo_url,
          personas(id, is_active, training_status)
        `)
        .eq('user_id', user.id);

      if (familyMembersError) {
        console.error('Error fetching family members:', familyMembersError);
      } else {
        setFamilyMembers(familyMembersData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getPersonaStatus = (member: FamilyMember) => {
    const activePersona = member.personas?.find(p => p.is_active);
    if (!activePersona) return 'no-persona';
    return activePersona.training_status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready to Chat</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Training...</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      case 'no-persona':
        return <Badge variant="outline">No AI Persona</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canStartConversation = (member: FamilyMember) => {
    const activePersona = member.personas?.find(p => p.is_active);
    return activePersona?.training_status === 'completed';
  };

  const startOrContinueConversation = async (familyMember: FamilyMember) => {
    const activePersona = familyMember.personas?.find(p => p.is_active);
    if (!activePersona) return;

    try {
      // Check if conversation already exists for this persona
      const existingConversation = conversations.find(c => c.personas?.id === activePersona.id);
      
      if (existingConversation) {
        // Continue existing conversation
        navigate(`/chat/${existingConversation.id}`);
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user?.id,
            persona_id: activePersona.id,
            title: `Chat with ${familyMember.name}`,
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/chat/${data.id}`);
      }
    } catch (error) {
      console.error('Error starting/continuing conversation:', error);
    }
  };

  const hasExistingConversation = (familyMember: FamilyMember) => {
    const activePersona = familyMember.personas?.find(p => p.is_active);
    if (!activePersona) return false;
    return conversations.some(c => c.personas?.id === activePersona.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-primary">Digital Storyteller</h1>
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

        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-primary">Digital Storyteller</h1>
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

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <MessageCircle className="h-6 w-6" />
              Conversations
            </h2>
            <p className="text-muted-foreground">
              Chat with your family members' AI personas or view previous conversations
            </p>
          </div>

          {/* Recent Conversations */}
          {conversations.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Conversations</h3>
              <div className="grid gap-4">
                {conversations.map((conversation) => (
                  <Card key={conversation.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/chat/${conversation.id}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {conversation.personas?.family_members?.photo_url ? (
                          <img
                            src={conversation.personas.family_members.photo_url}
                            alt={conversation.personas.family_members.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h4 className="font-semibold">{conversation.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            With {conversation.personas?.family_members?.name}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(conversation.last_message_at)}</span>
                          </div>
                          <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chat/${conversation.id}`);
                          }}>
                            Continue Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Start Conversation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Chat with Family Members</h3>
            
            {familyMembers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No family members yet</h4>
                  <p className="text-muted-foreground mb-4">
                    Add family members and record their stories to create AI personas.
                  </p>
                  <Button onClick={() => navigate('/family-members')}>
                    Add Family Members
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {familyMembers.map((member) => {
                  const status = getPersonaStatus(member);
                  const canChat = canStartConversation(member);
                  
                  return (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                              <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h4 className="font-semibold">{member.name}</h4>
                            <div className="mt-2">
                              {getStatusBadge(status)}
                            </div>
                          </div>
                          
                           <div>
                             {canChat ? (
                               <Button
                                 onClick={() => startOrContinueConversation(member)}
                               >
                                 {hasExistingConversation(member) ? (
                                   <>
                                     <MessageCircle className="h-4 w-4 mr-2" />
                                     Continue Chat
                                   </>
                                 ) : (
                                   <>
                                     <Plus className="h-4 w-4 mr-2" />
                                     Start Chat
                                   </>
                                 )}
                               </Button>
                            ) : status === 'no-persona' ? (
                              <Button
                                variant="outline"
                                onClick={() => navigate('/record')}
                              >
                                Record Stories First
                              </Button>
                            ) : (
                              <Button disabled>
                                Persona Not Ready
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Conversations;