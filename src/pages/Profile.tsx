import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Save, Upload } from 'lucide-react';

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB limit)
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
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Update local state
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
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('profile')}</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Photo */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground">Profile Photo</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="text-2xl">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF. Max 5MB.
              </p>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground">{t('personal_info')}</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('first_name')}</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name || ''}
                    onChange={(e) => updateProfile('first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('last_name')}</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name || ''}
                    onChange={(e) => updateProfile('last_name', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={profile.phone || ''}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classLevel">{t('class_level')}</Label>
                <Select
                  value={profile.class_level || ''}
                  onValueChange={(value) => updateProfile('class_level', value)}
                >
                  <SelectTrigger>
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
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={profile.preferred_language || 'fr'}
                  onValueChange={(value) => updateProfile('preferred_language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : t('save_changes')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}