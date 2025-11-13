import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell, Send, Loader2 } from 'lucide-react';

export default function TestNotifications() {
  const { user } = useAuth();
  const [userId, setUserId] = useState(user?.id || '');
  const [sending, setSending] = useState(false);

  const sendTestNotification = async () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'Please enter a user ID',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        body: { userId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Test notification sent! Check the notification bell in the header.',
        });
      } else {
        throw new Error(data.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendTestToSelf = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }

    setUserId(user.id);
    setTimeout(() => sendTestNotification(), 100);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="h-6 w-6" />
              Test Notification System
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Send test notifications to verify the real-time notification system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold text-foreground">How to Test:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Click "Send to Myself" to test your own notifications</li>
                  <li>Check the bell icon in the header - you should see the notification appear instantly</li>
                  <li>Click on the notification to see the full details in a modal</li>
                  <li>Verify the notification appears in the /notifications page</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={sendTestToSelf}
                  disabled={sending || !user}
                  className="flex-1"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Send to Myself
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or send to specific user
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userId" className="text-foreground">
                  User ID
                </Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user UUID"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <Button
                onClick={sendTestNotification}
                disabled={sending || !userId}
                variant="outline"
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Notification
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-foreground mb-2">Testing Admin Composer:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to the <a href="/admin" className="text-primary underline">/admin</a> page</li>
                <li>Navigate to the "Notifications" tab</li>
                <li>Fill in the title and message</li>
                <li>Select recipients using filters or "Send to all users"</li>
                <li>Preview and send the notification</li>
                <li>Verify recipients receive it in real-time</li>
              </ol>
            </div>

            {user && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Your Info:</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {user.email}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  <strong>User ID:</strong> {user.id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
