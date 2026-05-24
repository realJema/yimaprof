import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, User, Lock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReplyThread from '@/components/forum/ReplyThread';
import ReplyForm from '@/components/forum/ReplyForm';

interface ForumTopicData {
  id: string;
  title: string;
  content: string;
  author_id: string;
  is_closed: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  reply_count: number;
  view_count: number;
  author?: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

interface Reply {
  id: string;
  topic_id: string;
  parent_reply_id: string | null;
  content: string;
  author_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  depth: number;
  author?: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  reactions?: { user_id: string; reaction_type: string }[];
}

export default function ForumTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.rpc('is_admin', { user_id: user?.id });
    setIsAdmin(data === true);
  };

  // Fetch topic
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['forum-topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(username, first_name, last_name)
        `)
        .eq('id', topicId)
        .single();
      
      if (error) throw error;
      return data as ForumTopicData;
    },
    enabled: !!topicId
  });

  // Fetch replies
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['forum-replies', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_replies')
        .select(`
          *,
          author:profiles!forum_replies_author_id_fkey(username, first_name, last_name)
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Fetch reactions for all replies
      const replyIds = data.map(r => r.id);
      const { data: reactions } = await supabase
        .from('forum_reactions')
        .select('reply_id, user_id, reaction_type')
        .in('reply_id', replyIds);

      // Attach reactions to replies
      return data.map(reply => ({
        ...reply,
        reactions: reactions?.filter(r => r.reply_id === reply.id) || []
      })) as Reply[];
    },
    enabled: !!topicId
  });

  // Create reply mutation
  const createReply = useMutation({
    mutationFn: async ({ content, parentReplyId }: { content: string; parentReplyId?: string }) => {
      const depth = parentReplyId 
        ? (replies?.find(r => r.id === parentReplyId)?.depth ?? 0) + 1 
        : 0;

      const { error } = await supabase
        .from('forum_replies')
        .insert({
          topic_id: topicId,
          parent_reply_id: parentReplyId || null,
          content,
          author_id: user?.id,
          depth: Math.min(depth, 5) // Max depth of 5
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', topicId] });
      queryClient.invalidateQueries({ queryKey: ['forum-topic', topicId] });
      toast.success(language === 'fr' ? 'Réponse ajoutée' : 'Reply added');
    },
    onError: () => {
      toast.error(language === 'fr' ? 'Erreur lors de l\'ajout de la réponse' : 'Failed to add reply');
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthorName = (author: ForumTopicData['author']) => {
    if (author?.username) return `@${author.username}`;
    if (author?.first_name) return author.first_name;
    return language === 'fr' ? 'Anonyme' : 'Anonymous';
  };

  // Build threaded replies
  const buildThreadedReplies = (replies: Reply[]) => {
    const topLevel = replies.filter(r => !r.parent_reply_id);
    const getChildren = (parentId: string): Reply[] => {
      return replies.filter(r => r.parent_reply_id === parentId);
    };
    return { topLevel, getChildren };
  };

  if (topicLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'fr' ? 'Sujet introuvable' : 'Topic not found'}
            </h2>
            <Button asChild>
              <Link to="/forum">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Retour au forum' : 'Back to Forum'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { topLevel, getChildren } = replies ? buildThreadedReplies(replies) : { topLevel: [], getChildren: () => [] };

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={`${topic.title} — Forum Yimaprof`}
        description={(topic.content || '').slice(0, 160) || `Discussion sur le forum Yimaprof : ${topic.title}`}
        path={`/forum/${topicId}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "DiscussionForumPosting",
          headline: topic.title,
          articleBody: topic.content,
          datePublished: topic.created_at,
          author: { "@type": "Person", name: getAuthorName(topic.author) },
          url: `https://yimaprof.com/forum/${topicId}`,
        }}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/forum">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Retour au forum' : 'Back to Forum'}
          </Link>
        </Button>

        {/* Topic Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{topic.title}</CardTitle>
                  {topic.is_closed && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      {language === 'fr' ? 'Fermé' : 'Closed'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {getAuthorName(topic.author)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDate(topic.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{topic.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Replies Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {language === 'fr' ? `${topic.reply_count} réponses` : `${topic.reply_count} replies`}
          </h2>

          {repliesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topLevel.length > 0 ? (
            <div className="space-y-4">
              {topLevel.map(reply => (
                <ReplyThread
                  key={reply.id}
                  reply={reply}
                  getChildren={getChildren}
                  topicId={topicId!}
                  isClosed={topic.is_closed}
                  isAdmin={isAdmin}
                  onReply={(content, parentId) => createReply.mutate({ content, parentReplyId: parentId })}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {language === 'fr' 
                  ? 'Soyez le premier à répondre !' 
                  : 'Be the first to reply!'}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        {user && !topic.is_closed ? (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">
                {language === 'fr' ? 'Ajouter une réponse' : 'Add a reply'}
              </h3>
              <ReplyForm 
                onSubmit={(content) => createReply.mutate({ content })}
                isSubmitting={createReply.isPending}
              />
            </CardContent>
          </Card>
        ) : topic.is_closed ? (
          <Card className="border-muted">
            <CardContent className="p-4 text-center text-muted-foreground">
              <Lock className="h-5 w-5 mx-auto mb-2" />
              {language === 'fr' 
                ? 'Ce sujet est fermé aux nouvelles réponses' 
                : 'This topic is closed to new replies'}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'fr' 
                  ? 'Connectez-vous pour répondre' 
                  : 'Sign in to reply'}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">
                  {language === 'fr' ? 'Se connecter' : 'Sign In'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
