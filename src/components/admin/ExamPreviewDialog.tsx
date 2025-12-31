import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamContentRenderer } from '@/components/exam/ExamContentRenderer';
import { useExamFormData } from '@/hooks/useExamFormData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Eye, FileText, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';

interface ClassItem {
  id: string;
  display_name: string;
  section: string;
}

interface ExamPreviewDialogProps {
  exam: {
    id: string;
    title: string;
    description?: string;
    is_published: boolean;
    language?: string;
    class_id?: string;
    subject_id?: string;
    exam_type_id?: string;
    academic_year_id?: string;
    period_id?: string;
    establishment_id?: string;
    duration_id?: string;
    content?: any;
    classes?: { display_name: string; section: string };
    subjects?: { name: string; name_en: string; name_fr: string };
    exam_types?: { name: string; name_en: string; name_fr: string };
    academic_years?: { year_label: string };
    periods?: { name: string; name_en: string; name_fr: string };
    establishments?: { name: string };
    durations?: { display_label: string; minutes: number };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function ExamPreviewDialog({ exam, open, onOpenChange, onUpdated }: ExamPreviewDialogProps) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const formOptions = useExamFormData();
  
  // Fetch classes separately
  const { data: classes } = useQuery<ClassItem[]>({
    queryKey: ['classes-for-preview'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('id, display_name, section').order('display_name');
      if (error) throw error;
      return data as ClassItem[];
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_published: false,
    language: 'fr',
    class_id: '',
    subject_id: '',
    exam_type_id: '',
    academic_year_id: '',
    period_id: '',
    establishment_id: '',
    duration_id: '',
  });

  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title || '',
        description: exam.description || '',
        is_published: exam.is_published || false,
        language: exam.language || 'fr',
        class_id: exam.class_id || '',
        subject_id: exam.subject_id || '',
        exam_type_id: exam.exam_type_id || '',
        academic_year_id: exam.academic_year_id || '',
        period_id: exam.period_id || '',
        establishment_id: exam.establishment_id || '',
        duration_id: exam.duration_id || '',
      });
    }
  }, [exam]);

  const handleSave = async () => {
    if (!exam) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          title: formData.title,
          description: formData.description,
          is_published: formData.is_published,
          language: formData.language,
          class_id: formData.class_id || null,
          subject_id: formData.subject_id || null,
          exam_type_id: formData.exam_type_id || null,
          academic_year_id: formData.academic_year_id || null,
          period_id: formData.period_id || null,
          establishment_id: formData.establishment_id || null,
          duration_id: formData.duration_id || null,
        })
        .eq('id', exam.id);

      if (error) throw error;

      toast({ title: t('success'), description: t('exam_details_updated') || 'Exam details updated successfully' });
      onUpdated?.();
    } catch (error) {
      console.error('Error updating exam:', error);
      toast({ title: t('error'), description: t('failed_update_exam') || 'Failed to update exam details', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Group classes by section
  const classesBySection = classes?.reduce((acc, cls) => {
    const section = cls.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(cls);
    return acc;
  }, {} as Record<string, ClassItem[]>);

  if (!exam) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {t('exam_preview') || 'Exam Preview'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('details') || 'Details'}
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <Eye className="h-4 w-4" />
              {t('content') || 'Content'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4 pr-2">
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('title') || 'Title'}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('description') || 'Description'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Two column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject */}
                <div className="space-y-2">
                  <Label>{t('subject') || 'Subject'}</Label>
                  <Select value={formData.subject_id} onValueChange={(v) => setFormData(prev => ({ ...prev, subject_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_subject') || 'Select subject'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.subjects?.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {language === 'fr' ? subject.name_fr || subject.name : subject.name_en || subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class */}
                <div className="space-y-2">
                  <Label>{t('class_filter') || 'Class'}</Label>
                  <Select value={formData.class_id} onValueChange={(v) => setFormData(prev => ({ ...prev, class_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_class') || 'Select class'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesBySection && Object.entries(classesBySection).map(([section, classes]) => (
                        <SelectGroup key={section}>
                          <SelectLabel>{section}</SelectLabel>
                          {classes?.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.display_name}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Type */}
                <div className="space-y-2">
                  <Label>{t('exam_type') || 'Exam Type'}</Label>
                  <Select value={formData.exam_type_id} onValueChange={(v) => setFormData(prev => ({ ...prev, exam_type_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_exam_type') || 'Select exam type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.examTypes?.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {language === 'fr' ? type.name_fr || type.name : type.name_en || type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period */}
                <div className="space-y-2">
                  <Label>{t('period') || 'Period'}</Label>
                  <Select value={formData.period_id} onValueChange={(v) => setFormData(prev => ({ ...prev, period_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_period') || 'Select period'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.periods?.map(period => (
                        <SelectItem key={period.id} value={period.id}>
                          {language === 'fr' ? period.name_fr || period.name : period.name_en || period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Academic Year */}
                <div className="space-y-2">
                  <Label>{t('academic_year') || 'Academic Year'}</Label>
                  <Select value={formData.academic_year_id} onValueChange={(v) => setFormData(prev => ({ ...prev, academic_year_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_year') || 'Select year'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.academicYears?.map(year => (
                        <SelectItem key={year.id} value={year.id}>{year.year_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>{t('duration') || 'Duration'}</Label>
                  <Select value={formData.duration_id} onValueChange={(v) => setFormData(prev => ({ ...prev, duration_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_duration') || 'Select duration'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formOptions.durations?.map(duration => (
                        <SelectItem key={duration.id} value={duration.id}>{duration.display_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Establishment */}
                <div className="space-y-2">
                  <Label>{t('school_filter') || 'School'}</Label>
                  <Select value={formData.establishment_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, establishment_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_school') || 'Select school'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('no_school') || 'No school'}</SelectItem>
                      {formOptions.establishments?.map(est => (
                        <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>{t('language_filter') || 'Language'}</Label>
                  <Select value={formData.language} onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Published Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <Label>{t('published') || 'Published'}</Label>
                  <p className="text-sm text-muted-foreground">{t('publish_description') || 'Make this exam visible to students'}</p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('save_changes') || 'Save Changes'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="flex-1 overflow-y-auto mt-4 pr-2">
            {exam.content ? (
              <ExamContentRenderer content={exam.content} showAnswers={true} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('no_content') || 'No content available'}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
