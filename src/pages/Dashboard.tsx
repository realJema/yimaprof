import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Download, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    {
      title: t('my_downloads'),
      value: '24',
      description: '+12% from last month',
      icon: Download,
    },
    {
      title: 'Exams Available',
      value: '156',
      description: 'Across all subjects',
      icon: BookOpen,
    },
    {
      title: 'Study Time',
      value: '12h',
      description: 'This week',
      icon: TrendingUp,
    },
    {
      title: 'Class Rank',
      value: '#3',
      description: 'In your class',
      icon: Users,
    },
  ];

  return (
    <div className="bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('welcome')} back!
          </h1>
          <p className="text-muted-foreground">
            Here's your learning progress overview
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
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
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground">{t('recent_activity')}</CardTitle>
              <CardDescription>Your latest study activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Downloaded Mathematics exam
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Completed Physics correction
                  </p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Reviewed Chemistry notes
                  </p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-card-foreground">{t('subscription_status')}</CardTitle>
              <CardDescription>Your current plan details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-card-foreground">Plan</span>
                  <span className="text-sm text-primary">Premium Monthly</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-card-foreground">Status</span>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-card-foreground">Renewal</span>
                  <span className="text-sm text-muted-foreground">March 15, 2024</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  75% of monthly downloads used
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}