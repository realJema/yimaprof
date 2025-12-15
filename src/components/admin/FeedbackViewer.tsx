import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminDataTable } from './AdminDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, User, Mail, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  user_id: string;
  feedback_text: string;
  status: 'new' | 'reviewed' | 'replied';
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    profile_photo_url: string | null;
  } | null;
}

export function FeedbackViewer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchFeedbacks();
    subscribeToFeedback();
  }, []);

  const subscribeToFeedback = () => {
    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
        },
        () => {
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      
      // First get all feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Then get profiles for each feedback
      if (feedbackData && feedbackData.length > 0) {
        const userIds = [...new Set(feedbackData.map(fb => fb.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, profile_photo_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Merge feedback with profiles
        const feedbacksWithProfiles = feedbackData.map(fb => ({
          ...fb,
          profiles: profilesData?.find(p => p.id === fb.user_id) || null,
        }));

        setFeedbacks(feedbacksWithProfiles);
      } else {
        setFeedbacks([]);
      }
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error);
      toast({
        title: t('error'),
        description: t('failed_to_load_feedback'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'replied') => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: t('status_updated'),
        description: t('feedback_status_updated'),
      });

      // Update local state
      setFeedbacks(prev =>
        prev.map(fb =>
          fb.id === feedbackId ? { ...fb, status: newStatus } : fb
        )
      );

      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error: any) {
      console.error('Error updating feedback status:', error);
      toast({
        title: t('error'),
        description: t('failed_to_update_status'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'default',
      reviewed: 'secondary',
      replied: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {t(`feedback_status_${status}`)}
      </Badge>
    );
  };

  const getUserName = (feedback: Feedback) => {
    if (!feedback) return t('unknown_user');
    const profiles = feedback.profiles;
    if (profiles?.first_name || profiles?.last_name) {
      return `${profiles?.first_name || ''} ${profiles?.last_name || ''}`.trim();
    }
    return t('unknown_user');
  };

  const filteredFeedbacks = statusFilter === 'all'
    ? feedbacks
    : feedbacks.filter(fb => fb.status === statusFilter);

  const columns = [
    {
      key: 'user',
      label: t('user'),
      render: (feedback: Feedback) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getUserName(feedback)}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('email'),
      render: (feedback: Feedback) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {feedback?.profiles?.email || t('no_email')}
          </span>
        </div>
      ),
    },
    {
      key: 'feedback_preview',
      label: t('feedback'),
      render: (feedback: Feedback) => (
        <div className="max-w-md">
          <p className="text-sm text-muted-foreground truncate">
            {feedback.feedback_text.substring(0, 100)}
            {feedback.feedback_text.length > 100 && '...'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (feedback: Feedback) => getStatusBadge(feedback.status),
    },
    {
      key: 'created_at',
      label: t('date'),
      render: (feedback: Feedback) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{format(new Date(feedback.created_at), 'MMM dd, yyyy')}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('user_feedback')}</h2>
          <p className="text-muted-foreground">{t('manage_user_feedback')}</p>
        </div>
        <Button onClick={fetchFeedbacks} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="new">{t('feedback_status_new')}</TabsTrigger>
          <TabsTrigger value="reviewed">{t('feedback_status_reviewed')}</TabsTrigger>
          <TabsTrigger value="replied">{t('feedback_status_replied')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminDataTable
        data={filteredFeedbacks}
        columns={columns}
        searchKey="feedback_text"
        loading={loading}
        actions={(feedback: Feedback) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFeedback(feedback)}
          >
            {t('view_details')}
          </Button>
        )}
      />

      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('feedback_details')}
            </DialogTitle>
            <DialogDescription>
              {t('view_full_feedback')}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{getUserName(selectedFeedback)}</span>
                        </div>
                        {selectedFeedback.profiles?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {selectedFeedback.profiles.email}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(selectedFeedback.created_at), 'PPpp')}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(selectedFeedback.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">{t('feedback_content')}</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedFeedback.feedback_text}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('update_status')}</label>
                <Select
                  value={selectedFeedback.status}
                  onValueChange={(value) =>
                    updateFeedbackStatus(selectedFeedback.id, value as 'new' | 'reviewed' | 'replied')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{t('feedback_status_new')}</SelectItem>
                    <SelectItem value="reviewed">{t('feedback_status_reviewed')}</SelectItem>
                    <SelectItem value="replied">{t('feedback_status_replied')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
