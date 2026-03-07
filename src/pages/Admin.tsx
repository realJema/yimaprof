import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, BarChart3, MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, MessageCircle, BookOpen, Users, Bot, Settings, CreditCard, Bell, Receipt, Heart } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Import admin components
import { AdminStats } from '@/components/admin/AdminStats';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { EstablishmentManagement } from '@/components/admin/EstablishmentManagement';
import { SubjectManagement } from '@/components/admin/SubjectManagement';
import { PeriodManagement } from '@/components/admin/PeriodManagement';
import { AcademicYearManagement } from '@/components/admin/AcademicYearManagement';
import { ExamTypeManagement } from '@/components/admin/ExamTypeManagement';
import { DurationManagement } from '@/components/admin/DurationManagement';
import { SubscriptionPlanManagement } from '@/components/admin/SubscriptionPlanManagement';
import { TransactionViewer } from '@/components/admin/TransactionViewer';
import { ActiveSubscriptions } from '@/components/admin/ActiveSubscriptions';
import { NotificationComposer } from '@/components/admin/NotificationComposer';
import { FeedbackViewer } from '@/components/admin/FeedbackViewer';
import ForumModeration from '@/components/admin/ForumModeration';
import { AffiliateManagement } from '@/components/admin/AffiliateManagement';
import { SeriesManagement } from '@/components/admin/SeriesManagement';
import { AIUsageStats } from '@/components/admin/AIUsageStats';

function ConfigSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <h3 className="text-base md:text-lg font-semibold">{title}</h3>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-4 md:pb-6">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Admin() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  // Scroll active mobile tab into view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

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
    { id: 'users', label: t('users'), icon: Users },
    { id: 'affiliates', label: language === 'fr' ? 'Affiliés' : 'Affiliates', icon: Heart },
    { id: 'config', label: language === 'fr' ? 'Config' : 'Config', icon: Settings },
    { id: 'plans', label: t('plans'), icon: CreditCard },
    { id: 'subscriptions', label: language === 'fr' ? 'Abonnements' : 'Subs', icon: Shield },
    { id: 'transactions', label: language === 'fr' ? 'Paiements' : 'Payments', icon: Receipt },
    { id: 'notifications', label: language === 'fr' ? 'Notifs' : 'Notifs', icon: Bell },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'forum', label: 'Forum', icon: MessageCircle },
    { id: 'ai-usage', label: 'IA', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header - compact on mobile */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
                <span className="truncate">{t('admin_dashboard')}</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">
                {t('platform_management')}
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <Link to="/admin/exams">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">{t('manage_exams')}</span>
                  <span className="sm:hidden">{language === 'fr' ? 'Examens' : 'Exams'}</span>
                </Button>
              </Link>
              <Badge variant="secondary" className="items-center gap-1.5 hidden md:flex">
                <BarChart3 className="h-4 w-4" />
                {t('admin_access')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - horizontal scrollable pills */}
      <div className="lg:hidden sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-3 py-2.5 min-w-max">
            {navItems.map((item) => (
              <button
                key={item.id}
                ref={activeTab === item.id ? activeTabRef : null}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Floating Sidebar Toggle Button - desktop only */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="hidden lg:flex fixed left-4 top-32 z-50 rounded-full shadow-lg bg-card hover:bg-muted border-2 transition-all duration-300 gap-2 px-4"
          style={{ left: sidebarVisible ? '17rem' : '1rem' }}
        >
          {sidebarVisible ? (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs font-medium">Hide Menu</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="h-4 w-4" />
              <span className="text-xs font-medium">Show Menu</span>
            </>
          )}
        </Button>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Desktop Left Sidebar Navigation */}
          {sidebarVisible && (
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
          )}

          {/* Right Content Area */}
          <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
            {activeTab === 'overview' && (
              <>
                <AdminStats />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-4 md:pt-6">
                      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('platform_overview')}</h3>
                      <div className="space-y-3 md:space-y-4 text-sm">
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
                    <CardContent className="pt-4 md:pt-6">
                      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('quick_navigation')}</h3>
                      <div className="space-y-3 text-sm">
                        <p className="text-muted-foreground">{t('quick_nav_desc')}</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• <strong>{t('users')}:</strong> {t('users_manage_desc')}</li>
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
            {activeTab === 'affiliates' && <AffiliateManagement />}
            {activeTab === 'config' && (
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{t('system_configuration')}</h2>
                
                <ConfigSection title={t('classes')}>
                  <ClassManagement />
                </ConfigSection>
                
                <ConfigSection title={t('establishments')}>
                  <EstablishmentManagement />
                </ConfigSection>
                
                <ConfigSection title={t('subjects')}>
                  <SubjectManagement />
                </ConfigSection>
                
                <ConfigSection title={t('periods')}>
                  <PeriodManagement />
                </ConfigSection>
                
                <ConfigSection title={t('academic_years')}>
                  <AcademicYearManagement />
                </ConfigSection>
                
                <ConfigSection title={t('exam_types')}>
                  <ExamTypeManagement />
                </ConfigSection>
                
                <ConfigSection title={language === 'fr' ? 'Séries / Filières' : 'Series / Tracks'}>
                  <SeriesManagement />
                </ConfigSection>
                
                <ConfigSection title={t('durations')}>
                  <DurationManagement />
                </ConfigSection>
              </div>
            )}
            {activeTab === 'plans' && <SubscriptionPlanManagement />}
            {activeTab === 'subscriptions' && <ActiveSubscriptions />}
            {activeTab === 'transactions' && <TransactionViewer />}
            {activeTab === 'notifications' && <NotificationComposer />}
            {activeTab === 'feedback' && <FeedbackViewer />}
            {activeTab === 'forum' && <ForumModeration />}
            {activeTab === 'ai-usage' && <AIUsageStats />}
          </div>
        </div>
      </div>
    </div>
  );
}
