import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp, 
  Settings,
  FileText,
  Download,
  Eye,
  Shield,
  BarChart3
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalExams: number;
  totalSubscriptions: number;
  totalRevenue: number;
  activeUsers: number;
  downloadsThisMonth: number;
}

export default function Admin() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalExams: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    activeUsers: 0,
    downloadsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (error || profile?.role !== 'admin') {
        throw new Error('Access denied');
      }

      fetchStats();
    } catch (error) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges',
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch exam count
      const { count: examCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true });

      // Fetch active subscriptions
      const { count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate revenue (mock calculation)
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          subscription_plans (price)
        `)
        .eq('status', 'active');

      const totalRevenue = subscriptions?.reduce((sum, sub) => {
        return sum + (sub.subscription_plans?.price || 0);
      }, 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalExams: examCount || 0,
        totalSubscriptions: subscriptionCount || 0,
        totalRevenue: totalRevenue / 100, // Convert from cents
        activeUsers: Math.floor((userCount || 0) * 0.3), // Mock 30% active
        downloadsThisMonth: Math.floor((examCount || 0) * 2.5), // Mock downloads
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to access admin panel</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: 'Registered users',
      color: 'text-blue-600',
    },
    {
      title: 'Total Exams',
      value: stats.totalExams.toLocaleString(),
      icon: BookOpen,
      description: 'Available exam papers',
      color: 'text-green-600',
    },
    {
      title: 'Active Subscriptions',
      value: stats.totalSubscriptions.toLocaleString(),
      icon: CreditCard,
      description: 'Paying subscribers',
      color: 'text-purple-600',
    },
    {
      title: 'Revenue',
      value: `${stats.totalRevenue.toLocaleString()} XAF`,
      icon: TrendingUp,
      description: 'Total revenue',
      color: 'text-orange-600',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Eye,
      description: 'Active this month',
      color: 'text-indigo-600',
    },
    {
      title: 'Downloads',
      value: stats.downloadsThisMonth.toLocaleString(),
      icon: Download,
      description: 'This month',
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Platform management and analytics
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-border/50 bg-card/80 backdrop-blur-sm">
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

        {/* Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
                  <CardDescription>Latest platform activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        New user registration
                      </p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        New subscription activated
                      </p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        New exam uploaded
                      </p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Add New Exam
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Platform Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-card-foreground">User Management</CardTitle>
                <CardDescription>Manage registered users and their permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">User management interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-card-foreground">Exam Management</CardTitle>
                <CardDescription>Add, edit, and manage exam content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Exam management interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-card-foreground">Platform Settings</CardTitle>
                <CardDescription>Configure platform-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Platform settings interface would be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}