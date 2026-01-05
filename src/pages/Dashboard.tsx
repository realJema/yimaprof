import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BookOpen, 
  TrendingUp, 
  CheckCircle, 
  Crown, 
  Edit, 
  Upload, 
  Mail, 
  Activity, 
  CreditCard, 
  ClipboardCheck,
  Bell,
  Settings,
  User,
  BarChart3,
  GraduationCap,
  Trophy,
  Target,
  Clock,
  ArrowRight,
  Sparkles,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifications, unreadCount } = useNotifications();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [userEvaluations, setUserEvaluations] = useState<any[]>([]);
  const [totalExamsCount, setTotalExamsCount] = useState(0);
  const [stats, setStats] = useState({
    examsCompleted: 0,
    totalPoints: 0,
    studyStreak: 7,
    avgScore: 0,
    totalTimeSpent: 0
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

      // Get total exams count
      const { count: examsCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);
      
      setTotalExamsCount(examsCount || 0);

      // Fetch user evaluations
      const { data: evaluationsData } = await supabase
        .from('user_evaluations')
        .select(`
          *,
          exams (
            title,
            subjects:subject_id (name, name_en, name_fr),
            classes (display_name)
          )
        `)
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false })
        .limit(10);
      
      setUserEvaluations(evaluationsData || []);

      // Calculate real stats from evaluations
      const totalEvaluations = evaluationsData?.length || 0;
      const totalPoints = evaluationsData?.reduce((sum, e) => sum + (e.mcq_score || 0), 0) || 0;
      const totalTimeSpent = evaluationsData?.reduce((sum, e) => sum + (e.time_spent_seconds || 0), 0) || 0;
      const avgScore = totalEvaluations > 0 
        ? Math.round(evaluationsData!.reduce((sum, e) => sum + (e.mcq_total > 0 ? (e.mcq_score / e.mcq_total) * 100 : 0), 0) / totalEvaluations)
        : 0;

      setStats({
        examsCompleted: totalEvaluations,
        totalPoints,
        studyStreak: 7,
        avgScore,
        totalTimeSpent
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
    if (hour < 12) return language === 'fr' ? 'Bonjour' : 'Good morning';
    if (hour < 18) return language === 'fr' ? 'Bon après-midi' : 'Good afternoon';
    return language === 'fr' ? 'Bonsoir' : 'Good evening';
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

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const progressPercentage = totalExamsCount > 0 
    ? Math.round((stats.examsCompleted / totalExamsCount) * 100) 
    : 0;

  const quickAccessLinks = [
    { icon: BookOpen, label: language === 'fr' ? 'Examens' : 'Exams', href: '/exams', color: 'text-blue-500' },
    { icon: BarChart3, label: language === 'fr' ? 'Analytique' : 'Analytics', href: '/dashboard', color: 'text-purple-500' },
    { icon: User, label: language === 'fr' ? 'Profil' : 'Profile', href: '/settings', color: 'text-green-500' },
    { icon: Settings, label: language === 'fr' ? 'Paramètres' : 'Settings', href: '/settings', color: 'text-orange-500' },
  ];

  const motivationalMessages = [
    { fr: "Continuez comme ça ! Chaque examen vous rapproche de votre objectif.", en: "Keep it up! Every exam brings you closer to your goal." },
    { fr: "La pratique rend parfait. Vous faites un excellent travail !", en: "Practice makes perfect. You're doing great!" },
    { fr: "Votre progression est impressionnante. Continuez d'apprendre !", en: "Your progress is impressive. Keep learning!" },
  ];

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <div className="bg-gradient-subtle min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
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
                            {language === 'fr' ? 'Mettez à jour vos informations personnelles' : 'Update your personal information'}
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
                            {saving ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : (language === 'fr' ? 'Enregistrer' : 'Save')}
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

        {/* Motivational Message */}
        <Card className="mb-8 border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-soft">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-muted-foreground">
                {language === 'fr' ? randomMessage.fr : randomMessage.en}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Examens Complétés' : 'Exams Completed'}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.examsCompleted}</h3>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Points Totaux' : 'Total Points'}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.totalPoints}</h3>
                </div>
                <Trophy className="h-10 w-10 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Score Moyen' : 'Average Score'}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{stats.avgScore}%</h3>
                </div>
                <Target className="h-10 w-10 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Temps d\'étude' : 'Study Time'}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-2">{formatTimeSpent(stats.totalTimeSpent)}</h3>
                </div>
                <Clock className="h-10 w-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Progress Overview */}
          <Card className="lg:col-span-2 border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {language === 'fr' ? 'Progression' : 'Progress Overview'}
              </CardTitle>
              <CardDescription>
                {language === 'fr' ? 'Votre parcours d\'apprentissage' : 'Your learning journey'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === 'fr' ? 'Examens terminés' : 'Exams completed'}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {stats.examsCompleted} / {totalExamsCount}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {progressPercentage}% {language === 'fr' ? 'complété' : 'completed'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="font-medium text-foreground">
                      {language === 'fr' ? 'Série d\'étude' : 'Study Streak'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.studyStreak} {language === 'fr' ? 'jours' : 'days'}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'fr' ? 'Continuez ainsi !' : 'Keep it up!'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-foreground">
                      {language === 'fr' ? 'Performance' : 'Performance'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgScore >= 50 ? '👍' : '📈'} {stats.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.avgScore >= 70 
                      ? (language === 'fr' ? 'Excellent !' : 'Excellent!') 
                      : stats.avgScore >= 50 
                        ? (language === 'fr' ? 'Bien !' : 'Good!') 
                        : (language === 'fr' ? 'Continuez à pratiquer' : 'Keep practicing')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {language === 'fr' ? 'Accès Rapide' : 'Quick Access'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickAccessLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                    <span className="font-medium text-foreground">{link.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {language === 'fr' ? 'Notifications' : 'Notifications'}
                </div>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg transition-colors ${
                        notification.is_read ? 'bg-muted/20' : 'bg-primary/5 border-l-2 border-primary'
                      }`}
                    >
                      <p className="font-medium text-sm text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/notifications">
                      {language === 'fr' ? 'Voir tout' : 'View All'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'fr' ? 'Aucune notification' : 'No notifications'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {language === 'fr' ? 'Abonnement' : 'Subscription'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Plan actuel' : 'Current Plan'}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {subscription.subscription_plans?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Statut' : 'Status'}
                    </p>
                    <Badge variant="default" className="mt-1">
                      {subscription.status === 'active' 
                        ? (language === 'fr' ? 'Actif' : 'Active') 
                        : subscription.status}
                    </Badge>
                  </div>
                  {subscription.expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'fr' ? 'Expire le' : 'Expires'}
                      </p>
                      <p className="text-sm font-medium">
                        {format(new Date(subscription.expires_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/subscriptions">
                      {language === 'fr' ? 'Gérer' : 'Manage'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    {language === 'fr' ? 'Pas d\'abonnement actif' : 'No active subscription'}
                  </p>
                  <Button asChild>
                    <Link to="/subscriptions">
                      {language === 'fr' ? 'Voir les plans' : 'Browse Plans'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Evaluations */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                {language === 'fr' ? 'Évaluations Récentes' : 'Recent Evaluations'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userEvaluations.length > 0 ? (
                <div className="space-y-3">
                  {userEvaluations.slice(0, 4).map((evaluation) => (
                    <Link
                      key={evaluation.id}
                      to={`/exam/${evaluation.exam_id}`}
                      className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {evaluation.exams?.title || 'Untitled'}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(evaluation.completed_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge 
                          variant={evaluation.mcq_total > 0 && (evaluation.mcq_score / evaluation.mcq_total) >= 0.5 ? "default" : "secondary"}
                        >
                          {evaluation.mcq_total > 0 
                            ? `${Math.round((evaluation.mcq_score / evaluation.mcq_total) * 100)}%`
                            : 'N/A'
                          }
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/exams">
                      {language === 'fr' ? 'Passer un examen' : 'Take an Exam'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'fr' ? 'Aucune évaluation' : 'No evaluations yet'}</p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/exams">
                      {language === 'fr' ? 'Commencer' : 'Start Now'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
