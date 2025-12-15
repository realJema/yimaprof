import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Loader2,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface AffiliateApplication {
  id: string;
  user_id: string;
  status: string;
  rejection_reason: string | null;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profile: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  };
}

interface AffiliateWithEarnings {
  id: string;
  user_id: string;
  applied_at: string;
  profile: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  };
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  referral_count: number;
}

export function AffiliateManagement() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('applications');
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateWithEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<AffiliateApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    pendingApplications: 0,
    totalEarningsPaid: 0,
    totalEarningsPending: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApplications(),
      fetchAffiliates(),
      fetchStats(),
    ]);
    setLoading(false);
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select(`
          *,
          profile:profiles!affiliate_applications_user_id_fkey(
            email,
            first_name,
            last_name,
            username
          )
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications((data as unknown as AffiliateApplication[]) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchAffiliates = async () => {
    try {
      // Get approved affiliates
      const { data: approvedApps, error: appsError } = await supabase
        .from('affiliate_applications')
        .select(`
          id,
          user_id,
          applied_at,
          profile:profiles!affiliate_applications_user_id_fkey(
            email,
            first_name,
            last_name,
            username
          )
        `)
        .eq('status', 'approved');

      if (appsError) throw appsError;

      // Get earnings for each affiliate
      const affiliatesWithEarnings: AffiliateWithEarnings[] = [];
      
      for (const app of approvedApps || []) {
        const { data: earnings } = await supabase
          .from('affiliate_earnings')
          .select('amount, status')
          .eq('affiliate_id', app.user_id);

        const total = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const pending = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0;
        const paid = earnings?.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0) || 0;

        affiliatesWithEarnings.push({
          ...(app as unknown as Omit<AffiliateWithEarnings, 'total_earnings' | 'pending_earnings' | 'paid_earnings' | 'referral_count'>),
          total_earnings: total,
          pending_earnings: pending,
          paid_earnings: paid,
          referral_count: earnings?.length || 0,
        });
      }

      setAffiliates(affiliatesWithEarnings);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Count approved affiliates
      const { count: approvedCount } = await supabase
        .from('affiliate_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Count pending applications
      const { count: pendingCount } = await supabase
        .from('affiliate_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get total earnings
      const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('amount, status');

      const paid = earnings?.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0) || 0;
      const pending = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0;

      setStats({
        totalAffiliates: approvedCount || 0,
        pendingApplications: pendingCount || 0,
        totalEarningsPaid: paid,
        totalEarningsPending: pending,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (application: AffiliateApplication) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr' ? 'Candidature approuvée' : 'Application approved',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('affiliate_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedApplication.id);

      if (error) throw error;

      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr' ? 'Candidature rejetée' : 'Application rejected',
      });

      setShowRejectDialog(false);
      setSelectedApplication(null);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredAffiliates = affiliates.filter(aff =>
    aff.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aff.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aff.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aff.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{language === 'fr' ? 'Approuvé' : 'Approved'}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{language === 'fr' ? 'En attente' : 'Pending'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{language === 'fr' ? 'Rejeté' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'fr' ? fr : enUS,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{language === 'fr' ? 'Gestion des Affiliés' : 'Affiliate Management'}</h2>
        <p className="text-muted-foreground">
          {language === 'fr' ? 'Gérez les candidatures et les affiliés' : 'Manage applications and affiliates'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Affiliés Actifs' : 'Active Affiliates'}</p>
                <p className="text-2xl font-bold text-primary">{stats.totalAffiliates}</p>
              </div>
              <UserCheck className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'En Attente' : 'Pending'}</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingApplications}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Total Payé' : 'Total Paid'}</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalEarningsPaid.toLocaleString()} XOF</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'fr' ? 'En Attente' : 'Pending'}</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalEarningsPending.toLocaleString()} XOF</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'fr' ? 'Rechercher par nom, email ou username...' : 'Search by name, email or username...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {activeTab === 'applications' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={language === 'fr' ? 'Filtrer par statut' : 'Filter by status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
              <SelectItem value="pending">{language === 'fr' ? 'En attente' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{language === 'fr' ? 'Approuvé' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{language === 'fr' ? 'Rejeté' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications" className="gap-2">
            <Clock className="h-4 w-4" />
            {language === 'fr' ? 'Candidatures' : 'Applications'}
            {stats.pendingApplications > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.pendingApplications}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-2">
            <Users className="h-4 w-4" />
            {language === 'fr' ? 'Affiliés' : 'Affiliates'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Candidatures' : 'Applications'}</CardTitle>
              <CardDescription>
                {language === 'fr' ? 'Examinez et gérez les candidatures d\'affiliation' : 'Review and manage affiliate applications'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'fr' ? 'Aucune candidature trouvée' : 'No applications found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'fr' ? 'Candidat' : 'Applicant'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Username' : 'Username'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Date' : 'Date'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {app.profile?.first_name || app.profile?.last_name 
                                  ? `${app.profile.first_name || ''} ${app.profile.last_name || ''}`.trim()
                                  : 'N/A'}
                              </p>
                              <p className="text-sm text-muted-foreground">{app.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {app.profile?.username ? (
                              <Badge variant="outline">@{app.profile.username}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(app.applied_at)}
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {app.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(app)}
                                  disabled={processing}
                                  className="gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {language === 'fr' ? 'Approuver' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowRejectDialog(true);
                                  }}
                                  disabled={processing}
                                  className="gap-1"
                                >
                                  <XCircle className="h-3 w-3" />
                                  {language === 'fr' ? 'Rejeter' : 'Reject'}
                                </Button>
                              </div>
                            )}
                            {app.status === 'rejected' && app.rejection_reason && (
                              <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={app.rejection_reason}>
                                {app.rejection_reason}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliates" className="mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Affiliés Actifs' : 'Active Affiliates'}</CardTitle>
              <CardDescription>
                {language === 'fr' ? 'Affiliés approuvés et leurs gains' : 'Approved affiliates and their earnings'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAffiliates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'fr' ? 'Aucun affilié trouvé' : 'No affiliates found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'fr' ? 'Affilié' : 'Affiliate'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Filleuls' : 'Referrals'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Total Gains' : 'Total Earnings'}</TableHead>
                        <TableHead>{language === 'fr' ? 'En Attente' : 'Pending'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Payé' : 'Paid'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Inscrit' : 'Joined'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAffiliates.map((aff) => (
                        <TableRow key={aff.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {aff.profile?.username ? `@${aff.profile.username}` : 
                                  (aff.profile?.first_name || aff.profile?.last_name 
                                    ? `${aff.profile.first_name || ''} ${aff.profile.last_name || ''}`.trim()
                                    : 'N/A')}
                              </p>
                              <p className="text-sm text-muted-foreground">{aff.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{aff.referral_count}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {aff.total_earnings.toLocaleString()} XOF
                          </TableCell>
                          <TableCell className="text-amber-600">
                            {aff.pending_earnings.toLocaleString()} XOF
                          </TableCell>
                          <TableCell className="text-green-600">
                            {aff.paid_earnings.toLocaleString()} XOF
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(aff.applied_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'fr' ? 'Rejeter la candidature' : 'Reject Application'}</DialogTitle>
            <DialogDescription>
              {language === 'fr' 
                ? 'Vous pouvez optionnellement fournir une raison pour le rejet.'
                : 'You can optionally provide a reason for the rejection.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'fr' ? 'Raison (optionnel)' : 'Reason (optional)'}
              </label>
              <Textarea
                placeholder={language === 'fr' ? 'Expliquez pourquoi la candidature est rejetée...' : 'Explain why the application is rejected...'}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : language === 'fr' ? 'Confirmer le rejet' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
