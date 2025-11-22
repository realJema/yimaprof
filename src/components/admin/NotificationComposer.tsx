import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Send, Users, Filter, Eye, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RecipientFilter {
  allUsers: boolean;
  subscriptionPlans: string[];
  subscriptionStatus: string[];
  classLevels: string[];
}

export const NotificationComposer = () => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'admin_message' | 'account_activity'>('admin_message');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const [filters, setFilters] = useState<RecipientFilter>({
    allUsers: true,
    subscriptionPlans: [],
    subscriptionStatus: [],
    classLevels: [],
  });

  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchAvailableOptions();
  }, []);

  useEffect(() => {
    if (!filters.allUsers) {
      calculateRecipientCount();
    }
  }, [filters]);

  const fetchAvailableOptions = async () => {
    try {
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('is_active', true);
      
      const { data: classes } = await supabase
        .from('classes')
        .select('id, display_name, level, section');

      setAvailablePlans(plans || []);
      setAvailableClasses(classes || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const calculateRecipientCount = async () => {
    try {
      let query = supabase.from('profiles').select('id', { count: 'exact', head: true });

      if (filters.subscriptionPlans.length > 0 || filters.subscriptionStatus.length > 0) {
        // For now, we'll get all users and filter on backend
        // In production, you might want to create a more optimized query
        const { count } = await query;
        setRecipientCount(count || 0);
      } else {
        const { count } = await query;
        setRecipientCount(count || 0);
      }
    } catch (error) {
      console.error('Error calculating recipients:', error);
      setRecipientCount(0);
    }
  };

  const getRecipientUserIds = async (): Promise<string[]> => {
    try {
      if (filters.allUsers) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        return profiles?.map(p => p.id) || [];
      }

      let userIds: Set<string> = new Set();

      // Filter by subscription plans
      if (filters.subscriptionPlans.length > 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('user_id')
          .in('plan_id', filters.subscriptionPlans);
        
        subscriptions?.forEach(s => userIds.add(s.user_id));
      }

      // Filter by subscription status
      if (filters.subscriptionStatus.length > 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('user_id')
          .in('status', filters.subscriptionStatus as any);
        
        if (filters.subscriptionPlans.length === 0) {
          subscriptions?.forEach(s => userIds.add(s.user_id));
        } else {
          // Intersect with plan filter
          const statusUserIds = new Set(subscriptions?.map(s => s.user_id) || []);
          userIds = new Set([...userIds].filter(id => statusUserIds.has(id)));
        }
      }

      // Filter by class level
      if (filters.classLevels.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .in('class_level', filters.classLevels);
        
        if (filters.subscriptionPlans.length === 0 && filters.subscriptionStatus.length === 0) {
          profiles?.forEach(p => userIds.add(p.id));
        } else {
          // Intersect with previous filters
          const classUserIds = new Set(profiles?.map(p => p.id) || []);
          userIds = new Set([...userIds].filter(id => classUserIds.has(id)));
        }
      }

      // If no specific filters selected but allUsers is false, return empty
      if (userIds.size === 0 && !filters.allUsers) {
        return [];
      }

      return Array.from(userIds);
    } catch (error) {
      console.error('Error getting recipient user IDs:', error);
      return [];
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: t('error'),
        description: t('fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const userIds = await getRecipientUserIds();
      
      if (userIds.length === 0) {
        toast({
          title: t('error'),
          description: t('noRecipientsFound'),
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      // Send in-app notifications via database function
      const { data, error } = await supabase.rpc('broadcast_notification', {
        p_user_ids: userIds,
        p_title: title,
        p_message: message,
        p_type: type,
        p_priority: priority,
        p_metadata: {},
        p_action_url: actionUrl || null,
      });

      if (error) throw error;

      // Send email notifications for each user
      let emailsSent = 0;
      for (const userId of userIds) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
            body: {
              userId,
              title,
              message,
              type,
              priority,
              metadata: {},
              actionUrl: actionUrl || null,
            },
          });

          if (!emailError) {
            emailsSent++;
          }
        } catch (emailErr) {
          console.error('Email send error for user:', userId, emailErr);
        }
      }

      toast({
        title: t('success'),
        description: `${t('notificationSent')} ${data} ${t('recipients')}. ${emailsSent} emails sent.`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setType('admin_message');
      setPriority('normal');
      setActionUrl('');
      setFilters({
        allUsers: true,
        subscriptionPlans: [],
        subscriptionStatus: [],
        classLevels: [],
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: t('error'),
        description: t('notificationSendFailed'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const togglePlanFilter = (planId: string) => {
    setFilters(prev => ({
      ...prev,
      allUsers: false,
      subscriptionPlans: prev.subscriptionPlans.includes(planId)
        ? prev.subscriptionPlans.filter(id => id !== planId)
        : [...prev.subscriptionPlans, planId],
    }));
  };

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      allUsers: false,
      subscriptionStatus: prev.subscriptionStatus.includes(status)
        ? prev.subscriptionStatus.filter(s => s !== status)
        : [...prev.subscriptionStatus, status],
    }));
  };

  const toggleClassFilter = (classLevel: string) => {
    setFilters(prev => ({
      ...prev,
      allUsers: false,
      classLevels: prev.classLevels.includes(classLevel)
        ? prev.classLevels.filter(c => c !== classLevel)
        : [...prev.classLevels, classLevel],
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Send className="h-5 w-5" />
            {t('composeNotification')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('composeNotificationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">{t('title')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('notificationTitle')}
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-foreground">{t('message')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('notificationMessage')}
                rows={4}
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">{t('type')}</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="admin_message">{t('adminMessage')}</SelectItem>
                    <SelectItem value="account_activity">{t('accountActivity')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">{t('priority')}</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="low">{t('lowPriority')}</SelectItem>
                    <SelectItem value="normal">{t('normalPriority')}</SelectItem>
                    <SelectItem value="high">{t('highPriority')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionUrl" className="text-foreground">
                {t('actionUrl')} ({t('optional')})
              </Label>
              <Input
                id="actionUrl"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="/dashboard"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('recipientFilters')}
              </h3>
              <Badge variant="secondary" className="text-sm">
                <Users className="h-3 w-3 mr-1" />
                {filters.allUsers ? t('allUsers') : `~${recipientCount} ${t('users')}`}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allUsers"
                  checked={filters.allUsers}
                  onCheckedChange={(checked) => setFilters({
                    allUsers: !!checked,
                    subscriptionPlans: [],
                    subscriptionStatus: [],
                    classLevels: [],
                  })}
                />
                <Label htmlFor="allUsers" className="text-foreground cursor-pointer">
                  {t('sendToAllUsers')}
                </Label>
              </div>

              {!filters.allUsers && (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground">{t('subscriptionPlans')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {availablePlans.map((plan) => (
                        <Badge
                          key={plan.id}
                          variant={filters.subscriptionPlans.includes(plan.id) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => togglePlanFilter(plan.id)}
                        >
                          {plan.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">{t('subscriptionStatus')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {['active', 'pending', 'expired', 'canceled'].map((status) => (
                        <Badge
                          key={status}
                          variant={filters.subscriptionStatus.includes(status) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleStatusFilter(status)}
                        >
                          {t(`${status}Status`)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">{t('classLevels')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableClasses.map((cls) => (
                        <Badge
                          key={cls.id}
                          variant={filters.classLevels.includes(cls.level) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleClassFilter(cls.level)}
                        >
                          {cls.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              onClick={() => setPreviewOpen(true)}
              variant="outline"
              disabled={!title || !message}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('previewNotification')}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !title || !message}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('sendNotification')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('notificationPreview')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('previewDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">{t('title')}</Label>
              <p className="font-semibold text-foreground">{title}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">{t('message')}</Label>
              <p className="text-foreground whitespace-pre-wrap">{message}</p>
            </div>
            <div className="flex gap-2">
              <Badge>{type}</Badge>
              <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
                {priority}
              </Badge>
            </div>
            {actionUrl && (
              <div>
                <Label className="text-sm text-muted-foreground">{t('actionUrl')}</Label>
                <p className="text-sm text-primary">{actionUrl}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
