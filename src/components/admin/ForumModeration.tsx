import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MessageCircle, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Search,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface ForumTopic {
  id: string;
  title: string;
  author_id: string;
  is_closed: boolean;
  is_hidden: boolean;
  created_at: string;
  reply_count: number;
  view_count: number;
  author?: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export default function ForumModeration() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: topics, isLoading } = useQuery({
    queryKey: ['admin-forum-topics', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(username, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as ForumTopic[];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['forum-stats'],
    queryFn: async () => {
      const [topicsRes, repliesRes] = await Promise.all([
        supabase.from('forum_topics').select('id', { count: 'exact', head: true }),
        supabase.from('forum_replies').select('id', { count: 'exact', head: true })
      ]);
      return {
        totalTopics: topicsRes.count || 0,
        totalReplies: repliesRes.count || 0
      };
    }
  });

  const updateTopic = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ForumTopic> }) => {
      const { error } = await supabase
        .from('forum_topics')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forum-topics'] });
      toast.success(language === 'fr' ? 'Sujet mis à jour' : 'Topic updated');
    },
    onError: () => {
      toast.error(language === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update');
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAuthorName = (topic: ForumTopic) => {
    if (topic.author?.username) return `@${topic.author.username}`;
    if (topic.author?.first_name) return topic.author.first_name;
    if (topic.author?.email) return topic.author.email;
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'fr' ? 'Total sujets' : 'Total Topics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalTopics || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'fr' ? 'Total réponses' : 'Total Replies'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.totalReplies || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>
              {language === 'fr' ? 'Gestion des sujets' : 'Topic Management'}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'fr' ? 'Titre' : 'Title'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Auteur' : 'Author'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Réponses' : 'Replies'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Date' : 'Date'}</TableHead>
                    <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                    <TableHead className="text-right">{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics?.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{topic.title}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
                            <Link to={`/forum/${topic.id}`} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getAuthorName(topic)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{topic.reply_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(topic.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {topic.is_closed && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              {language === 'fr' ? 'Fermé' : 'Closed'}
                            </Badge>
                          )}
                          {topic.is_hidden && (
                            <Badge variant="destructive" className="gap-1">
                              <EyeOff className="h-3 w-3" />
                              {language === 'fr' ? 'Caché' : 'Hidden'}
                            </Badge>
                          )}
                          {!topic.is_closed && !topic.is_hidden && (
                            <Badge variant="default" className="bg-green-500">
                              {language === 'fr' ? 'Actif' : 'Active'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateTopic.mutate({ 
                              id: topic.id, 
                              updates: { is_closed: !topic.is_closed } 
                            })}
                            title={topic.is_closed 
                              ? (language === 'fr' ? 'Rouvrir' : 'Reopen') 
                              : (language === 'fr' ? 'Fermer' : 'Close')}
                          >
                            {topic.is_closed ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateTopic.mutate({ 
                              id: topic.id, 
                              updates: { is_hidden: !topic.is_hidden } 
                            })}
                            title={topic.is_hidden 
                              ? (language === 'fr' ? 'Afficher' : 'Show') 
                              : (language === 'fr' ? 'Cacher' : 'Hide')}
                          >
                            {topic.is_hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
