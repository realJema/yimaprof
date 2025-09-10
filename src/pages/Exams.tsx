import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Exam {
  id: string;
  title: string;
  subject: string;
  year?: number;
  period?: string;
  exam_type?: string;
  description?: string;
  class_level?: string;
  language?: string;
  created_at: string;
}

const FRANCOPHONE_CLASSES = [
  { id: 'class_6e', name: 'class_6e' },
  { id: 'class_5e', name: 'class_5e' },
  { id: 'class_4e', name: 'class_4e' },
  { id: 'class_3e', name: 'class_3e' },
  { id: 'class_2nd', name: 'class_2nd' },
  { id: 'class_1ere', name: 'class_1ere' },
  { id: 'class_tle', name: 'class_tle' },
];

const ANGLOPHONE_CLASSES = [
  { id: 'form_1', name: 'form_1' },
  { id: 'form_2', name: 'form_2' },
  { id: 'form_3', name: 'form_3' },
  { id: 'form_4', name: 'form_4' },
  { id: 'form_5', name: 'form_5' },
  { id: 'lower_sixth', name: 'lower_sixth' },
  { id: 'upper_sixth', name: 'upper_sixth' },
];

type ViewType = 'sections' | 'classes' | 'exams';

export default function Exams() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>('sections');
  const [selectedSection, setSelectedSection] = useState<'francophone' | 'anglophone' | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExams = async (classLevel: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('class_level', classLevel)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = (section: 'francophone' | 'anglophone') => {
    setSelectedSection(section);
    setCurrentView('classes');
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setCurrentView('exams');
    fetchExams(classId);
  };

  const handleBack = () => {
    if (currentView === 'exams') {
      setCurrentView('classes');
      setSelectedClass(null);
    } else if (currentView === 'classes') {
      setCurrentView('sections');
      setSelectedSection(null);
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSections = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground mb-8">{t('exams')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:bg-card/90 transition-colors border-border/50 bg-card/80 backdrop-blur-sm"
          onClick={() => handleSectionSelect('francophone')}
        >
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('francophone')}
            </CardTitle>
            <CardDescription>
              Classes de la 6ème à la Terminale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              7 niveaux disponibles • {language === 'fr' ? 'Système français' : 'French system'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-card/90 transition-colors border-border/50 bg-card/80 backdrop-blur-sm"
          onClick={() => handleSectionSelect('anglophone')}
        >
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('anglophone')}
            </CardTitle>
            <CardDescription>
              Form 1 to Upper Sixth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              7 levels available • {language === 'fr' ? 'Système anglais' : 'English system'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderClasses = () => {
    const classes = selectedSection === 'francophone' ? FRANCOPHONE_CLASSES : ANGLOPHONE_CLASSES;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {t(selectedSection!)}
          </h1>
        </div>

        <p className="text-muted-foreground">{t('select_class')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classItem) => (
            <Card 
              key={classItem.id}
              className="cursor-pointer hover:bg-card/90 transition-colors border-border/50 bg-card/80 backdrop-blur-sm"
              onClick={() => handleClassSelect(classItem.id)}
            >
              <CardHeader>
                <CardTitle className="text-card-foreground text-lg">
                  {t(classItem.name)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' ? 'Examens disponibles' : 'Available exams'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderExams = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {selectedClass && t(selectedClass)}
        </h1>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('no_exams')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
              <CardHeader>
                <CardTitle className="text-card-foreground text-lg line-clamp-2">
                  {exam.title}
                </CardTitle>
                <CardDescription>
                  {exam.subject} • {exam.year} • {exam.period}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {exam.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {exam.description}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Button size="sm" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {language === 'fr' ? 'Voir' : 'View'}
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {t('download')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto">
        {currentView === 'sections' && renderSections()}
        {currentView === 'classes' && renderClasses()}
        {currentView === 'exams' && renderExams()}
      </div>
    </div>
  );
}