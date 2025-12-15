import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ReplyFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  placeholder?: string;
}

export default function ReplyForm({ onSubmit, onCancel, isSubmitting, placeholder }: ReplyFormProps) {
  const { language } = useLanguage();
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || (language === 'fr' ? 'Écrivez votre réponse...' : 'Write your reply...')}
        rows={3}
        maxLength={5000}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting 
            ? (language === 'fr' ? 'Envoi...' : 'Sending...') 
            : (language === 'fr' ? 'Envoyer' : 'Send')}
        </Button>
      </div>
    </form>
  );
}
