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
import { CalendarDays, Plus } from 'lucide-react';

interface AcademicYear {
  id: string;
  year_label: string;
  start_year: number;
  end_year: number;
  is_active: boolean | null;
  created_at: string;
}

export function AcademicYearManagement() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicYear | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    year_label: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1,
    is_active: true,
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_year', { ascending: false });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch academic years',
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
          .from('academic_years')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Academic year updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('academic_years')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Academic year created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      const currentYear = new Date().getFullYear();
      setFormData({ 
        year_label: '', 
        start_year: currentYear, 
        end_year: currentYear + 1, 
        is_active: true 
      });
      fetchAcademicYears();
    } catch (error) {
      console.error('Error saving academic year:', error);
      toast({
        title: 'Error',
        description: 'Failed to save academic year',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (item: AcademicYear) => {
    setEditingItem(item);
    setFormData({
      year_label: item.year_label,
      start_year: item.start_year,
      end_year: item.end_year,
      is_active: item.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: AcademicYear) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return;

    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      setAcademicYears(prev => prev.filter(a => a.id !== item.id));
      toast({
        title: 'Success',
        description: 'Academic year deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting academic year:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete academic year',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    { key: 'year_label', label: 'Label' },
    { key: 'start_year', label: 'Start Year' },
    { key: 'end_year', label: 'End Year' },
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
          <CalendarDays className="h-5 w-5" />
          Academic Years
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              const currentYear = new Date().getFullYear();
              setFormData({ 
                year_label: `${currentYear}-${currentYear + 1}`, 
                start_year: currentYear, 
                end_year: currentYear + 1, 
                is_active: true 
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Academic Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Academic Year' : 'Add New Academic Year'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="year_label">Label (e.g., 2024-2025)</Label>
                <Input
                  id="year_label"
                  value={formData.year_label}
                  onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
                  placeholder="2024-2025"
                  required
                />
              </div>
              <div>
                <Label htmlFor="start_year">Start Year</Label>
                <Input
                  id="start_year"
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_year">End Year</Label>
                <Input
                  id="end_year"
                  type="number"
                  value={formData.end_year}
                  onChange={(e) => setFormData({ ...formData, end_year: parseInt(e.target.value) })}
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
          data={academicYears}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}
