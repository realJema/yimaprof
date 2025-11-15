import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Calendar, Plus } from 'lucide-react';

interface Period {
  id: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  order_number: number | null;
  is_active: boolean | null;
  created_at: string;
}

export function PeriodManagement() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Period | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    name_fr: '',
    order_number: 1,
    is_active: true,
  });

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('order_number');

      if (error) throw error;
      setPeriods(data || []);
    } catch (error) {
      console.error('Error fetching periods:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch periods',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('periods')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Period updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('periods')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Period created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: '', name_en: '', name_fr: '', order_number: 1, is_active: true });
      fetchPeriods();
    } catch (error) {
      console.error('Error saving period:', error);
      toast({
        title: 'Error',
        description: 'Failed to save period',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Period) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      name_en: item.name_en || '',
      name_fr: item.name_fr || '',
      order_number: item.order_number || 1,
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Period) => {
    if (!confirm('Are you sure you want to delete this period?')) return;

    try {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setPeriods(prev => prev.filter(p => p.id !== item.id));
      toast({
        title: 'Success',
        description: 'Period deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting period:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete period',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { key: 'order_number', label: 'Order' },
    { key: 'name', label: 'Name' },
    { key: 'name_en', label: 'Name (EN)' },
    { key: 'name_fr', label: 'Name (FR)' },
    { 
      key: 'is_active', 
      label: 'Active',
      render: (value: boolean) => value ? '✓' : '✗'
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Periods / Semesters
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', name_en: '', name_fr: '', order_number: 1, is_active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Period' : 'Add New Period'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name (Default)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_en">Name (English)</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="name_fr">Name (French)</Label>
                <Input
                  id="name_fr"
                  value={formData.name_fr}
                  onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="order_number">Order Number</Label>
                <Input
                  id="order_number"
                  type="number"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={periods}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
