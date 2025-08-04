import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationManagerProps {
  onPermissionChange?: (granted: boolean) => void;
}

const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  onPermissionChange
}) => {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isCapacitorAvailable, setIsCapacitorAvailable] = useState(false);

  useEffect(() => {
    // Check if we're in a Capacitor environment
    setIsCapacitorAvailable('Capacitor' in window);
    
    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      if (isCapacitorAvailable) {
        // Use Capacitor Push Notifications plugin
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        const permissionStatus = await PushNotifications.requestPermissions();
        
        if (permissionStatus.receive === 'granted') {
          setPermission('granted');
          onPermissionChange?.(true);
          
          // Register for push notifications
          await PushNotifications.register();
          
          toast({
            title: "Notifications Enabled",
            description: "You'll receive updates about new family stories and messages",
          });
        } else {
          setPermission('denied');
          onPermissionChange?.(false);
          
          toast({
            title: "Notifications Disabled",
            description: "You can enable them later in settings",
            variant: "destructive",
          });
        }
      } else {
        // Fallback to web notifications
        const permission = await Notification.requestPermission();
        setPermission(permission);
        onPermissionChange?.(permission === 'granted');
        
        if (permission === 'granted') {
          toast({
            title: "Notifications Enabled",
            description: "You'll receive updates about family activities",
          });
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Unable to set up notifications",
        variant: "destructive",
      });
    }
  };

  const showTestNotification = async () => {
    if (permission === 'granted') {
      if (isCapacitorAvailable) {
        // Use Capacitor Local Notifications
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Digital Storyteller',
              body: 'Test notification - Your family stories are safe with us! 📚',
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
            }
          ]
        });
      } else {
        // Web notification
        new Notification('Digital Storyteller', {
          body: 'Test notification - Your family stories are safe with us! 📚',
          icon: '/favicon.ico',
          tag: 'test'
        });
      }
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Enabled', color: 'bg-green-100 text-green-800' };
      case 'denied':
        return { text: 'Disabled', color: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Not Set', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const status = getPermissionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Status:</span>
          <Badge className={status.color}>
            {status.text}
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Get notified about:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>New family story uploads</li>
            <li>AI persona training completion</li>
            <li>Family member activity</li>
            <li>Recording processing status</li>
          </ul>
        </div>

        <div className="flex gap-2">
          {permission !== 'granted' && (
            <Button
              onClick={requestPermission}
              className="flex-1 gap-2"
              size="sm"
            >
              <Bell className="h-4 w-4" />
              Enable Notifications
            </Button>
          )}
          
          {permission === 'granted' && (
            <Button
              onClick={showTestNotification}
              variant="outline"
              className="flex-1 gap-2"
              size="sm"
            >
              <Check className="h-4 w-4" />
              Test Notification
            </Button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <p>Notifications are disabled. To enable:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Go to your browser/app settings</li>
              <li>Find Digital Storyteller</li>
              <li>Enable notification permissions</li>
              <li>Refresh this page</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationManager;