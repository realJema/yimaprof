import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { CreditCard, Plus, Edit, Trash2 } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  max_downloads: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function SubscriptionPlanManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    price_trimester: 0,
    price_annual: 0,
    currency: 'XOF',
    duration_days: 30,
    features: '',
    max_downloads: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price');

      if (error) throw error;
      const processedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string)
      }));
      setPlans(processedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subscription plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const featuresArray = formData.features.split('\n').filter(f => f.trim());
      
      const planData = {
        ...formData,
        features: featuresArray,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subscription plan updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([planData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subscription plan created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        price_trimester: 0,
        price_annual: 0,
        currency: 'XOF',
        duration_days: 30,
        features: '',
        max_downloads: 0,
        is_active: true,
      });
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subscription plan',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    const planAny = plan as any;
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      price_trimester: planAny.price_trimester || Math.floor(plan.price * 3 * 0.9),
      price_annual: planAny.price_annual || Math.floor(plan.price * 9 * 0.8),
      currency: plan.currency,
      duration_days: plan.duration_days,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      max_downloads: plan.max_downloads,
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm('Are you sure you want to delete this subscription plan? This will affect all associated subscriptions.')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;

      setPlans(prev => prev.filter(p => p.id !== plan.id));
      toast({
        title: 'Success',
        description: 'Subscription plan deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subscription plan',
        variant: 'destructive',
      });
    }
  };

  const toggleActiveStatus = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;

      setPlans(prev => prev.map(p => 
        p.id === plan.id ? { ...p, is_active: !p.is_active } : p
      ));

      toast({
        title: 'Success',
        description: `Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating plan status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan status',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
    },
    {
      key: 'price',
      label: 'Monthly',
      render: (value: number, plan: SubscriptionPlan) => 
        `${value.toLocaleString()} ${plan.currency}`,
    },
    {
      key: 'price_trimester',
      label: 'Trimester',
      render: (value: number, plan: SubscriptionPlan) => {
        const planAny = plan as any;
        const price = planAny.price_trimester || Math.floor(plan.price * 3 * 0.9);
        return `${price.toLocaleString()} ${plan.currency}`;
      },
    },
    {
      key: 'price_annual',
      label: 'Annual',
      render: (value: number, plan: SubscriptionPlan) => {
        const planAny = plan as any;
        const price = planAny.price_annual || Math.floor(plan.price * 9 * 0.8);
        return `${price.toLocaleString()} ${plan.currency}`;
      },
    },
    {
      key: 'duration_days',
      label: 'Duration',
      render: (value: number) => `${value} days`,
    },
    {
      key: 'max_downloads',
      label: 'Max Downloads',
      render: (value: number) => value === 999999 ? 'Unlimited' : value.toLocaleString(),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'features',
      label: 'Features',
      render: (features: string[]) => (
        <div className="max-w-xs">
          {features?.slice(0, 2).map((feature, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              • {feature}
            </div>
          ))}
          {features?.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{features.length - 2} more
            </div>
          )}
        </div>
      ),
    },
  ];

  const actions = (plan: SubscriptionPlan) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleActiveStatus(plan)}
      >
        {plan.is_active ? 'Deactivate' : 'Activate'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(plan)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(plan)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Plan Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Francophone"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Plan description..."
                    required
                  />
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XOF">XOF</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="duration_days">Base Duration (days)</Label>
                      <Input
                        id="duration_days"
                        type="number"
                        value={formData.duration_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Monthly Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price_trimester">Trimester Price (3 mo)</Label>
                      <Input
                        id="price_trimester"
                        type="number"
                        value={formData.price_trimester}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_trimester: parseInt(e.target.value) || 0 }))}
                        placeholder="Auto: -10%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price_annual">Annual Price (9 mo)</Label>
                      <Input
                        id="price_annual"
                        type="number"
                        value={formData.price_annual}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_annual: parseInt(e.target.value) || 0 }))}
                        placeholder="Auto: -20%"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave trimester/annual empty to auto-calculate: Trimester = monthly × 3 × 0.9, Annual = monthly × 9 × 0.8
                  </p>
                </div>
                <div>
                  <Label htmlFor="max_downloads">Max Downloads (999999 for unlimited)</Label>
                  <Input
                    id="max_downloads"
                    type="number"
                    value={formData.max_downloads}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_downloads: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="features">Features (one per line)</Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                    placeholder="Access to French curriculum exams&#10;View corrections and solutions&#10;Download exam papers"
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit">
                    {editingPlan ? 'Update' : 'Create'} Plan
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={plans}
          columns={columns}
          searchKey="name"
          actions={actions}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}