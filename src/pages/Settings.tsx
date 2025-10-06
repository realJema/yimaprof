import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { 
  Bell, 
  Globe, 
  Lock, 
  Shield, 
  Smartphone,
  User,
  Palette
} from 'lucide-react';

export default function Settings() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Palette className="h-8 w-8 text-primary" />
              {t('settings')}
            </h1>
            <p className="text-muted-foreground">
              Customize your experience and manage preferences
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Settings */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('language_settings')}
              </CardTitle>
              <CardDescription>Choose your preferred language for the interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label htmlFor="language-switcher" className="font-medium">Interface Language</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Change the app's display language
                  </p>
                </div>
                <LanguageSwitcher />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Content Language</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preferred language for exam content
                  </p>
                </div>
                <Select defaultValue="auto">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                {t('notification_settings')}
              </CardTitle>
              <CardDescription>Manage how you receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get notified about new exams and updates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive email updates and newsletters
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Exam Reminders</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get reminded about upcoming exams
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Privacy & Security
              </CardTitle>
              <CardDescription>Protect your account and control your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add extra security to your account
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Data Analytics</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help improve the app with usage data
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
                <Lock className="h-4 w-4" />
                {t('change_password')}
              </Button>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Display Preferences
              </CardTitle>
              <CardDescription>Customize how the app looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show more content in less space
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Animations</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable smooth transitions and effects
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">High Contrast</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Improve text readability
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('account_settings')}
              </CardTitle>
              <CardDescription>Manage your account data and information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full justify-center">
                  Export My Data
                </Button>
                <Button variant="outline" className="w-full justify-center">
                  Download Account Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}