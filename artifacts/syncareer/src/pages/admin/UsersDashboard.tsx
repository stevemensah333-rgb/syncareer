import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, UserCheck, Shield, RefreshCw, ShieldOff, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AnimatedSection from '@/components/landing/AnimatedSection';

interface UserRow {
  id: string;
  full_name: string | null;
  username: string | null;
  user_type: string | null;
  email: string;
  created_at: string;
  is_admin: boolean;
}

const UsersDashboard = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
    });
    if (!error && !data?.error) {
      setUsers(data?.users ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (user: UserRow) => {
    const newAction = user.is_admin ? 'revoke' : 'grant';
    setTogglingRoleId(user.id);

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'set_role',
        user_id: user.id,
        role_action: newAction,
      },
    });

    if (error || data?.error) {
      toast.error('Failed to update admin role.');
    } else {
      toast.success(
        newAction === 'grant'
          ? `${user.full_name || user.email} is now an admin.`
          : `${user.full_name || user.email} is no longer an admin.`
      );
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, is_admin: data.is_admin } : u
        )
      );
    }

    setTogglingRoleId(null);
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.user_type ?? '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter(u => u.user_type === 'student').length;
    const mentors = users.filter(u => u.user_type === 'career_counsellor').length;
    const admins = users.filter(u => u.is_admin).length;
    return { total, students, mentors, admins };
  }, [users]);

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Stats */}
        <AnimatedSection y={20}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-accent-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.students}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.mentors}</p>
                  <p className="text-xs text-muted-foreground">Career Mentors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </AnimatedSection>

        {/* Table */}
        <AnimatedSection delay={0.08} y={20}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>All users
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-8 w-[220px]"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="gap-1.5 rounded-full px-4"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        {loading ? 'Loading users...' : 'No users found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(user => {
                      const isTogglingRole = togglingRoleId === user.id;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div>
                                <p className="font-medium text-sm text-foreground">
                                  {user.full_name || '—'}
                                </p>
                                {user.username && (
                                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                                )}
                              </div>
                              {user.is_admin && (
                                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{user.email || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {user.user_type || 'unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {user.created_at
                                ? format(new Date(user.created_at), 'MMM d, yyyy')
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant={user.is_admin ? 'destructive' : 'outline'}
                                size="sm"
                                className="h-7 text-xs gap-1 rounded-full px-3"
                                disabled={isTogglingRole}
                                onClick={() => handleToggleAdmin(user)}
                              >
                                {isTogglingRole ? (
                                  <RefreshCw className="size-3 animate-spin motion-reduce:animate-none" />
                                ) : user.is_admin ? (
                                  <>
                                    <ShieldOff className="h-3 w-3" />
                                    Remove
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-3 w-3" />
                                    Make Admin
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>
      </div>
    </AdminLayout>
  );
};

export default UsersDashboard;
