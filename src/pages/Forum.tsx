import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Plus, Search, Clock, User, MessageSquare, Lock } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import NewTopicDialog from '@/components/forum/NewTopicDialog';

interface ForumTopic {
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

export default function Forum() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'latest' | 'active' | 'unanswered'>('latest');
  const [isNewTopicOpen, setIsNewTopicOpen] = useState(false);

  const { data: topics, isLoading, refetch } = useQuery({
    queryKey: ['forum-topics', filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(username, first_name, last_name)
        `)
        .eq('is_hidden', false);

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (filter === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (filter === 'active') {
        query = query.order('updated_at', { ascending: false });
      } else if (filter === 'unanswered') {
        query = query.eq('reply_count', 0).order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as ForumTopic[];
    }
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'fr' ? 'à l\'instant' : 'just now';
    if (diffMins < 60) return `${diffMins}${language === 'fr' ? ' min' : 'm'}`;
    if (diffHours < 24) return `${diffHours}${language === 'fr' ? ' h' : 'h'}`;
    if (diffDays < 7) return `${diffDays}${language === 'fr' ? ' j' : 'd'}`;
    return date.toLocaleDateString();
  };

  const getAuthorName = (topic: ForumTopic) => {
    if (topic.author?.username) return `@${topic.author.username}`;
    if (topic.author?.first_name) return topic.author.first_name;
    return language === 'fr' ? 'Anonyme' : 'Anonymous';
  };

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Forum — Yimaprof"
        description="Posez vos questions, partagez vos méthodes et échangez avec d'autres élèves et enseignants sur le forum Yimaprof."
        path="/forum"
      />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {language === 'fr' ? 'Forum' : 'Forum'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'fr' ? 'Discutez et partagez avec la communauté' : 'Discuss and share with the community'}
              </p>
            </div>
          </div>
          {user && (
            <Button onClick={() => setIsNewTopicOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'fr' ? 'Nouveau sujet' : 'New Topic'}
            </Button>
          )}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher un sujet...' : 'Search topics...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)}>
            <ToggleGroupItem value="latest" aria-label="Latest">
              {language === 'fr' ? 'Récents' : 'Latest'}
            </ToggleGroupItem>
            <ToggleGroupItem value="active" aria-label="Most Active">
              {language === 'fr' ? 'Actifs' : 'Active'}
            </ToggleGroupItem>
            <ToggleGroupItem value="unanswered" aria-label="Unanswered">
              {language === 'fr' ? 'Sans réponse' : 'Unanswered'}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : topics && topics.length > 0 ? (
            topics.map((topic) => (
              <Link key={topic.id} to={`/forum/${topic.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {topic.title}
                          </h3>
                          {topic.is_closed && (
                            <Badge variant="secondary" className="gap-1 shrink-0">
                              <Lock className="h-3 w-3" />
                              {language === 'fr' ? 'Fermé' : 'Closed'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {topic.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getAuthorName(topic)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(topic.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">{topic.reply_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {language === 'fr' ? 'Aucun sujet trouvé' : 'No topics found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {language === 'fr' 
                    ? 'Soyez le premier à démarrer une discussion !' 
                    : 'Be the first to start a discussion!'}
                </p>
                {user && (
                  <Button onClick={() => setIsNewTopicOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Créer un sujet' : 'Create Topic'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Login prompt for non-authenticated users */}
        {!user && (
          <Card className="mt-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'fr' 
                  ? 'Connectez-vous pour participer aux discussions' 
                  : 'Sign in to participate in discussions'}
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

      <NewTopicDialog 
        open={isNewTopicOpen} 
        onOpenChange={setIsNewTopicOpen}
        onSuccess={() => {
          refetch();
          setIsNewTopicOpen(false);
        }}
      />
    </div>
  );
}
