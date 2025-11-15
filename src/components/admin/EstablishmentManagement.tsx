import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';

interface Establishment {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export function EstablishmentManagement() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Establishment | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    country: 'CI',
  });

  useEffect(() => {
    fetchEstablishments();
  }, []);

  const fetchEstablishments = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('name');

      if (error) throw error;
      setEstablishments(data || []);
    } catch (error) {
      console.error('Error fetching establishments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch establishments',
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
          .from('establishments')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Establishment updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('establishments')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Establishment created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: '', type: '', country: 'CI' });
      fetchEstablishments();
    } catch (error) {
      console.error('Error saving establishment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save establishment',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Establishment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type || '',
      country: item.country || 'CI',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Establishment) => {
    if (!confirm('Are you sure you want to delete this establishment?')) return;

    try {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setEstablishments(prev => prev.filter(e => e.id !== item.id));
      toast({
        title: 'Success',
        description: 'Establishment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting establishment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete establishment',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'country', label: 'Country' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Schools / Establishments
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', type: '', country: 'CI' });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Establishment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Establishment' : 'Add New Establishment'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="CI"
                />
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
          data={establishments}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
