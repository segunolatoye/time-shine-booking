import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { DataTable, Column } from "@/components/admin/DataTable";

const AdminStaff = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", bio: "", active: true, serviceIds: [] as string[] });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [{ data: staff }, { data: svcs }, { data: staffSvcs }] = await Promise.all([
      supabase.from("staff").select("*").order("sort_order"),
      supabase.from("services").select("id, name"),
      supabase.from("staff_services").select("staff_id, service_id"),
    ]);
    const enriched = (staff || []).map((s: any) => ({
      ...s,
      serviceIds: (staffSvcs || []).filter((ss: any) => ss.staff_id === s.id).map((ss: any) => ss.service_id),
      serviceNames: (staffSvcs || [])
        .filter((ss: any) => ss.staff_id === s.id)
        .map((ss: any) => (svcs || []).find((svc: any) => svc.id === ss.service_id)?.name)
        .filter(Boolean),
    }));
    setStaffList(enriched);
    setServices(svcs || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    let staffId: string;
    if (editing) {
      staffId = editing.id;
      const { error } = await supabase.from("staff").update({ name: form.name, bio: form.bio, active: form.active }).eq("id", staffId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Staff updated" });
    } else {
      const { data, error } = await supabase.from("staff").insert({ name: form.name, bio: form.bio, active: form.active }).select("id").single();
      if (error || !data) { toast({ title: "Error", description: error?.message || "Failed", variant: "destructive" }); return; }
      staffId = data.id;
      toast({ title: "Staff added" });
    }
    await supabase.from("staff_services").delete().eq("staff_id", staffId);
    if (form.serviceIds.length > 0) {
      await supabase.from("staff_services").insert(form.serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid })));
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: "", bio: "", active: true, serviceIds: [] });
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("staff").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Staff deleted" });
    setDeleteId(null);
    fetchData();
  };

  const openEdit = (staff: any) => {
    setEditing(staff);
    setForm({ name: staff.name, bio: staff.bio || "", active: staff.active, serviceIds: staff.serviceIds || [] });
    setOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(serviceId) ? f.serviceIds.filter((id) => id !== serviceId) : [...f.serviceIds, serviceId],
    }));
  };

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium text-sm">{s.name}</span>
            {!s.active && <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "services",
      header: "Services",
      hideOnMobile: true,
      render: (s) => (
        <span className="text-sm text-muted-foreground">
          {s.serviceNames?.length ? s.serviceNames.join(", ") : "None"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Status",
      render: (s) => (
        <Badge variant={s.active ? "default" : "secondary"} className="text-xs">
          {s.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Staff</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", bio: "", active: true, serviceIds: [] }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1.5 text-xs md:text-sm">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Add Staff</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">{editing ? "Edit Staff" : "Add Staff"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <div>
                <Label>Services</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {services.map((svc) => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <Checkbox checked={form.serviceIds.includes(svc.id)} onCheckedChange={() => toggleService(svc.id)} />
                      <span className="text-sm">{svc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full rounded-full" onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={staffList}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search staff..."
        searchFn={(s, q) => s.name?.toLowerCase().includes(q) || s.bio?.toLowerCase().includes(q)}
        actions={(s) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
        )}
        emptyMessage="No staff yet. Add one to get started."
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently remove this staff member.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStaff;
