import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, KeyRound, Plus } from "lucide-react";
import { DataTable, Column } from "@/components/admin/DataTable";
import { format } from "date-fns";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "user" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    // Fetches users from the Supabase Auth system
    // Note: Requires service_role key to be configured in the client
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      toast({ 
        title: "Error fetching users", 
        description: error.message + " (Admin Auth actions require the service_role key)", 
        variant: "destructive" 
      });
    } else {
      setUsers(data?.users || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    if (!form.email.trim()) { toast({ title: "Email is required", variant: "destructive" }); return; }
    
    if (editUser) {
      const updates: any = { 
        email: form.email, 
        user_metadata: { ...editUser.user_metadata, name: form.displayName },
        app_metadata: { ...editUser.app_metadata, role: form.role }
      };
      if (form.password) updates.password = form.password; // Admin setting a new password directly

      const { error } = await supabase.auth.admin.updateUserById(editUser.id, updates);
      if (error) { 
        toast({ title: "Error", description: error.message, variant: "destructive" }); 
        return; 
      }
      toast({ title: "User updated successfully" });
    } else {
      if (!form.password) { toast({ title: "Password is required for new users", variant: "destructive" }); return; }
      const { error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        user_metadata: { name: form.displayName },
        app_metadata: { role: form.role },
        email_confirm: true
      });
      if (error) { 
        toast({ title: "Error", description: error.message, variant: "destructive" }); 
        return; 
      }
      toast({ title: "User created successfully" });
    }
    
    setIsDialogOpen(false);
    setEditUser(null);
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.auth.admin.deleteUser(deleteId);
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return; 
    }
    toast({ title: "User deleted" });
    setDeleteId(null);
    fetchUsers();
  };

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent to " + email });
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: "", password: "", displayName: "", role: "user" });
    setIsDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ 
      email: user.email, 
      password: "", 
      displayName: user.user_metadata?.name || "",
      role: user.app_metadata?.role || user.user_metadata?.role || "user"
    });
    setIsDialogOpen(true);
  };

  const columns: Column<any>[] = [
    {
      key: "email",
      header: "User",
      sortable: true,
      render: (u) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{u.user_metadata?.name || "No Name Provided"}</p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (u) => {
        const role = u.app_metadata?.role || u.user_metadata?.role || "user";
        return (
          <Badge variant={role === "super_admin" || role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
            {role.replace("_", " ")}
          </Badge>
        );
      }
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      hideOnMobile: true,
      render: (u) => <span className="text-xs text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</span>,
    },
    {
      key: "last_sign_in_at",
      header: "Last Login",
      hideOnMobile: true,
      render: (u) => <span className="text-xs text-muted-foreground">{u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "MMM d, yyyy") : "Never"}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Users</h1>
        <Button size="sm" className="rounded-full gap-1.5 text-xs md:text-sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Add User</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search users by email or name..."
        searchFn={(u, q) =>
          u.email?.toLowerCase().includes(q) ||
          u.user_metadata?.name?.toLowerCase().includes(q)
        }
        actions={(u) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Send Password Reset" onClick={() => handleResetPassword(u.email)}>
              <KeyRound className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(u)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteId(u.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        emptyMessage="No users found."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>{editUser ? "Set New Password (optional)" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" placeholder={editUser ? "Leave blank to keep current" : "Required"} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full rounded-full" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete the user account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;