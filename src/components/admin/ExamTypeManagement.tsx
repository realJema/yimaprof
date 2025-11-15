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
import { FileCheck, Plus } from 'lucide-react';

interface ExamType {
  id: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  is_active: boolean | null;
  created_at: string;
}

export function ExamTypeManagement() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExamType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    name_fr: '',
    is_active: true,
  });

  useEffect(() => {
    fetchExamTypes();
  }, []);

  const fetchExamTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setExamTypes(data || []);
    } catch (error) {
      console.error('Error fetching exam types:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exam types',
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
          .from('exam_types')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Exam type updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('exam_types')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Exam type created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ name: '', name_en: '', name_fr: '', is_active: true });
      fetchExamTypes();
    } catch (error) {
      console.error('Error saving exam type:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam type',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: ExamType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      name_en: item.name_en || '',
      name_fr: item.name_fr || '',
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: ExamType) => {
    if (!confirm('Are you sure you want to delete this exam type?')) return;

    try {
      const { error } = await supabase
        .from('exam_types')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setExamTypes(prev => prev.filter(e => e.id !== item.id));
      toast({
        title: 'Success',
        description: 'Exam type deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting exam type:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exam type',
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
          <FileCheck className="h-5 w-5" />
          Exam Types
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', name_en: '', name_fr: '', is_active: true });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Exam Type' : 'Add New Exam Type'}
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
          data={examTypes}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
