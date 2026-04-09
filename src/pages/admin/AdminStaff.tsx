import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User } from "lucide-react";

const AdminStaff = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", bio: "", active: true, serviceIds: [] as string[] });
  const { toast } = useToast();

  const fetchData = async () => {
    const [{ data: staff }, { data: svcs }, { data: staffSvcs }] = await Promise.all([
      supabase.from("staff").select("*").order("sort_order"),
      supabase.from("services").select("id, name"),
      supabase.from("staff_services").select("staff_id, service_id"),
    ]);
    const enriched = (staff || []).map((s: any) => ({
      ...s,
      serviceIds: (staffSvcs || []).filter((ss: any) => ss.staff_id === s.id).map((ss: any) => ss.service_id),
    }));
    setStaffList(enriched);
    setServices(svcs || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    let staffId: string;
    if (editing) {
      staffId = editing.id;
      await supabase.from("staff").update({ name: form.name, bio: form.bio, active: form.active }).eq("id", staffId);
    } else {
      const { data } = await supabase.from("staff").insert({ name: form.name, bio: form.bio, active: form.active }).select("id").single();
      if (!data) return;
      staffId = data.id;
    }
    await supabase.from("staff_services").delete().eq("staff_id", staffId);
    if (form.serviceIds.length > 0) {
      await supabase.from("staff_services").insert(
        form.serviceIds.map((sid) => ({ staff_id: staffId, service_id: sid }))
      );
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: "", bio: "", active: true, serviceIds: [] });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("staff").delete().eq("id", id);
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
      serviceIds: f.serviceIds.includes(serviceId)
        ? f.serviceIds.filter((id) => id !== serviceId)
        : [...f.serviceIds, serviceId],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Staff</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", bio: "", active: true, serviceIds: [] }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full gap-1.5 md:gap-2 text-xs md:text-sm">
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

      <div className="space-y-2 md:space-y-3">
        {staffList.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3 md:p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base truncate">
                    {s.name} {!s.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{s.serviceIds?.length || 0} services</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {staffList.length === 0 && <p className="text-muted-foreground text-sm">No staff yet.</p>}
      </div>
    </div>
  );
};

export default AdminStaff;
