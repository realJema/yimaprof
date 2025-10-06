import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Save, Upload, User, Mail, Phone, BookOpen, Globe } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  class_level?: string;
  preferred_language?: string;
  profile_photo_url?: string;
}

export default function Profile() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to fetch profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, profile_photo_url: publicUrl } : null);

      toast({
        title: 'Success',
        description: 'Profile photo updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          class_level: profile.class_level,
          preferred_language: profile.preferred_language,
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof UserProfile, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('error')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Header */}
      <div className="bg-gradient-hero text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-primary-foreground/20 shadow-strong">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="text-4xl bg-primary-foreground/10">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-primary-foreground/80 mb-3">{profile.email}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {profile.class_level && (
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {profile.class_level}
                  </Badge>
                )}
                {profile.preferred_language && (
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                    <Globe className="h-3 w-3 mr-1" />
                    {profile.preferred_language === 'fr' ? 'Français' : 'English'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 -mt-8">
        <Card className="border-border/50 bg-card shadow-strong">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {t('personal_info')}
            </CardTitle>
            <CardDescription>Update your personal details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {t('first_name')}
                </Label>
                <Input
                  id="firstName"
                  value={profile.first_name || ''}
                  onChange={(e) => updateProfile('first_name', e.target.value)}
                  className="border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {t('last_name')}
                </Label>
                <Input
                  id="lastName"
                  value={profile.last_name || ''}
                  onChange={(e) => updateProfile('last_name', e.target.value)}
                  className="border-border/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ''}
                disabled
                className="bg-muted border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {t('phone')}
              </Label>
              <Input
                id="phone"
                value={profile.phone || ''}
                onChange={(e) => updateProfile('phone', e.target.value)}
                className="border-border/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="classLevel" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {t('class_level')}
                </Label>
                <Select
                  value={profile.class_level || ''}
                  onValueChange={(value) => updateProfile('class_level', value)}
                >
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_6e">{t('class_6e')}</SelectItem>
                    <SelectItem value="class_5e">{t('class_5e')}</SelectItem>
                    <SelectItem value="class_4e">{t('class_4e')}</SelectItem>
                    <SelectItem value="class_3e">{t('class_3e')}</SelectItem>
                    <SelectItem value="class_2nd">{t('class_2nd')}</SelectItem>
                    <SelectItem value="class_1ere">{t('class_1ere')}</SelectItem>
                    <SelectItem value="class_tle">{t('class_tle')}</SelectItem>
                    <SelectItem value="form_1">{t('form_1')}</SelectItem>
                    <SelectItem value="form_2">{t('form_2')}</SelectItem>
                    <SelectItem value="form_3">{t('form_3')}</SelectItem>
                    <SelectItem value="form_4">{t('form_4')}</SelectItem>
                    <SelectItem value="form_5">{t('form_5')}</SelectItem>
                    <SelectItem value="lower_sixth">{t('lower_sixth')}</SelectItem>
                    <SelectItem value="upper_sixth">{t('upper_sixth')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Preferred Language
                </Label>
                <Select
                  value={profile.preferred_language || 'fr'}
                  onValueChange={(value) => updateProfile('preferred_language', value)}
                >
                  <SelectTrigger className="border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full md:w-auto gradient-primary text-primary-foreground shadow-medium hover:shadow-strong transition-all"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : t('save_changes')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}