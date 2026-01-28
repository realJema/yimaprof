import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { GraduationCap, Plus } from 'lucide-react';

interface Series {
  id: string;
  code: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  system: 'francophone' | 'anglophone' | 'general';
  description: string | null;
  order_number: number;
  is_active: boolean | null;
  created_at: string;
}

export function SeriesManagement() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Series | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_en: '',
    name_fr: '',
    system: 'general' as 'francophone' | 'anglophone' | 'general',
    description: '',
    order_number: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase
        .from('series' as any)
        .select('*')
        .order('order_number');

      if (error) throw error;
      setSeries(data as unknown as Series[] || []);
    } catch (error) {
      console.error('Error fetching series:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch series',
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
          .from('series' as any)
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Series updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('series' as any)
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Series created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ 
        code: '', 
        name: '', 
        name_en: '', 
        name_fr: '', 
        system: 'general',
        description: '',
        order_number: 0,
        is_active: true 
      });
      fetchSeries();
    } catch (error) {
      console.error('Error saving series:', error);
      toast({
        title: 'Error',
        description: 'Failed to save series',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Series) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_en: item.name_en || '',
      name_fr: item.name_fr || '',
      system: item.system,
      description: item.description || '',
      order_number: item.order_number,
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Series) => {
    if (!confirm('Are you sure you want to delete this series?')) return;

    try {
      const { error } = await supabase
        .from('series' as any)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setSeries(prev => prev.filter(s => s.id !== item.id));
      toast({
        title: 'Success',
        description: 'Series deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting series:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete series',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'name_en', label: 'Name (EN)' },
    { key: 'name_fr', label: 'Name (FR)' },
    { 
      key: 'system', 
      label: 'System',
      render: (value: string) => {
        const labels: Record<string, string> = { 
          francophone: '🇫🇷 Francophone', 
          anglophone: '🇬🇧 Anglophone', 
          general: '🌐 General' 
        };
        return labels[value] || value;
      }
    },
    { key: 'order_number', label: 'Order' },
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
          <GraduationCap className="h-5 w-5" />
          Series / Tracks
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ 
                code: '', 
                name: '', 
                name_en: '', 
                name_fr: '', 
                system: 'general',
                description: '',
                order_number: series.length > 0 ? Math.max(...series.map(s => s.order_number)) + 1 : 0,
                is_active: true 
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Series
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Series' : 'Add New Series'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., C, D, S1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="system">System</Label>
                  <Select
                    value={formData.system}
                    onValueChange={(value: 'francophone' | 'anglophone' | 'general') => setFormData({ ...formData, system: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">🌐 General (All)</SelectItem>
                      <SelectItem value="francophone">🇫🇷 Francophone</SelectItem>
                      <SelectItem value="anglophone">🇬🇧 Anglophone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="name">Name (Default)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this series"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_number">Display Order</Label>
                  <Input
                    id="order_number"
                    type="number"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
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
          data={series}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}