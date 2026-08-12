import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstablishment } from '@/hooks/useEstablishment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SeoHead from '@/components/SeoHead';
import SchoolOverview from '@/components/school/SchoolOverview';
import SchoolStudents from '@/components/school/SchoolStudents';
import SchoolClasses from '@/components/school/SchoolClasses';
import SchoolChallenges from '@/components/school/SchoolChallenges';
import SchoolRevenue from '@/components/school/SchoolRevenue';
import SchoolJourney from '@/components/school/SchoolJourney';
import SchoolResults from '@/components/school/SchoolResults';
import { Building2 } from 'lucide-react';

export default function SchoolSpace() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { establishment, isSchoolAdmin, loading } = useEstablishment();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!establishment || !isSchoolAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">{fr ? 'Aucun espace établissement associé à ce compte' : 'No establishment space linked to this account'}</p>
            <Button asChild><Link to="/schools">{fr ? 'Inscrire mon établissement' : 'Register my school'}</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { value: 'overview', label: fr ? 'Tableau de bord' : 'Dashboard' },
    { value: 'students', label: fr ? 'Élèves' : 'Students' },
    { value: 'classes', label: fr ? 'Classes' : 'Classes' },
    { value: 'challenges', label: 'Challenges' },
    { value: 'journey', label: fr ? 'Parcours' : 'Journey' },
    { value: 'results', label: fr ? 'Résultats' : 'Results' },
    { value: 'revenue', label: fr ? 'Revenus' : 'Revenue' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SeoHead
        title={`${establishment.name} | ${fr ? 'Espace Établissement' : 'Establishment Space'} | Yimaprof`}
        description={fr ? 'Tableau de bord de votre établissement sur Yimaprof.' : 'Your school dashboard on Yimaprof.'}
        path="/school"
      />

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-secondary" />
          {establishment.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
          {establishment.city && <span>{establishment.city}</span>}
          {establishment.referral_code && <Badge variant="outline" className="font-mono">{establishment.referral_code}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <TabsList className="inline-flex w-max">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="whitespace-nowrap">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <SchoolOverview establishmentId={establishment.id} referralCode={establishment.referral_code} />
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <SchoolStudents establishmentId={establishment.id} />
        </TabsContent>
        <TabsContent value="classes" className="mt-6">
          <SchoolClasses establishmentId={establishment.id} />
        </TabsContent>
        <TabsContent value="challenges" className="mt-6">
          <SchoolChallenges establishmentId={establishment.id} />
        </TabsContent>
        <TabsContent value="journey" className="mt-6">
          <SchoolJourney establishmentId={establishment.id} />
        </TabsContent>
        <TabsContent value="results" className="mt-6">
          <SchoolResults establishmentId={establishment.id} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <SchoolRevenue establishmentId={establishment.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}