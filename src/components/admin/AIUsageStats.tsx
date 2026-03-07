import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Bot, MessageCircle, GraduationCap, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay } from 'date-fns';

interface UsageLog {
  id: string;
  function_name: string;
  status: string;
  created_at: string;
}

export function AIUsageStats() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

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
    
    const today = logs.filter(l => l.created_at >= todayStart);
    const helpChat = logs.filter(l => l.function_name === 'help-chat');
    const aiGrade = logs.filter(l => l.function_name === 'ai-grade');
    const errors = logs.filter(l => l.status !== 'success');

    return {
      totalToday: today.length,
      totalMonth: logs.length,
      helpChatCount: helpChat.length,
      aiGradeCount: aiGrade.length,
      errorCount: errors.length,
    };
  }, [logs]);

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
              <p className="text-2xl font-bold">{stats.totalMonth}</p>
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
