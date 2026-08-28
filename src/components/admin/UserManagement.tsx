import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminDataTable } from './AdminDataTable';
import { Shield, User, Edit, Building2, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string; // Fetched separately from user_roles table
  created_at: string;
  updated_at: string;
  establishment_id: string;
  school_name?: string | null;
  class_level: string;
  preferred_language: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch all roles + establishments in bulk
      const [{ data: roleRows }, { data: establishments }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('establishments').select('id, name, approval_status'),
      ]);

      const rolePriority = ['admin', 'editor', 'school_admin', 'teacher', 'student'];
      const rolesByUser = new Map<string, string[]>();
      (roleRows || []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push(r.role as string);
        rolesByUser.set(r.user_id, list);
      });
      const schoolById = new Map((establishments || []).map((e) => [e.id, e]));

      const usersWithRoles = (profiles || []).map((profile) => {
        const list = rolesByUser.get(profile.id) || [];
        const role = rolePriority.find((r) => list.includes(r)) || 'student';
        const school = profile.establishment_id ? schoolById.get(profile.establishment_id) : null;
        return {
          ...profile,
          role,
          school_name: school ? school.name : null,
          school_status: school ? (school.approval_status || 'pending') : null,
        };
      });
      
      // Log profile access by admin for audit trail
      if (usersWithRoles.length > 0) {
        await supabase.rpc('log_audit', {
          p_action: 'profiles_list_viewed',
          p_target_type: 'profiles',
          p_metadata: { count: usersWithRoles.length }
        });
      }
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const changeUserRole = async (user: UserProfile, newRole: 'admin' | 'editor' | 'teacher' | 'student' | 'school_admin') => {
    try {
      // Use secure server-side function for role changes with audit logging
      const { data, error } = await supabase.rpc('change_user_role', {
        target_user_id: user.id,
        new_role: newRole
      });

      if (error) throw error;

      // Check if the function returned an error
      const result = data as { success: boolean; error?: string; message?: string };
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to update role');
      }

      // Refresh users list after successful role change
      await fetchUsers();

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'editor': return 'default';
      case 'school_admin': return 'default';
      case 'teacher': return 'secondary';
      default: return 'outline';
    }
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
      render: (value: string) => (
        <span className="max-w-[180px] truncate block" title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'first_name',
      label: 'First Name',
    },
    {
      key: 'last_name',
      label: 'Last Name',
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => (
        <Badge variant={getRoleBadgeVariant(value)}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'school_name',
      label: 'School',
      render: (value: string | null, row?: UserProfile & { school_status?: string | null }) => (
        value ? (
          <span className="flex items-center gap-1 max-w-[180px] truncate" title={value}>
            <Building2 className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span className="truncate">{value}</span>
            {row?.school_status === 'pending' && <Badge variant="outline" className="text-[10px]">pending</Badge>}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true }),
    },
  ];

  const actions = (user: UserProfile) => (
    <Select
      value={user.role || 'student'}
      onValueChange={(value) => changeUserRole(user, value as 'admin' | 'editor' | 'teacher' | 'student' | 'school_admin')}
    >
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="student">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Student
          </span>
        </SelectItem>
        <SelectItem value="teacher">
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Teacher
          </span>
        </SelectItem>
        <SelectItem value="school_admin">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            School
          </span>
        </SelectItem>
        <SelectItem value="editor">
          <span className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Editor
          </span>
        </SelectItem>
        <SelectItem value="admin">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <User className="h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AdminDataTable
          data={users}
          columns={columns}
          searchKey="email"
          actions={actions}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}