import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, BarChart3 } from 'lucide-react';

// Import admin components
import { AdminStats } from '@/components/admin/AdminStats';
import { UserManagement } from '@/components/admin/UserManagement';
import { ExamManagement } from '@/components/admin/ExamManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { SubscriptionPlanManagement } from '@/components/admin/SubscriptionPlanManagement';
import { TransactionViewer } from '@/components/admin/TransactionViewer';
import { ActiveSubscriptions } from '@/components/admin/ActiveSubscriptions';

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (error || profile?.role !== 'admin') {
        setHasAccess(false);
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
      } else {
        setHasAccess(true);
      }
    } catch (error) {
      setHasAccess(false);
      toast({
        title: 'Error',
        description: 'Failed to verify admin access',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to access admin panel</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Platform management and analytics
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        {/* Stats Overview */}
        <AdminStats />

        {/* Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Platform Overview</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-medium">Updated in real-time</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Users</span>
                      <span className="font-medium">Last 30 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Health</span>
                      <Badge variant="default">Excellent</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">Use the tabs above to navigate between different management sections:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• <strong>Users:</strong> Manage user accounts and roles</li>
                      <li>• <strong>Exams:</strong> CRUD operations for exam papers</li>
                      <li>• <strong>Classes:</strong> Manage educational classes</li>
                      <li>• <strong>Plans:</strong> Subscription plan management</li>
                      <li>• <strong>Subscriptions:</strong> View active subscriptions</li>
                      <li>• <strong>Transactions:</strong> Financial transaction history</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="exams">
            <ExamManagement />
          </TabsContent>

          <TabsContent value="classes">
            <ClassManagement />
          </TabsContent>

          <TabsContent value="plans">
            <SubscriptionPlanManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <ActiveSubscriptions />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}