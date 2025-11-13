import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const feedbackSchema = z.object({
  feedback_text: z.string()
    .trim()
    .min(10, 'Feedback must be at least 10 characters')
    .max(1000, 'Feedback must be less than 1000 characters'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function WriteToUs() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedback_text: '',
    },
  });

  const feedbackText = watch('feedback_text');

  useEffect(() => {
    setCharCount(feedbackText.length);
  }, [feedbackText]);

  useEffect(() => {
    if (!user) {
      toast({
        title: t('login_required'),
        description: t('login_to_feedback'),
        variant: 'destructive',
      });
      navigate('/auth', { state: { from: '/write-to-us' } });
    }
  }, [user, navigate, toast, t]);

  const onSubmit = async (data: FeedbackFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          feedback_text: data.feedback_text.trim(),
        });

      if (error) throw error;

      toast({
        title: t('feedback_success_title'),
        description: t('feedback_success'),
      });

      reset();
      setCharCount(0);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: t('feedback_error_title'),
        description: t('feedback_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('write_to_us')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('feedback_intro')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('share_feedback')}</CardTitle>
            <CardDescription>
              {t('feedback_form_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="feedback_text">
                  {t('your_feedback')}
                </Label>
                <Textarea
                  id="feedback_text"
                  placeholder={t('feedback_placeholder')}
                  className="min-h-[200px] resize-none"
                  {...register('feedback_text')}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center text-sm">
                  <span className={`${errors.feedback_text ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {errors.feedback_text?.message || ''}
                  </span>
                  <span className={`${charCount > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {t('character_count').replace('{count}', charCount.toString())}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || charCount < 10 || charCount > 1000}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('sending')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('send_feedback')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{t('feedback_privacy_note')}</p>
        </div>
      </div>
    </div>
  );
}
