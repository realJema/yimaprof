import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, CreditCard, TrendingUp, Eye, Building } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalExams: number;
  totalSubscriptions: number;
  totalRevenue: number;
  activeUsers: number;
  totalClasses: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalExams: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    activeUsers: 0,
    totalClasses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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

      // Fetch class count
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      // Fetch active subscriptions
      const { count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Calculate revenue
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select(`
          subscription_plans (price)
        `)
        .eq('status', 'active');

      const totalRevenue = subscriptions?.reduce((sum, sub) => {
        return sum + (sub.subscription_plans?.price || 0);
      }, 0) || 0;

      // Count users with recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUserCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      setStats({
        totalUsers: userCount || 0,
        totalExams: examCount || 0,
        totalSubscriptions: subscriptionCount || 0,
        totalRevenue: totalRevenue,
        activeUsers: activeUserCount || 0,
        totalClasses: classCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
      title: 'Total Classes',
      value: stats.totalClasses.toLocaleString(),
      icon: Building,
      description: 'Available classes',
      color: 'text-purple-600',
    },
    {
      title: 'Active Subscriptions',
      value: stats.totalSubscriptions.toLocaleString(),
      icon: CreditCard,
      description: 'Paying subscribers',
      color: 'text-orange-600',
    },
    {
      title: 'Revenue',
      value: `${stats.totalRevenue.toLocaleString()} XOF`,
      icon: TrendingUp,
      description: 'Total revenue',
      color: 'text-emerald-600',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      icon: Eye,
      description: 'Active last 30 days',
      color: 'text-indigo-600',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
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
  );
}