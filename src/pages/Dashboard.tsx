import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mic, MessageCircle, BookOpen, TreePine, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    familyMembers: 0,
    recordings: 0,
    stories: 0,
    personas: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        const [familyMembersResponse, recordingsResponse, storiesResponse, personasResponse] = await Promise.all([
          supabase.from('family_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('recordings').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('stories').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('personas').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        ]);

        setStats({
          familyMembers: familyMembersResponse.count || 0,
          recordings: recordingsResponse.count || 0,
          stories: storiesResponse.count || 0,
          personas: personasResponse.count || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Digital Storyteller</h1>
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Family Stories Dashboard</h2>
          <p className="text-muted-foreground">
            Preserve memories, create digital personas, and keep family conversations alive.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                Family Tree
              </CardTitle>
              <CardDescription>
                Visualize your family relationships in an interactive tree
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                onClick={() => navigate('/family-tree')}
              >
                View Family Tree
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Family Members
              </CardTitle>
              <CardDescription>
                Manage your family members and their information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                onClick={() => navigate('/family-members')}
              >
                View Family Members
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-destructive" />
                Record Stories
              </CardTitle>
              <CardDescription>
                Capture and preserve family stories and memories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={() => navigate('/record')}
                >
                  Desktop Recording
                </Button>
                <Button 
                  className="w-full gap-2" 
                  variant="outline"
                  onClick={() => navigate('/mobile-record')}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile Recording
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Stories
              </CardTitle>
              <CardDescription>
                Browse and search through preserved family stories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate('/stories')}
              >
                View Stories
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-secondary" />
                AI Conversations
              </CardTitle>
              <CardDescription>
                Chat with AI personas of your family members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={() => navigate('/conversations')}
              >
                Start Conversation
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.familyMembers}</div>
                  <div className="text-sm text-muted-foreground">Family Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.recordings}</div>
                  <div className="text-sm text-muted-foreground">Recordings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.stories}</div>
                  <div className="text-sm text-muted-foreground">Stories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.personas}</div>
                  <div className="text-sm text-muted-foreground">Personas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;