import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, TrendingUp, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [stats, setStats] = useState({
    examsCompleted: 0,
    totalExams: 0,
    studyStreak: 0,
    avgScore: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(profileData);

      // Fetch subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (name, features)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();
      
      setSubscription(subscriptionData);

      // Fetch recent exams
      const { data: examsData } = await supabase
        .from('exams')
        .select(`
          *,
          classes (display_name, level)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentExams(examsData || []);

      // Mock stats for now - in a real app, you'd calculate these from actual user data
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email?.split('@')[0] || 'Student';
  };

  const dashboardStats = [
    {
      title: 'Exams Completed',
      value: stats.examsCompleted.toString(),
      description: 'This month',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Available Exams',
      value: stats.totalExams.toString(),
      description: 'Across all subjects',
      icon: BookOpen,
      color: 'text-blue-600'
    },
    {
      title: 'Study Streak',
      value: `${stats.studyStreak} days`,
      description: 'Keep it up!',
      icon: TrendingUp,
      color: 'text-orange-600'
    },
    {
      title: 'Average Score',
      value: `${stats.avgScore}%`,
      description: 'Last 10 exams',
      icon: Users,
      color: 'text-purple-600'
    },
  ];

  return (
    <div className="bg-gradient-subtle p-6 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {getGreeting()}, {getUserName()}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Exams */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Exams
              </CardTitle>
              <CardDescription>Latest exams available for practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentExams.length > 0 ? (
                recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {exam.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam.subject} • {exam.classes?.display_name}
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={`/exam/${exam.id}?mode=preview`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No exams available yet.</p>
              )}
              <Button asChild className="w-full">
                <Link to="/exams">Browse All Exams</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Subscription Status
              </CardTitle>
              <CardDescription>Your current plan and benefits</CardDescription>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-card-foreground">Plan</span>
                    <span className="text-sm text-primary font-medium">
                      {subscription.subscription_plans?.name || 'Premium'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-card-foreground">Status</span>
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-card-foreground">Expires</span>
                    <span className="text-sm text-muted-foreground">
                      {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Access Level</span>
                      <span className="text-xs text-green-600">Full Access</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/subscriptions">Manage Subscription</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-card-foreground mb-1">No Active Subscription</p>
                    <p className="text-xs text-muted-foreground">
                      Subscribe to access exam corrections and premium features
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/subscriptions">View Plans</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Link to="/exams">
                  <BookOpen className="h-6 w-6" />
                  <span>Browse Exams</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Link to="/profile">
                  <Users className="h-6 w-6" />
                  <span>Update Profile</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                <Link to="/subscriptions">
                  <Calendar className="h-6 w-6" />
                  <span>Subscription</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}