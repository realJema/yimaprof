import { useState, useEffect, useCallback } from 'react';
import { Star, Send, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface Review {
  id: string;
  exam_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  };
}

interface ExamReviewSectionProps {
  examId: string;
}

function StarRating({ rating, onRate, interactive = false, size = 20 }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${interactive ? 'cursor-pointer transition-colors' : ''} ${
            (interactive ? hover || rating : rating) >= star
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/40'
          }`}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        />
      ))}
    </div>
  );
}

function getDisplayName(review: Review): string {
  if (review.profile?.first_name || review.profile?.last_name) {
    return [review.profile.first_name, review.profile.last_name].filter(Boolean).join(' ');
  }
  if (review.profile?.username) return review.profile.username;
  return 'Utilisateur';
}

function getInitials(review: Review): string {
  const name = getDisplayName(review);
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ExamReviewSection({ examId }: ExamReviewSectionProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const t = useCallback((key: string) => {
    const translations: Record<string, Record<string, string>> = {
      reviews_title: { fr: 'Avis & Notes', en: 'Reviews & Ratings' },
      average: { fr: 'Moyenne', en: 'Average' },
      reviews_count: { fr: 'avis', en: 'reviews' },
      your_review: { fr: 'Votre avis', en: 'Your Review' },
      click_to_rate: { fr: 'Cliquez pour noter', en: 'Click to rate' },
      comment_placeholder: { fr: 'Laissez un commentaire (optionnel)...', en: 'Leave a comment (optional)...' },
      submit: { fr: 'Soumettre', en: 'Submit' },
      update: { fr: 'Mettre à jour', en: 'Update' },
      edit: { fr: 'Modifier', en: 'Edit' },
      delete: { fr: 'Supprimer', en: 'Delete' },
      cancel: { fr: 'Annuler', en: 'Cancel' },
      no_reviews: { fr: 'Aucun avis pour le moment. Soyez le premier !', en: 'No reviews yet. Be the first!' },
      login_required: { fr: 'Connectez-vous pour laisser un avis', en: 'Log in to leave a review' },
      rating_required: { fr: 'Veuillez sélectionner une note', en: 'Please select a rating' },
      review_submitted: { fr: 'Avis soumis avec succès', en: 'Review submitted successfully' },
      review_updated: { fr: 'Avis mis à jour', en: 'Review updated' },
      review_deleted: { fr: 'Avis supprimé', en: 'Review deleted' },
      error: { fr: 'Une erreur est survenue', en: 'An error occurred' },
      all_reviews: { fr: 'Tous les avis', en: 'All Reviews' },
    };
    return translations[key]?.[language === 'fr' ? 'fr' : 'en'] || key;
  }, [language]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exam_reviews' as any)
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      setLoading(false);
      return;
    }

    const reviewsData = (data || []) as any[];

    // Fetch profiles for all reviewers
    const userIds = reviewsData.map((r: any) => r.user_id);
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', userIds);
      if (profiles) {
        profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    const enriched: Review[] = reviewsData.map((r: any) => ({
      ...r,
      profile: profilesMap[r.user_id] || null,
    }));

    setReviews(enriched);
    const myReview = enriched.find(r => r.user_id === user?.id) || null;
    setUserReview(myReview);
    if (myReview && !editing) {
      setRating(myReview.rating);
      setComment(myReview.comment || '');
    }
    setLoading(false);
  }, [examId, user?.id, editing]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      toast({ title: t('rating_required'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      if (userReview) {
        const { error } = await supabase
          .from('exam_reviews' as any)
          .update({ rating, comment: comment || null, updated_at: new Date().toISOString() } as any)
          .eq('id', userReview.id as any);
        if (error) throw error;
        toast({ title: t('review_updated') });
      } else {
        const { error } = await supabase
          .from('exam_reviews' as any)
          .insert({ exam_id: examId, user_id: user.id, rating, comment: comment || null } as any);
        if (error) throw error;
        toast({ title: t('review_submitted') });
      }
      setEditing(false);
      await fetchReviews();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('error'), description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userReview) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('exam_reviews' as any)
        .delete()
        .eq('id', userReview.id as any);
      if (error) throw error;
      toast({ title: t('review_deleted') });
      setUserReview(null);
      setRating(0);
      setComment('');
      setEditing(false);
      await fetchReviews();
    } catch (e: any) {
      toast({ title: t('error'), description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const otherReviews = reviews.filter(r => r.user_id !== user?.id);
  const dateFnsLocale = language === 'fr' ? fr : enUS;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t('reviews_title')}
        </CardTitle>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <StarRating rating={Math.round(averageRating)} size={16} />
              <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
            </div>
            <span>·</span>
            <span>{reviews.length} {t('reviews_count')}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User review form */}
        {user ? (
          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
            <p className="text-sm font-medium">{t('your_review')}</p>

            {userReview && !editing ? (
              <div className="space-y-2">
                <StarRating rating={userReview.rating} size={18} />
                {userReview.comment && (
                  <p className="text-sm text-muted-foreground italic">"{userReview.comment}"</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {t('edit')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} disabled={submitting}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t('delete')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StarRating rating={rating} onRate={setRating} interactive size={24} />
                  {rating === 0 && <span className="text-xs text-muted-foreground">{t('click_to_rate')}</span>}
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('comment_placeholder')}
                  rows={2}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {userReview ? t('update') : t('submit')}
                  </Button>
                  {editing && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(false);
                      setRating(userReview?.rating || 0);
                      setComment(userReview?.comment || '');
                    }}>
                      {t('cancel')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">{t('login_required')}</p>
        )}

        {/* Other reviews */}
        {otherReviews.length > 0 && (
          <>
            <Separator />
            <p className="text-sm font-medium">{t('all_reviews')}</p>
            <div className="space-y-3">
              {otherReviews.map((review) => (
                <div key={review.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(review)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{getDisplayName(review)}</span>
                      <StarRating rating={review.rating} size={13} />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: dateFnsLocale })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">"{review.comment}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {reviews.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('no_reviews')}</p>
        )}
      </CardContent>
    </Card>
  );
}
