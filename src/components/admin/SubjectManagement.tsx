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
import { BookOpen, Plus } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Subject | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    name_fr: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
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
          .from('subjects')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subject updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Subject created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: '', name_en: '', name_fr: '', is_active: true });
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subject',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: Subject) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      name_en: item.name_en || '',
      name_fr: item.name_fr || '',
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Subject) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setSubjects(prev => prev.filter(s => s.id !== item.id));
      toast({
        title: 'Success',
        description: 'Subject deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive',
      });
    }
  };

  const columns = [
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
          <BookOpen className="h-5 w-5" />
          Subjects
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', name_en: '', name_fr: '', is_active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Subject' : 'Add New Subject'}
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
          data={subjects}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
