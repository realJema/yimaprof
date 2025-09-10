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
import { Building, Plus, Edit, Trash2 } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  display_name: string;
  section: string;
  level: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    section: '',
    level: '',
    description: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(formData)
          .eq('id', editingClass.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Class updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Class created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingClass(null);
      setFormData({
        name: '',
        display_name: '',
        section: '',
        level: '',
        description: '',
      });
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      toast({
        title: 'Error',
        description: 'Failed to save class',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      display_name: classItem.display_name,
      section: classItem.section,
      level: classItem.level,
      description: classItem.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (classItem: Class) => {
    if (!confirm('Are you sure you want to delete this class? This will affect all associated exams.')) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classItem.id);

      if (error) throw error;

      setClasses(prev => prev.filter(c => c.id !== classItem.id));
      toast({
        title: 'Success',
        description: 'Class deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const columns = [
    {
      key: 'display_name',
      label: 'Display Name',
    },
    {
      key: 'name',
      label: 'Name',
    },
    {
      key: 'section',
      label: 'Section',
    },
    {
      key: 'level',
      label: 'Level',
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: string) => value || 'No description',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  const actions = (classItem: Class) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(classItem)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(classItem)}
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
            <Building className="h-5 w-5" />
            Class Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="e.g., Upper Sixth"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Internal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., upper_sixth"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Select value={formData.section} onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="francophone">Francophone</SelectItem>
                        <SelectItem value="anglophone">Anglophone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="level">Level</Label>
                    <Input
                      id="level"
                      value={formData.level}
                      onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                      placeholder="e.g., 13"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Class description..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit">
                    {editingClass ? 'Update' : 'Create'} Class
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
          data={classes}
          columns={columns}
          searchKey="display_name"
          actions={actions}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}