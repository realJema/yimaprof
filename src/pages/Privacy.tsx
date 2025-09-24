import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">{t('privacy_policy')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('privacy_last_updated')}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_introduction_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('privacy_introduction')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_data_collection_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('privacy_data_collection')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('privacy_data_personal')}</li>
                <li>{t('privacy_data_academic')}</li>
                <li>{t('privacy_data_usage')}</li>
                <li>{t('privacy_data_technical')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_data_use_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('privacy_data_use')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('privacy_use_service')}</li>
                <li>{t('privacy_use_personalization')}</li>
                <li>{t('privacy_use_communication')}</li>
                <li>{t('privacy_use_improvement')}</li>
                <li>{t('privacy_use_security')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_data_sharing_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{t('privacy_data_sharing')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('privacy_sharing_consent')}</li>
                <li>{t('privacy_sharing_legal')}</li>
                <li>{t('privacy_sharing_partners')}</li>
                <li>{t('privacy_sharing_business')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_security_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('privacy_security')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_rights_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('privacy_rights')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('privacy_right_access')}</li>
                <li>{t('privacy_right_rectification')}</li>
                <li>{t('privacy_right_erasure')}</li>
                <li>{t('privacy_right_portability')}</li>
                <li>{t('privacy_right_objection')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_cookies_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('privacy_cookies')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_changes_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('privacy_changes')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_contact_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {t('privacy_contact')}
              </p>
              <div className="text-muted-foreground">
                <p>Email: privacy@yima.cm</p>
                <p>Adresse: Yaoundé, Cameroun</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}