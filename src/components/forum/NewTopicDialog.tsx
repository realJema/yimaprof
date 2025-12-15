import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface NewTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewTopicDialog({ open, onOpenChange, onSuccess }: NewTopicDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const createTopic = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('forum_topics')
        .insert({
          title: title.trim(),
          content: content.trim(),
          author_id: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'fr' ? 'Sujet créé avec succès' : 'Topic created successfully');
      setTitle('');
      setContent('');
      onSuccess();
    },
    onError: (error) => {
      console.error('Error creating topic:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la création du sujet' : 'Failed to create topic');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(language === 'fr' ? 'Veuillez remplir tous les champs' : 'Please fill in all fields');
      return;
    }
    createTopic.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Nouveau sujet de discussion' : 'New Discussion Topic'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {language === 'fr' ? 'Titre' : 'Title'}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'fr' ? 'Ex: Comment résoudre les équations du second degré ?' : 'Ex: How to solve quadratic equations?'}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">
              {language === 'fr' ? 'Description' : 'Description'}
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={language === 'fr' ? 'Décrivez votre question ou sujet de discussion...' : 'Describe your question or discussion topic...'}
              rows={5}
              maxLength={5000}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={createTopic.isPending}>
              {createTopic.isPending 
                ? (language === 'fr' ? 'Création...' : 'Creating...') 
                : (language === 'fr' ? 'Créer le sujet' : 'Create Topic')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
