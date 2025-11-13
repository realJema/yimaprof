import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddNewItemDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, translations?: { en: string; fr: string }) => Promise<void>;
  title: string;
  fieldLabel: string;
  requiresTranslation?: boolean;
  isYear?: boolean;
  isDuration?: boolean;
}

export const AddNewItemDialog = ({ 
  open, 
  onClose, 
  onAdd, 
  title, 
  fieldLabel,
  requiresTranslation = false,
  isYear = false,
  isDuration = false
}: AddNewItemDialogProps) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) return;
    
    setLoading(true);
    try {
      if (requiresTranslation) {
        await onAdd(name, { en: nameEn, fr: nameFr });
      } else {
        await onAdd(name);
      }
      onClose();
      setName('');
      setNameEn('');
      setNameFr('');
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setNameEn('');
    setNameFr('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{fieldLabel}</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isYear 
                  ? "2025-2026" 
                  : isDuration 
                  ? "120" 
                  : `Enter ${fieldLabel.toLowerCase()}`
              }
              type={isDuration ? "number" : "text"}
            />
          </div>
          
          {requiresTranslation && (
            <>
              <div>
                <Label>{t('examEnglishName')}</Label>
                <Input 
                  value={nameEn} 
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="English name"
                />
              </div>
              <div>
                <Label>{t('examFrenchName')}</Label>
                <Input 
                  value={nameFr} 
                  onChange={(e) => setNameFr(e.target.value)}
                  placeholder="Nom français"
                />
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name}>
              {t('add_new')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
