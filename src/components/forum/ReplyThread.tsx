import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThumbsUp, MessageSquare, ChevronDown, ChevronUp, Trash2, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ReplyForm from './ReplyForm';
import { cn } from '@/lib/utils';

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

interface ReplyThreadProps {
  reply: Reply;
  getChildren: (parentId: string) => Reply[];
  topicId: string;
  isClosed: boolean;
  isAdmin: boolean;
  onReply: (content: string, parentId: string) => void;
}

export default function ReplyThread({ 
  reply, 
  getChildren, 
  topicId, 
  isClosed, 
  isAdmin,
  onReply 
}: ReplyThreadProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const children = getChildren(reply.id);
  const likeCount = reply.reactions?.filter(r => r.reaction_type === 'like').length || 0;
  const hasLiked = reply.reactions?.some(r => r.user_id === user?.id && r.reaction_type === 'like');

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (hasLiked) {
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('reply_id', reply.id)
          .eq('user_id', user?.id)
          .eq('reaction_type', 'like');
      } else {
        await supabase
          .from('forum_reactions')
          .insert({
            reply_id: reply.id,
            user_id: user?.id,
            reaction_type: 'like'
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', topicId] });
    }
  });

  const deleteReply = useMutation({
    mutationFn: async () => {
      await supabase
        .from('forum_replies')
        .update({ is_deleted: true })
        .eq('id', reply.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', topicId] });
      toast.success(language === 'fr' ? 'Réponse supprimée' : 'Reply deleted');
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

  const getAuthorName = () => {
    if (reply.author?.username) return `@${reply.author.username}`;
    if (reply.author?.first_name) return reply.author.first_name;
    return language === 'fr' ? 'Anonyme' : 'Anonymous';
  };

  const handleReplySubmit = (content: string) => {
    onReply(content, reply.id);
    setIsReplying(false);
  };

  if (reply.is_deleted) {
    return (
      <div className={cn("pl-4 border-l-2 border-muted", reply.depth > 0 && "ml-4")}>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-sm text-muted-foreground italic">
            {language === 'fr' ? '[Réponse supprimée]' : '[Reply deleted]'}
          </CardContent>
        </Card>
        {children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map(child => (
              <ReplyThread
                key={child.id}
                reply={child}
                getChildren={getChildren}
                topicId={topicId}
                isClosed={isClosed}
                isAdmin={isAdmin}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(reply.depth > 0 && "ml-4 pl-4 border-l-2 border-muted")}>
      <Card>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <User className="h-3 w-3" />
                {getAuthorName()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(reply.created_at)}
              </span>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteReply.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content */}
          <p className="text-sm whitespace-pre-wrap mb-3">{reply.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1", hasLiked && "text-primary")}
              onClick={() => user && toggleLike.mutate()}
              disabled={!user}
            >
              <ThumbsUp className="h-4 w-4" />
              {likeCount > 0 && <span>{likeCount}</span>}
            </Button>

            {user && !isClosed && reply.depth < 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageSquare className="h-4 w-4" />
                {language === 'fr' ? 'Répondre' : 'Reply'}
              </Button>
            )}

            {children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 ml-auto"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {children.length} {language === 'fr' ? 'réponses' : 'replies'}
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 pt-3 border-t">
              <ReplyForm 
                onSubmit={handleReplySubmit}
                onCancel={() => setIsReplying(false)}
                isSubmitting={false}
                placeholder={language === 'fr' ? `Répondre à ${getAuthorName()}...` : `Reply to ${getAuthorName()}...`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {children.length > 0 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="mt-2 space-y-2">
            {children.map(child => (
              <ReplyThread
                key={child.id}
                reply={child}
                getChildren={getChildren}
                topicId={topicId}
                isClosed={isClosed}
                isAdmin={isAdmin}
                onReply={onReply}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
