import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, BookOpen, Clock, User, Filter, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Story {
  id: string;
  title: string;
  content: string;
  category: string;
  emotional_tone: string;
  keywords: string[];
  themes: string[];
  created_at: string;
  family_members: {
    name: string;
    photo_url: string;
  };
}

const Stories = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stuckRecordings, setStuckRecordings] = useState<any[]>([]);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchStories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          title,
          content,
          category,
          emotional_tone,
          keywords,
          themes,
          created_at,
          family_members(name, photo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
        return;
      }

      setStories(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStuckRecordings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          audio_url,
          processing_status,
          context,
          created_at,
          family_members(name)
        `)
        .eq('user_id', user.id)
        .in('processing_status', ['processing', 'failed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stuck recordings:', error);
        return;
      }

      setStuckRecordings(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const retryRecording = async (recordingId: string) => {
    setRetryLoading(recordingId);
    try {
      const { data, error } = await supabase.functions.invoke('retry-recording-processing', {
        body: { recordingId }
      });

      if (error) {
        throw error;
      }

      toast.success('Recording processing restarted successfully!');
      
      // Refresh both stuck recordings and stories
      await checkStuckRecordings();
      await fetchStories();
    } catch (error: any) {
      console.error('Error retrying recording:', error);
      toast.error('Failed to retry processing: ' + error.message);
    } finally {
      setRetryLoading(null);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    setDeleteLoading(recordingId);
    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) {
        throw error;
      }

      toast.success('Recording deleted successfully!');
      
      // Refresh stuck recordings and stories
      await checkStuckRecordings();
      await fetchStories();
    } catch (error: any) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording: ' + error.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    fetchStories();
    checkStuckRecordings();
  }, [user]);

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         story.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || story.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(stories.map(story => story.category).filter(Boolean)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      happy: 'bg-green-100 text-green-800',
      sad: 'bg-blue-100 text-blue-800',
      nostalgic: 'bg-purple-100 text-purple-800',
      funny: 'bg-yellow-100 text-yellow-800',
      serious: 'bg-gray-100 text-gray-800',
    };
    return colors[tone] || 'bg-gray-100 text-gray-800';
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
                    <div className="h-3 bg-muted rounded w-2/3"></div>
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Family Stories
              </h2>
              <p className="text-muted-foreground">
                Explore and search through your family's preserved stories
              </p>
            </div>
          </div>

          {/* Stuck Recordings Alert */}
          {stuckRecordings.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Recordings Need Processing
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {stuckRecordings.length} recording(s) failed to process or are stuck. Click retry to process them again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stuckRecordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {recording.context || 'Recording'} - {recording.family_members?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Status: {recording.processing_status} • {formatDate(recording.created_at)}
                      </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => retryRecording(recording.id)}
                         disabled={retryLoading === recording.id || deleteLoading === recording.id}
                       >
                         {retryLoading === recording.id ? (
                           <RefreshCw className="h-4 w-4 animate-spin" />
                         ) : (
                           <>
                             <RefreshCw className="h-4 w-4 mr-1" />
                             Retry
                           </>
                         )}
                       </Button>
                       <Button
                         size="sm"
                         variant="destructive"
                         onClick={() => deleteRecording(recording.id)}
                         disabled={retryLoading === recording.id || deleteLoading === recording.id}
                       >
                         {deleteLoading === recording.id ? (
                           <RefreshCw className="h-4 w-4 animate-spin" />
                         ) : (
                           <>
                             <Trash2 className="h-4 w-4 mr-1" />
                             Delete
                           </>
                         )}
                       </Button>
                     </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stories, keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stories Grid */}
          {filteredStories.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {stories.length === 0 ? 'No stories yet' : 'No stories match your search'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {stories.length === 0 
                    ? 'Start recording family stories to see them here.'
                    : 'Try adjusting your search terms or filters.'
                  }
                </p>
                {stories.length === 0 && (
                  <Button onClick={() => navigate('/record')}>
                    Start Recording Stories
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredStories.map((story) => (
                <Card key={story.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{story.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          {story.family_members && (
                            <div className="flex items-center gap-2">
                              {story.family_members.photo_url ? (
                                <img
                                  src={story.family_members.photo_url}
                                  alt={story.family_members.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                              <span>{story.family_members.name}</span>
                            </div>
                          )}
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(story.created_at)}</span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {story.category && (
                          <Badge variant="outline">
                            {story.category.charAt(0).toUpperCase() + story.category.slice(1)}
                          </Badge>
                        )}
                        {story.emotional_tone && (
                          <Badge className={getToneColor(story.emotional_tone)}>
                            {story.emotional_tone.charAt(0).toUpperCase() + story.emotional_tone.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {story.content}
                    </p>
                    
                    {/* Keywords and Themes */}
                    {(story.keywords?.length > 0 || story.themes?.length > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {story.keywords?.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {story.themes?.slice(0, 2).map((theme) => (
                          <Badge key={theme} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                        {(story.keywords?.length > 3 || story.themes?.length > 2) && (
                          <Badge variant="secondary" className="text-xs">
                            +{(story.keywords?.length || 0) + (story.themes?.length || 0) - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Stories;