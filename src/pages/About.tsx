import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Globe, Target } from 'lucide-react';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">{t('about_title')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('about_description')}
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">{t('our_mission')}</h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-lg text-muted-foreground text-center">
                {t('mission_description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('our_values')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-2">{t('excellence')}</h3>
                <p className="text-sm text-muted-foreground">{t('excellence_desc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-2">{t('accessibility')}</h3>
                <p className="text-sm text-muted-foreground">{t('accessibility_desc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Globe className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-2">{t('diversity')}</h3>
                <p className="text-sm text-muted-foreground">{t('diversity_desc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-2">{t('innovation')}</h3>
                <p className="text-sm text-muted-foreground">{t('innovation_desc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">{t('our_story')}</h2>
          <Card>
            <CardContent className="p-8">
              <p className="text-lg text-muted-foreground mb-6">
                {t('story_paragraph_1')}
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                {t('story_paragraph_2')}
              </p>
              <p className="text-lg text-muted-foreground">
                {t('story_paragraph_3')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">{t('join_us')}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('join_us_description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">{t('get_started_free')}</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/contact">{t('contact_us')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}