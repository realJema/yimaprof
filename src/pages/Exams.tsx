import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Calendar, Users, Lock, Crown, Search } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Exam {
  id: string;
  title: string;
  subject: string;
  description?: string;
  duration_minutes?: number;
  year?: number;
  period?: string;
  exam_type?: string;
  tags?: string[];
  created_at: string;
  classes?: {
    display_name: string;
    level: string;
    section: string;
  };
}

interface Subscription {
  id: string;
  status: string;
  expires_at: string;
  plan_id: string;
  subscription_plans: {
    name: string;
    max_downloads?: number;
  };
}

export default function Exams() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  useEffect(() => {
    fetchExams();
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          classes (
            display_name,
            level,
            section
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible de charger les examens" : "Failed to load exams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    if (!user) {
      setHasSubscription(false);
      return;
    }
    
    try {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setHasSubscription(true);
        return;
      }

      // Check for active subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            max_downloads
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
      setHasSubscription(!!data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setHasSubscription(false);
    }
  };

  const subjects = [...new Set(exams.map(exam => exam.subject))];
  const years = [...new Set(exams.map(exam => exam.year).filter(Boolean))].sort((a, b) => b - a);
  const levels = [...new Set(exams.map(exam => exam.classes?.level).filter(Boolean))];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || !selectedSubject || exam.subject === selectedSubject;
    const matchesYear = selectedYear === 'all' || !selectedYear || exam.year?.toString() === selectedYear;
    const matchesLevel = selectedLevel === 'all' || !selectedLevel || exam.classes?.level === selectedLevel;
    
    return matchesSearch && matchesSubject && matchesYear && matchesLevel;
  });

  const hasActiveSubscription = subscription && new Date(subscription.expires_at) > new Date();
  const freeExamsLimit = 3;
  const displayedExams = hasActiveSubscription ? filteredExams : filteredExams.slice(0, freeExamsLimit);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {language === 'fr' ? 'Examens' : 'Exams'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'fr' 
            ? 'Découvrez notre collection d\'examens classés par matière, niveau et année.'
            : 'Discover our collection of exams organized by subject, level, and year.'
          }
        </p>
        
        {!hasActiveSubscription && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                {language === 'fr' ? 'Accès Limité' : 'Limited Access'}
              </h3>
            </div>
            <p className="text-amber-700 text-sm mb-3">
              {language === 'fr' 
                ? `Vous pouvez voir ${freeExamsLimit} examens gratuitement. Abonnez-vous pour un accès illimité à tous les examens et corrections.`
                : `You can view ${freeExamsLimit} exams for free. Subscribe for unlimited access to all exams and corrections.`
              }
            </p>
            <Link to="/subscriptions">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                <Crown className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Voir les Abonnements' : 'View Subscriptions'}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={language === 'fr' ? 'Rechercher des examens...' : 'Search exams...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={language === 'fr' ? 'Matière' : 'Subject'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Toutes les matières' : 'All subjects'}</SelectItem>
            {subjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full md:w-32">
            <SelectValue placeholder={language === 'fr' ? 'Année' : 'Year'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-full md:w-32">
            <SelectValue placeholder={language === 'fr' ? 'Niveau' : 'Level'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
            {levels.map(level => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exams Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayedExams.map((exam) => (
          <Card key={exam.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary">{exam.subject}</Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(exam.created_at).getFullYear()}
                </span>
              </div>
              <CardTitle className="line-clamp-2">{exam.title}</CardTitle>
              {exam.description && (
                <CardDescription className="line-clamp-2">
                  {exam.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {exam.classes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {exam.classes.display_name} ({exam.classes.level} - {exam.classes.section})
                  </div>
                )}
                {exam.duration_minutes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    {exam.duration_minutes} {language === 'fr' ? 'minutes' : 'minutes'}
                  </div>
                )}
                {exam.year && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {exam.year}
                  </div>
                )}
              </div>
              
              {exam.tags && exam.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {exam.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Link to={`/exam/${exam.id}?mode=preview`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Aperçu' : 'Preview'}
                  </Button>
                </Link>
                <Link to={`/exam/${exam.id}?mode=evaluation`} className="flex-1">
                  <Button className="w-full">
                    {language === 'fr' ? 'Passer l\'examen' : 'Take Exam'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!hasActiveSubscription && filteredExams.length > freeExamsLimit && (
          <Card className="hover:shadow-lg transition-shadow border-dashed border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Lock className="h-12 w-12 text-amber-600 mb-4" />
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                {language === 'fr' ? 'Plus d\'examens disponibles' : 'More exams available'}
              </h3>
              <p className="text-amber-700 text-sm mb-4">
                {language === 'fr' 
                  ? `${filteredExams.length - freeExamsLimit} examens supplémentaires sont disponibles avec un abonnement.`
                  : `${filteredExams.length - freeExamsLimit} additional exams are available with a subscription.`
                }
              </p>
              <Link to="/subscriptions">
                <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                  <Crown className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'S\'abonner maintenant' : 'Subscribe Now'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      
      {hasActiveSubscription && (
        <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">
              {language === 'fr' ? 'Accès Premium' : 'Premium Access'}
            </h3>
          </div>
          <p className="text-green-700 text-sm">
            {language === 'fr' 
              ? `Vous avez accès à tous les ${filteredExams.length} examens disponibles avec votre abonnement ${subscription.subscription_plans.name}.`
              : `You have access to all ${filteredExams.length} available exams with your ${subscription.subscription_plans.name} subscription.`
            }
          </p>
        </div>
      )}

      {displayedExams.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            {language === 'fr' ? 'Aucun examen trouvé' : 'No exams found'}
          </p>
        </div>
      )}
    </div>
  );
}