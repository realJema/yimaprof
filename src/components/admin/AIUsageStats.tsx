import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Bot, MessageCircle, GraduationCap, TrendingUp, AlertCircle, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, startOfMonth } from 'date-fns';

interface UsageLog {
  id: string;
  function_name: string;
  status: string;
  created_at: string;
}

const STORAGE_KEY = 'ai_usage_limits';

function getStoredLimits() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { dailyLimit: 500, monthlyLimit: 10000 };
}

export function AIUsageStats() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState(getStoredLimits);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limits));
  }, [limits]);

  const fetchLogs = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('id, function_name, status, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    
    const today = logs.filter(l => l.created_at >= todayStart);
    const thisMonth = logs.filter(l => l.created_at >= monthStart);
    const helpChat = logs.filter(l => l.function_name === 'help-chat');
    const aiGrade = logs.filter(l => l.function_name === 'ai-grade');
    const errors = logs.filter(l => l.status !== 'success');

    return {
      totalToday: today.length,
      totalMonth: thisMonth.length,
      total30Days: logs.length,
      helpChatCount: helpChat.length,
      aiGradeCount: aiGrade.length,
      errorCount: errors.length,
    };
  }, [logs]);

  const dailyPercent = limits.dailyLimit > 0 ? Math.min(100, (stats.totalToday / limits.dailyLimit) * 100) : 0;
  const monthlyPercent = limits.monthlyLimit > 0 ? Math.min(100, (stats.totalMonth / limits.monthlyLimit) * 100) : 0;

  const chartData = useMemo(() => {
    const days: Record<string, { date: string; 'help-chat': number; 'ai-grade': number }> = {};
    
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      days[d] = { date: format(subDays(new Date(), i), 'MMM dd'), 'help-chat': 0, 'ai-grade': 0 };
    }

    logs.forEach(log => {
      const d = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (days[d]) {
        const fn = log.function_name as 'help-chat' | 'ai-grade';
        if (fn in days[d]) days[d][fn]++;
      }
    });

    return Object.values(days);
  }, [logs]);

  if (loading) {
    return <p className="text-muted-foreground text-center py-8">{language === 'fr' ? 'Chargement...' : 'Loading...'}</p>;
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'text-destructive';
    if (percent >= 70) return 'text-orange-500';
    return 'text-primary';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {language === 'fr' ? 'Utilisation IA' : 'AI Usage'}
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats.totalToday}</p>
              <p className="text-xs text-muted-foreground">{language === 'fr' ? "Aujourd'hui" : 'Today'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats.total30Days}</p>
              <p className="text-xs text-muted-foreground">{language === 'fr' ? '30 derniers jours' : 'Last 30 days'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-chart-1 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats.helpChatCount}</p>
              <p className="text-xs text-muted-foreground">Help Chat</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-chart-2 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats.aiGradeCount}</p>
              <p className="text-xs text-muted-foreground">AI Grade</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold">{stats.errorCount}</p>
              <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Erreurs' : 'Errors'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Limit Monitoring */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            {language === 'fr' ? 'Suivi des limites' : 'Limit Monitoring'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {language === 'fr' ? 'Limite journalière' : 'Daily Limit'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={limits.dailyLimit}
                    onChange={(e) => setLimits((prev: typeof limits) => ({ ...prev, dailyLimit: parseInt(e.target.value) || 0 }))}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{language === 'fr' ? 'req/jour' : 'req/day'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={dailyPercent} className="h-3" />
                <div className="flex justify-between text-xs">
                  <span className={getProgressColor(dailyPercent)}>
                    {stats.totalToday} / {limits.dailyLimit}
                  </span>
                  <span className={getProgressColor(dailyPercent)}>
                    {dailyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              {dailyPercent >= 90 && (
                <Badge variant="destructive" className="text-xs">
                  {language === 'fr' ? '⚠️ Proche de la limite journalière !' : '⚠️ Near daily limit!'}
                </Badge>
              )}
              {dailyPercent >= 70 && dailyPercent < 90 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {language === 'fr' ? '⚡ 70%+ de la limite journalière' : '⚡ 70%+ of daily limit'}
                </Badge>
              )}
            </div>

            {/* Monthly Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {language === 'fr' ? 'Limite mensuelle' : 'Monthly Limit'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={limits.monthlyLimit}
                    onChange={(e) => setLimits((prev: typeof limits) => ({ ...prev, monthlyLimit: parseInt(e.target.value) || 0 }))}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{language === 'fr' ? 'req/mois' : 'req/mo'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={monthlyPercent} className="h-3" />
                <div className="flex justify-between text-xs">
                  <span className={getProgressColor(monthlyPercent)}>
                    {stats.totalMonth} / {limits.monthlyLimit}
                  </span>
                  <span className={getProgressColor(monthlyPercent)}>
                    {monthlyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              {monthlyPercent >= 90 && (
                <Badge variant="destructive" className="text-xs">
                  {language === 'fr' ? '⚠️ Proche de la limite mensuelle !' : '⚠️ Near monthly limit!'}
                </Badge>
              )}
              {monthlyPercent >= 70 && monthlyPercent < 90 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {language === 'fr' ? '⚡ 70%+ de la limite mensuelle' : '⚡ 70%+ of monthly limit'}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'fr'
              ? 'Définissez vos seuils de surveillance. Les limites sont indicatives et ne bloquent pas les requêtes.'
              : 'Set your monitoring thresholds. Limits are indicative and do not block requests.'}
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'fr' ? 'Requêtes par jour (30 derniers jours)' : 'Requests per day (last 30 days)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                {limits.dailyLimit > 0 && (
                  <ReferenceLine
                    y={limits.dailyLimit}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="5 5"
                    label={{ value: language === 'fr' ? 'Limite' : 'Limit', position: 'right', fontSize: 11, fill: 'hsl(var(--destructive))' }}
                  />
                )}
                <Bar dataKey="help-chat" name="Help Chat" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ai-grade" name="AI Grade" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
