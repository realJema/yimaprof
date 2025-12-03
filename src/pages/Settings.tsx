import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { 
  Bell, 
  Globe, 
  Lock, 
  Shield,
  User,
  Settings as SettingsIcon,
  GraduationCap,
  Save,
  Camera,
  Loader2
} from 'lucide-react';

interface NotificationPreferences {
  email_enabled: boolean;
  email_subscription_expiry: boolean;
  email_payment_confirmed: boolean;
  email_admin_messages: boolean;
  inapp_subscription_expiry: boolean;
  inapp_payment_confirmed: boolean;
  inapp_admin_messages: boolean;
  inapp_account_activity: boolean;
}

type SettingsSection = 'profile' | 'notifications' | 'security';

export default function Settings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('fr');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    email_enabled: true,
    email_subscription_expiry: true,
    email_payment_confirmed: true,
    email_admin_messages: true,
    inapp_subscription_expiry: true,
    inapp_payment_confirmed: true,
    inapp_admin_messages: true,
    inapp_account_activity: true,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, phone, class_level, preferred_language, profile_photo_url')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setUsername(profileData.username || '');
        setPhone(profileData.phone || '');
        setClassLevel(profileData.class_level || '');
        setPreferredLanguage(profileData.preferred_language || 'fr');
        setProfilePhotoUrl(profileData.profile_photo_url);
      }

      const { data: notifData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (notifData) {
        setNotifPrefs({
          email_enabled: notifData.email_enabled ?? true,
          email_subscription_expiry: notifData.email_subscription_expiry ?? true,
          email_payment_confirmed: notifData.email_payment_confirmed ?? true,
          email_admin_messages: notifData.email_admin_messages ?? true,
          inapp_subscription_expiry: notifData.inapp_subscription_expiry ?? true,
          inapp_payment_confirmed: notifData.inapp_payment_confirmed ?? true,
          inapp_admin_messages: notifData.inapp_admin_messages ?? true,
          inapp_account_activity: notifData.inapp_account_activity ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('error'),
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('error'),
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfilePhotoUrl(publicUrl);
      toast({
        title: t('success'),
        description: 'Profile photo updated',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveAccountSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          phone,
          class_level: classLevel,
          preferred_language: preferredLanguage,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(notifPrefs)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Notification preferences updated',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Lock },
  ];

  const getInitials = () => {
    if (username) return username.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            {t('settings')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account preferences
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <Card className="lg:w-64 h-fit lg:sticky lg:top-6 border-border/50 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <nav className="flex lg:flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Right Content */}
          <div className="flex-1 space-y-6">
            {activeSection === 'profile' && (
              <>
                {/* Profile Photo */}
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Camera className="h-5 w-5 text-primary" />
                      Profile Photo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarImage src={profilePhotoUrl || undefined} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Change Photo
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Settings */}
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5 text-primary" />
                      Account Information
                    </CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Your username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+237 6XX XXX XXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="class_level" className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Class Level
                        </Label>
                        <Select value={classLevel} onValueChange={setClassLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6eme">6ème</SelectItem>
                            <SelectItem value="5eme">5ème</SelectItem>
                            <SelectItem value="4eme">4ème</SelectItem>
                            <SelectItem value="3eme">3ème</SelectItem>
                            <SelectItem value="seconde">Seconde</SelectItem>
                            <SelectItem value="premiere">Première</SelectItem>
                            <SelectItem value="terminale">Terminale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferred_language" className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Content Language
                        </Label>
                        <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
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

                    <Button onClick={handleSaveAccountSettings} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Interface Language */}
                <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <div>
                          <Label className="font-medium">{t('interfaceLanguage')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('chooseInterfaceLanguage')}
                          </p>
                        </div>
                      </div>
                      <LanguageSwitcher />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === 'notifications' && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Notifications */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <h4 className="font-semibold text-sm">Email Notifications</h4>
                      <Switch
                        checked={notifPrefs.email_enabled}
                        onCheckedChange={(checked) =>
                          setNotifPrefs({ ...notifPrefs, email_enabled: checked })
                        }
                      />
                    </div>
                    
                    {notifPrefs.email_enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <Label className="text-sm">Subscription Expiry</Label>
                          <Switch
                            checked={notifPrefs.email_subscription_expiry}
                            onCheckedChange={(checked) =>
                              setNotifPrefs({ ...notifPrefs, email_subscription_expiry: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <Label className="text-sm">Payment Confirmations</Label>
                          <Switch
                            checked={notifPrefs.email_payment_confirmed}
                            onCheckedChange={(checked) =>
                              setNotifPrefs({ ...notifPrefs, email_payment_confirmed: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <Label className="text-sm">Admin Messages</Label>
                          <Switch
                            checked={notifPrefs.email_admin_messages}
                            onCheckedChange={(checked) =>
                              setNotifPrefs({ ...notifPrefs, email_admin_messages: checked })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* In-App Notifications */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm py-2 border-b border-border">In-App Notifications</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <Label className="text-sm">Subscription Expiry</Label>
                        <Switch
                          checked={notifPrefs.inapp_subscription_expiry}
                          onCheckedChange={(checked) =>
                            setNotifPrefs({ ...notifPrefs, inapp_subscription_expiry: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <Label className="text-sm">Payments</Label>
                        <Switch
                          checked={notifPrefs.inapp_payment_confirmed}
                          onCheckedChange={(checked) =>
                            setNotifPrefs({ ...notifPrefs, inapp_payment_confirmed: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <Label className="text-sm">Admin Messages</Label>
                        <Switch
                          checked={notifPrefs.inapp_admin_messages}
                          onCheckedChange={(checked) =>
                            setNotifPrefs({ ...notifPrefs, inapp_admin_messages: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <Label className="text-sm">Account Activity</Label>
                        <Switch
                          checked={notifPrefs.inapp_account_activity}
                          onCheckedChange={(checked) =>
                            setNotifPrefs({ ...notifPrefs, inapp_account_activity: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveNotificationPrefs} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="h-5 w-5 text-primary" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="font-medium">Change Password</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Update your password regularly
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Shield className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="font-medium">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add extra security layer
                      </p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Shield className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
