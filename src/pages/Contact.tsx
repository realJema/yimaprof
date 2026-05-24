import { useLanguage } from '@/contexts/LanguageContext';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Contact() {
  const { t } = useLanguage();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [1, 2, 3].map((n) => ({
      "@type": "Question",
      name: t(`faq_${n}_question`),
      acceptedAnswer: { "@type": "Answer", text: t(`faq_${n}_answer`) },
    })),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    console.log('Contact form submitted');
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <SeoHead
        title="Contact — Yimaprof"
        description="Contactez l'équipe Yimaprof : support, questions et partenariats pour la préparation aux examens officiels du Cameroun."
        path="/contact"
        jsonLd={faqSchema}
      />
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">{t('contact_us')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('contact_description')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('send_message')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('first_name')}</Label>
                      <Input id="firstName" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('last_name')}</Label>
                      <Input id="lastName" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input id="email" type="email" required />
                  </div>
                  <div>
                    <Label htmlFor="subject">{t('subject')}</Label>
                    <Input id="subject" required />
                  </div>
                  <div>
                    <Label htmlFor="message">{t('message')}</Label>
                    <Textarea id="message" rows={6} required />
                  </div>
                  <Button type="submit" className="w-full">
                    {t('send_message')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('contact_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">{t('email')}</h3>
                    <p className="text-muted-foreground">contact@yima.cm</p>
                    <p className="text-muted-foreground">support@yima.cm</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Phone className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">{t('phone')}</h3>
                    <p className="text-muted-foreground">+237 6XX XX XX XX</p>
                    <p className="text-muted-foreground">+237 6XX XX XX XX</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">{t('address')}</h3>
                    <p className="text-muted-foreground">
                      Yaoundé, Cameroun<br />
                      Douala, Cameroun
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">{t('hours')}</h3>
                    <p className="text-muted-foreground">{t('support_hours')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('faq_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{t('faq_1_question')}</h3>
                    <p className="text-sm text-muted-foreground">{t('faq_1_answer')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('faq_2_question')}</h3>
                    <p className="text-sm text-muted-foreground">{t('faq_2_answer')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('faq_3_question')}</h3>
                    <p className="text-sm text-muted-foreground">{t('faq_3_answer')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}