import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileRecorder from '@/components/mobile/MobileRecorder';
import PushNotificationManager from '@/components/mobile/PushNotificationManager';
import OfflineManager from '@/components/mobile/OfflineManager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MobileRecord: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Get family member ID from URL params or state
  const familyMemberId = location.state?.familyMemberId || 
    new URLSearchParams(location.search).get('familyMember');

  useEffect(() => {
    // Detect if we're on a mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    // This will be called when recording is completed
    console.log('Recording completed:', { duration, size: audioBlob.size });
    // The actual upload/processing logic will be handled by the MobileRecorder component
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-primary">Mobile Recording</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isMobile && (
              <Badge variant="secondary" className="gap-1">
                📱 Mobile Optimized
              </Badge>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Mobile Recording Interface */}
        <div className="space-y-6">
          {/* Recording Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>📚 Record Your Family Story</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Share memories, wisdom, and stories that matter to your family.</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium mb-2">💡 Recording Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Find a quiet space with minimal background noise</li>
                    <li>Hold your device 6-8 inches from your mouth</li>
                    <li>Speak clearly and at a natural pace</li>
                    <li>Share specific memories, dates, and emotions</li>
                    <li>Recordings work offline - they'll sync when connected</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Recorder Component */}
          <MobileRecorder
            familyMemberId={familyMemberId}
            onRecordingComplete={handleRecordingComplete}
          />

          {/* Mobile Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Offline Manager */}
            <OfflineManager />
            
            {/* Push Notifications */}
            <PushNotificationManager
              onPermissionChange={(granted) => {
                console.log('Notification permission:', granted);
              }}
            />
          </div>

          {/* Mobile-Specific Features */}
          {isMobile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📱 Mobile Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-700">✓ Offline Ready</div>
                    <div className="text-xs text-green-600">Record without internet</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-700">✓ Touch Optimized</div>
                    <div className="text-xs text-blue-600">Large, easy controls</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-semibold text-purple-700">✓ Push Alerts</div>
                    <div className="text-xs text-purple-600">Family updates</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-semibold text-orange-700">✓ Auto Sync</div>
                    <div className="text-xs text-orange-600">When back online</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Story Prompts */}
          <Card>
            <CardHeader>
              <CardTitle>💭 Story Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "What's your earliest childhood memory?",
                  "Tell me about your wedding day",
                  "What advice would you give to future generations?",
                  "What was life like when you were growing up?",
                  "Share a story about overcoming a challenge",
                  "What traditions are important to our family?",
                  "Describe your favorite family vacation",
                  "What are you most proud of in life?"
                ].map((prompt, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors"
                  >
                    <p className="text-sm">{prompt}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MobileRecord;