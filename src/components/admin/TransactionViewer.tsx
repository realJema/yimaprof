import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Receipt, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_reference: string;
  user_id: string;
  subscription_id: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

const isUnresolved = (status: string) => status === 'pending' || status === 'processing';

export function TransactionViewer() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related profile data separately
      const transactionsWithProfiles = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', transaction.user_id)
            .single();

          return {
            ...transaction,
            profiles: profileData
          };
        })
      );

      setTransactions(transactionsWithProfiles);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchTransactions();
    const channel = supabase.channel('admin-transaction-history')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
      }, () => { void fetchTransactions(); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void fetchTransactions();
      });
    return () => { void supabase.removeChannel(channel); };
  }, [fetchTransactions]);

  // Ask MeSomb for the real status of a stuck transaction and finalize it
  // (completed -> subscription activated, or failed). Never sends money again:
  // the edge function only looks the transaction up.
  const verifyTransaction = async (transactionId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('admin-resolve-transaction', {
      body: { action: 'verify-and-resolve', transactionId },
    });
    if (error) throw error;
    return (data?.resolution as string) || 'pending';
  };

  const handleVerifyOne = async (transactionId: string) => {
    setVerifyingIds((prev) => new Set(prev).add(transactionId));
    try {
      const resolution = await verifyTransaction(transactionId);
      toast({
        title: 'Vérification terminée',
        description:
          resolution === 'completed'
            ? 'Paiement confirmé chez MeSomb : transaction finalisée et accès activé.'
            : resolution === 'failed'
              ? 'MeSomb confirme l’échec de ce paiement.'
              : 'Paiement toujours en attente chez MeSomb.',
      });
      await fetchTransactions();
    } catch (error) {
      console.error('Verify failed:', error);
      toast({ title: 'Erreur', description: 'La vérification a échoué', variant: 'destructive' });
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
    }
  };

  const handleVerifyAll = async () => {
    const stuck = transactions.filter((t) => isUnresolved(t.status));
    if (stuck.length === 0) return;
    setBulkVerifying(true);
    let completed = 0;
    let failed = 0;
    try {
      for (const t of stuck) {
        try {
          const resolution = await verifyTransaction(t.id);
          if (resolution === 'completed') completed++;
          if (resolution === 'failed') failed++;
        } catch (e) {
          console.error('Verify failed for', t.id, e);
        }
      }
      toast({
        title: 'Revérification terminée',
        description: `${stuck.length} transaction(s) vérifiée(s) : ${completed} confirmée(s), ${failed} échouée(s), le reste encore en attente.`,
      });
      await fetchTransactions();
    } finally {
      setBulkVerifying(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'canceled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getProviderVariant = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return 'default';
      case 'paypal':
        return 'secondary';
      case 'bank_transfer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      key: 'profiles.email',
      label: 'User',
      render: (value: string, transaction: Transaction) => (
        <div>
          <div className="font-medium">{transaction.profiles?.email}</div>
          <div className="text-sm text-muted-foreground">
            {transaction.profiles?.first_name} {transaction.profiles?.last_name}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value: number, transaction: Transaction) =>
        `${value.toLocaleString()} ${transaction.currency}`,
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (value: string, transaction: Transaction) => (
        <Badge variant={getProviderVariant(value)}>
          {transaction.metadata?.service || value.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'provider_reference',
      label: 'Reference',
      render: (value: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {value || 'N/A'}
        </code>
      ),
    },
    {
      key: 'metadata.failure_reason',
      label: 'Détail',
      render: (_value: string, transaction: Transaction) => {
        const detail = transaction.metadata?.failure_reason || transaction.metadata?.mesomb_message;
        return detail ? (
          <span className="text-xs text-muted-foreground line-clamp-2 max-w-[220px] inline-block" title={detail}>
            {detail}
          </span>
        ) : null;
      },
    },
  ];

  const unresolvedCount = transactions.filter((t) => isUnresolved(t.status)).length;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Transaction History
        </CardTitle>
        {unresolvedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={bulkVerifying}
            onClick={handleVerifyAll}
          >
            <RefreshCw className={`h-4 w-4 ${bulkVerifying ? 'animate-spin' : ''}`} />
            Revérifier les {unresolvedCount} en attente
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={transactions}
          columns={columns}
          searchKey="id"
          loading={loading}
          actions={(transaction: Transaction) =>
            isUnresolved(transaction.status) ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={verifyingIds.has(transaction.id) || bulkVerifying}
                onClick={() => handleVerifyOne(transaction.id)}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${verifyingIds.has(transaction.id) ? 'animate-spin' : ''}`} />
                Revérifier
              </Button>
            ) : null
          }
        />
      </CardContent>
    </Card>
  );
}
