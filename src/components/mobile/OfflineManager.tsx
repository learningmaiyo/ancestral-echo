import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Upload, 
  Download, 
  RefreshCw, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OfflineRecording {
  id: string;
  blobUrl: string;
  timestamp: number;
  familyMemberId?: string;
  duration: number;
  synced?: boolean;
}

const OfflineManager: React.FC = () => {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRecordings, setOfflineRecordings] = useState<OfflineRecording[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Checking for offline recordings to sync...",
      });
      loadOfflineRecordings();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Gone Offline",
        description: "Don't worry - recordings will be saved locally",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadOfflineRecordings();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineRecordings = () => {
    try {
      const stored = localStorage.getItem('offlineRecordings');
      if (stored) {
        const recordings = JSON.parse(stored);
        setOfflineRecordings(recordings.filter((r: OfflineRecording) => !r.synced));
      }
    } catch (error) {
      console.error('Error loading offline recordings:', error);
    }
  };

  const syncOfflineRecordings = async () => {
    if (!isOnline || offlineRecordings.length === 0) return;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const total = offlineRecordings.length;
      
      for (let i = 0; i < offlineRecordings.length; i++) {
        const recording = offlineRecordings[i];
        
        try {
          // Convert blob URL back to blob
          const response = await fetch(recording.blobUrl);
          const blob = await response.blob();
          
          // Upload to Supabase Storage
          const fileName = `offline-recording-${recording.timestamp}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          // Create recording entry in database
          const { error: dbError } = await supabase
            .from('recordings')
            .insert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              family_member_id: recording.familyMemberId,
              audio_url: `recordings/${fileName}`,
              duration_seconds: recording.duration,
              session_date: new Date(recording.timestamp).toISOString(),
              context: 'Offline recording synced',
            });

          if (dbError) throw dbError;

          // Mark as synced
          recording.synced = true;
          
          // Update progress
          setSyncProgress(((i + 1) / total) * 100);
          
        } catch (error) {
          console.error(`Error syncing recording ${recording.id}:`, error);
        }
      }

      // Update localStorage
      const allRecordings = JSON.parse(localStorage.getItem('offlineRecordings') || '[]');
      const updatedRecordings = allRecordings.map((r: OfflineRecording) => {
        const synced = offlineRecordings.find(or => or.id === r.id)?.synced;
        return synced ? { ...r, synced: true } : r;
      });
      
      localStorage.setItem('offlineRecordings', JSON.stringify(updatedRecordings));
      
      // Remove synced recordings from state
      setOfflineRecordings(prev => prev.filter(r => !r.synced));
      
      toast({
        title: "Sync Complete",
        description: `${total} recordings synced successfully`,
      });

    } catch (error) {
      console.error('Error syncing recordings:', error);
      toast({
        title: "Sync Failed",
        description: "Some recordings couldn't be synced. Will retry later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offlineRecordings');
    setOfflineRecordings([]);
    toast({
      title: "Offline Data Cleared",
      description: "All offline recordings have been removed",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          Offline Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection:</span>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Offline Recordings Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Pending Sync:</span>
          <Badge variant="secondary">
            {offlineRecordings.length} recordings
          </Badge>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Syncing recordings...</span>
            </div>
            <Progress value={syncProgress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={syncOfflineRecordings}
            disabled={!isOnline || offlineRecordings.length === 0 || isSyncing}
            className="flex-1 gap-2"
            size="sm"
          >
            <Upload className="h-4 w-4" />
            Sync Now
          </Button>
          
          {offlineRecordings.length > 0 && (
            <Button
              onClick={clearOfflineData}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Offline Recordings List */}
        {offlineRecordings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Offline Recordings:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {offlineRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-2 bg-muted rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(recording.timestamp)}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDuration(recording.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Instructions */}
        {!isOnline && (
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <p className="font-medium mb-1">You're offline - but you can still:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Record new family stories</li>
              <li>Browse existing content</li>
              <li>Recordings will sync when back online</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineManager;