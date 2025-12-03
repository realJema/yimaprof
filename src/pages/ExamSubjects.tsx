import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Calculator, Beaker, Globe, History, Dna, Languages, Library } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ExamSubjects() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const schoolFilter = searchParams.get('school');
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<{ name: string; count: number }[]>([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClassAndSubjects();
  }, [classId, schoolFilter]);

  const fetchClassAndSubjects = async () => {
    try {
      setLoading(true);
      
      // Fetch class info
      const { data: classData } = await supabase
        .from('classes')
        .select('display_name')
        .eq('id', classId || '')
        .single();
      
      if (classData) {
        setClassName(classData.display_name);
      }

      // Fetch subjects with exam counts using the standardized subject_id
      let examQuery = supabase
        .from('exams')
        .select(`
          subject_id,
          subjects!inner(name, name_en, name_fr)
        `)
        .eq('class_id', classId || '')
        .eq('is_published', true);
      
      if (schoolFilter && schoolFilter !== 'all') {
        examQuery = examQuery.eq('establishment_id', schoolFilter);
      }
      
      const { data: examsData, error } = await examQuery;

      if (error) throw error;

      // Count exams per subject using subject_id
      const subjectCounts = (examsData || []).reduce((acc, exam: any) => {
        const subjectName = language === 'fr' 
          ? (exam.subjects.name_fr || exam.subjects.name)
          : (exam.subjects.name_en || exam.subjects.name);
        acc[subjectName] = (acc[subjectName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const subjectsArray = Object.entries(subjectCounts).map(([name, count]) => ({
        name,
        count
      }));

      setSubjects(subjectsArray.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de charger les matières" : "Failed to load subjects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubjectIcon = (subject: string) => {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math')) return Calculator;
    if (subjectLower.includes('physic') || subjectLower.includes('science') || subjectLower.includes('chem')) return Beaker;
    if (subjectLower.includes('geo')) return Globe;
    if (subjectLower.includes('hist')) return History;
    if (subjectLower.includes('bio')) return Dna;
    if (subjectLower.includes('eng') || subjectLower.includes('fran') || subjectLower.includes('lang')) return Languages;
    if (subjectLower.includes('lit')) return Library;
    return BookOpen;
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/exams${schoolFilter ? `?school=${schoolFilter}` : ''}`}>{language === 'fr' ? 'Classes' : 'Classes'}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{className}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'fr' ? `Choisissez votre matière pour ${className}` : `Choose your subject for ${className}`}
            </h1>
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Cliquez sur une matière pour voir les épreuves d\'examen disponibles.' : 'Click on a subject to see available exam corrections.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === 'fr' ? 'Retour' : 'Back'}
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={language === 'fr' ? 'Rechercher une matière...' : 'Search for a subject...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subjects Grid */}
        {filteredSubjects.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Aucune matière disponible.' : 'No subjects available.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* All Papers Option */}
            <Card 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10"
              onClick={() => navigate(`/exams/${classId}/list?subject=all${schoolFilter ? `&school=${schoolFilter}` : ''}`)}
            >
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mx-auto mb-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {language === 'fr' ? 'Toutes les matières' : 'All Subjects'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {subjects.reduce((sum, s) => sum + s.count, 0)} {language === 'fr' ? 'épreuves au total' : 'papers total'}
                </CardDescription>
              </CardHeader>
            </Card>
            
            {filteredSubjects.map((subject, index) => {
              const Icon = getSubjectIcon(subject.name);
              // Material colors alternating pattern
              const colorClasses = [
                'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50',
                'bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30 hover:border-green-500/50',
                'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50',
                'bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 hover:border-orange-500/50'
              ];
              const iconColors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500'];
              const colorIndex = index % 4;
              
              return (
                <Card 
                  key={subject.name}
                  className={`group cursor-pointer hover:shadow-lg transition-all duration-300 ${colorClasses[colorIndex]}`}
                  onClick={() => navigate(`/exams/${classId}/list?subject=${encodeURIComponent(subject.name)}${schoolFilter ? `&school=${schoolFilter}` : ''}`)}
                >
                  <CardHeader className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-background/50 mx-auto mb-3">
                      <Icon className={`h-6 w-6 ${iconColors[colorIndex]}`} />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {subject.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {subject.count} {language === 'fr' ? 'épreuves disponibles' : 'papers available'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
