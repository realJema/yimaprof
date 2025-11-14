import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, TrendingUp, Calendar, CheckCircle, Crown, Edit, Upload, Mail, Activity, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    examsCompleted: 0,
    totalExams: 0,
    studyStreak: 0,
    avgScore: 0
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const fetchUserData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(profileData);

      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (name, features, price, currency)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();
      
      setSubscription(subscriptionData);

      const { data: examsData } = await supabase
        .from('exams')
        .select(`
          *,
          classes (display_name, level),
          subjects:subject_id (
            name,
            name_en,
            name_fr
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentExams(examsData || []);

      setStats({
        examsCompleted: 12,
        totalExams: examsData?.length || 0,
        studyStreak: 7,
        avgScore: 85
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('error'),
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('error'),
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

      setProfile((prev: any) => prev ? { ...prev, profile_photo_url: publicUrl } : null);

      toast({
        title: t('success'),
        description: 'Profile photo updated',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setEditDialogOpen(false);

      toast({
        title: t('success'),
        description: 'Profile updated',
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('good_morning') || 'Good morning';
    if (hour < 18) return t('good_afternoon') || 'Good afternoon';
    return t('good_evening') || 'Good evening';
  };

  const getUserName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) return profile.first_name;
    return user?.email?.split('@')[0] || 'Student';
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="bg-gradient-subtle min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background">
                    <AvatarImage src={profile?.profile_photo_url} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Upload className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-1">
                        {getGreeting()}, {getUserName()}!
                      </h1>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user?.email}</span>
                      </div>
                      {profile?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <span className="text-sm">{profile.phone}</span>
                        </div>
                      )}
                    </div>

                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          {t('edit') || 'Edit'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('edit_profile') || 'Edit Profile'}</DialogTitle>
                          <DialogDescription>
                            Update your personal information
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="first_name">{t('first_name') || 'First Name'}</Label>
                            <Input
                              id="first_name"
                              value={editForm.first_name}
                              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name">{t('last_name') || 'Last Name'}</Label>
                            <Input
                              id="last_name"
                              value={editForm.last_name}
                              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">{t('phone') || 'Phone'}</Label>
                            <Input
                              id="phone"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              placeholder="+237 6XX XXX XXX"
                            />
                          </div>
                          <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                            {saving ? t('saving') || 'Saving...' : t('save_changes') || 'Save'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {subscription && (
                    <div className="mt-4">
                      <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                        <Crown className="h-3 w-3 mr-1" />
                        {subscription.subscription_plans?.name || 'Premium'} Member
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exams Completed</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.examsCompleted}</h3>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Exams</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.totalExams}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Across all subjects</p>
                </div>
                <BookOpen className="h-10 w-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.studyStreak} days</h3>
                  <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.avgScore}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">Last 10 exams</p>
                </div>
                <Activity className="h-10 w-10 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-lg font-semibold text-foreground">
                      {subscription.subscription_plans?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className="mt-1">
                      {subscription.status}
                    </Badge>
                  </div>
                  {subscription.expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className="text-sm font-medium">
                        {format(new Date(subscription.expires_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/subscriptions">Manage</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active subscription</p>
                  <Button asChild>
                    <Link to="/subscriptions">Browse Plans</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Recent Exams
              </CardTitle>
              <CardDescription>Latest exam papers</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExams.length > 0 ? (
                <div className="space-y-3">
                  {recentExams.map((exam) => (
                    <Link
                      key={exam.id}
                      to={`/exam/${exam.id}`}
                      className="block p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{exam.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {exam.classes?.display_name} • {exam.subjects ? (language === 'fr' ? exam.subjects.name_fr || exam.subjects.name : exam.subjects.name_en || exam.subjects.name) : ''}
                          </p>
                        </div>
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link to="/exams">View All</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No exams available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
