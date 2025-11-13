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
import { NotificationComposer } from '@/components/admin/NotificationComposer';

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: user?.id
      });

      if (error || data !== true) {
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
            <p className="text-center text-muted-foreground">{t('please_sign_in_admin')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading_admin_panel')}</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('access_denied')}</h2>
            <p className="text-muted-foreground">{t('no_admin_privileges')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: t('overview'), icon: BarChart3 },
    { id: 'users', label: t('users'), icon: Shield },
    { id: 'exams', label: t('exams'), icon: Shield },
    { id: 'classes', label: t('classes'), icon: Shield },
    { id: 'plans', label: t('plans'), icon: Shield },
    { id: 'subscriptions', label: t('subscriptions'), icon: Shield },
    { id: 'transactions', label: t('transactions'), icon: Shield },
    { id: 'notifications', label: t('notifications'), icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                {t('admin_dashboard')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('platform_management')}
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('admin_access')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Navigation Tabs */}
          <div className="lg:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-2 bg-transparent p-0">
                {navItems.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2 text-xs sm:text-sm"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Desktop Left Sidebar Navigation */}
          <Card className="hidden lg:block w-64 h-fit sticky top-6 border-border/50 bg-card/95 backdrop-blur-sm shadow-medium">
            <CardContent className="p-4">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Right Content Area */}
          <div className="flex-1 space-y-6 min-w-0">
            {activeTab === 'overview' && (
              <>
                <AdminStats />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-4">{t('platform_overview')}</h3>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('total_revenue')}</span>
                          <span className="font-medium">{t('updated_realtime')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('active_users')}</span>
                          <span className="font-medium">{t('last_30_days')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('platform_health')}</span>
                          <Badge variant="default">{t('excellent')}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-4">{t('quick_navigation')}</h3>
                      <div className="space-y-3 text-sm">
                        <p className="text-muted-foreground">{t('quick_nav_desc')}</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• <strong>{t('users')}:</strong> {t('users_manage_desc')}</li>
                          <li>• <strong>{t('exams')}:</strong> {t('exams_manage_desc')}</li>
                          <li>• <strong>{t('classes')}:</strong> {t('classes_manage_desc')}</li>
                          <li>• <strong>{t('plans')}:</strong> {t('plans_manage_desc')}</li>
                          <li>• <strong>{t('subscriptions')}:</strong> {t('subscriptions_manage_desc')}</li>
                          <li>• <strong>{t('transactions')}:</strong> {t('transactions_manage_desc')}</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'exams' && <ExamManagement />}
            {activeTab === 'classes' && <ClassManagement />}
            {activeTab === 'plans' && <SubscriptionPlanManagement />}
            {activeTab === 'subscriptions' && <ActiveSubscriptions />}
            {activeTab === 'transactions' && <TransactionViewer />}
            {activeTab === 'notifications' && <NotificationComposer />}
          </div>
        </div>
      </div>
    </div>
  );
}