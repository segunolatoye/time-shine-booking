import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", duration: 60, price: 0, active: true });
  const { toast } = useToast();

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setServices(data || []);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { error } = await supabase.from("services").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("services").insert(form);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: "", description: "", duration: 60, price: 0, active: true });
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    fetchServices();
  };

  const openEdit = (service: any) => {
    setEditing(service);
    setForm({ name: service.name, description: service.description || "", duration: service.duration, price: Number(service.price), active: service.active });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-foreground">Services</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", description: "", duration: 60, price: 0, active: true }); } }}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2"><Plus className="w-4 h-4" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="mt-1" /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
              <Button className="w-full rounded-full" onClick={handleSave}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{s.name} {!s.active && <span className="text-xs text-muted-foreground">(inactive)</span>}</h3>
                <p className="text-sm text-muted-foreground">{s.duration} min · ${Number(s.price).toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {services.length === 0 && <p className="text-muted-foreground">No services yet. Add one to get started.</p>}
      </div>
    </div>
  );
};

export default AdminServices;
