import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Receipt } from 'lucide-react';

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

export function TransactionViewer() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
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
      render: (value: string) => (
        <Badge variant={getProviderVariant(value)}>
          {value.toUpperCase()}
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
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={transactions}
          columns={columns}
          searchKey="id"
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}