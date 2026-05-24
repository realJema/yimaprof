import { useLanguage } from '@/contexts/LanguageContext';
import SeoHead from '@/components/SeoHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen py-12 px-4">
      <SeoHead
        title="Conditions d'utilisation — Yimaprof"
        description="Conditions générales d'utilisation de Yimaprof : droits, obligations et règles d'usage de la plateforme de préparation aux examens."
        path="/terms"
      />
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">{t('terms_of_service')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('terms_last_updated')}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('terms_acceptance_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_acceptance')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_description_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_user_accounts_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('terms_user_accounts')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('terms_account_accuracy')}</li>
                <li>{t('terms_account_security')}</li>
                <li>{t('terms_account_responsibility')}</li>
                <li>{t('terms_account_age')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_use_rules_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('terms_use_rules')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('terms_rule_legal')}</li>
                <li>{t('terms_rule_respect')}</li>
                <li>{t('terms_rule_no_sharing')}</li>
                <li>{t('terms_rule_no_reverse')}</li>
                <li>{t('terms_rule_no_automated')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_intellectual_property_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_intellectual_property')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_subscriptions_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t('terms_subscriptions')}</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>{t('terms_subscription_billing')}</li>
                <li>{t('terms_subscription_renewal')}</li>
                <li>{t('terms_subscription_cancellation')}</li>
                <li>{t('terms_subscription_refund')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_termination_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_termination')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_disclaimer_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_disclaimer')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_limitation_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_limitation')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_governing_law_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_governing_law')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_changes_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('terms_changes')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('terms_contact_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {t('terms_contact')}
              </p>
              <div className="text-muted-foreground">
                <p>Email: legal@yima.cm</p>
                <p>Adresse: Yaoundé, Cameroun</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}