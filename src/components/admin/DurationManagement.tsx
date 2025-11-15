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
import { Clock, Plus } from 'lucide-react';

interface Duration {
  id: string;
  display_label: string;
  minutes: number;
  is_active: boolean | null;
  created_at: string;
}

export function DurationManagement() {
  const [durations, setDurations] = useState<Duration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Duration | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    display_label: '',
    minutes: 60,
    is_active: true,
  });

  useEffect(() => {
    fetchDurations();
  }, []);

  const fetchDurations = async () => {
    try {
      const { data, error } = await supabase
        .from('durations')
        .select('*')
        .order('minutes');

      if (error) throw error;
      setDurations(data || []);
    } catch (error) {
      console.error('Error fetching durations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch durations',
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
          .from('durations')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Duration updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('durations')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Duration created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ display_label: '', minutes: 60, is_active: true });
      fetchDurations();
    } catch (error) {
      console.error('Error saving duration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save duration',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Duration) => {
    setEditingItem(item);
    setFormData({
      display_label: item.display_label,
      minutes: item.minutes,
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Duration) => {
    if (!confirm('Are you sure you want to delete this duration?')) return;

    try {
      const { error } = await supabase
        .from('durations')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setDurations(prev => prev.filter(d => d.id !== item.id));
      toast({
        title: 'Success',
        description: 'Duration deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting duration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete duration',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { key: 'display_label', label: 'Label' },
    { 
      key: 'minutes', 
      label: 'Minutes',
      render: (value: number) => `${value} min`
    },
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
          <Clock className="h-5 w-5" />
          Durations
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ display_label: '', minutes: 60, is_active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Duration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Duration' : 'Add New Duration'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="display_label">Display Label (e.g., 2 hours)</Label>
                <Input
                  id="display_label"
                  value={formData.display_label}
                  onChange={(e) => setFormData({ ...formData, display_label: e.target.value })}
                  placeholder="2 hours"
                  required
                />
              </div>
              <div>
                <Label htmlFor="minutes">Minutes</Label>
                <Input
                  id="minutes"
                  type="number"
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) })}
                  min="1"
                  required
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
          data={durations}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
