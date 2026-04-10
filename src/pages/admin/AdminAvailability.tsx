import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminAvailability = () => {
  const [hours, setHours] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [closureForm, setClosureForm] = useState({ date: "", reason: "", start_time: "", end_time: "" });
  const [editingClosure, setEditingClosure] = useState<any>(null);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const [{ data: wh }, { data: cl }] = await Promise.all([
      supabase.from("working_hours").select("*").is("staff_id", null).order("day_of_week"),
      supabase.from("closures").select("*").is("staff_id", null).order("date", { ascending: false }),
    ]);
    setHours(wh || []);
    setClosures(cl || []);
  };

  useEffect(() => { fetchData(); }, []);

  const updateHour = async (dayOfWeek: number, field: string, value: any) => {
    const existing = hours.find((h) => h.day_of_week === dayOfWeek);
    if (existing) {
      const { error } = await supabase.from("working_hours").update({ [field]: value } as any).eq("id", existing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const record: any = { day_of_week: dayOfWeek, start_time: "09:00", end_time: "18:00", is_off: false, [field]: value };
      const { error } = await supabase.from("working_hours").insert(record);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    fetchData();
  };

  const openClosureDialog = (closure?: any) => {
    if (closure) {
      setEditingClosure(closure);
      setClosureForm({ date: closure.date, reason: closure.reason || "", start_time: closure.start_time || "", end_time: closure.end_time || "" });
    } else {
      setEditingClosure(null);
      setClosureForm({ date: "", reason: "", start_time: "", end_time: "" });
    }
    setClosureDialogOpen(true);
  };

  const saveClosure = async () => {
    if (!closureForm.date) { toast({ title: "Date is required", variant: "destructive" }); return; }
    const payload: any = {
      date: closureForm.date,
      reason: closureForm.reason || null,
      start_time: closureForm.start_time || null,
      end_time: closureForm.end_time || null,
    };

    if (editingClosure) {
      const { error } = await supabase.from("closures").update(payload).eq("id", editingClosure.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Closure updated" });
    } else {
      const { error } = await supabase.from("closures").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Closure added" });
    }
    setClosureDialogOpen(false);
    fetchData();
  };

  const confirmDeleteClosure = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("closures").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Closure deleted" });
    setDeleteId(null);
    fetchData();
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Availability</h1>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="font-serif text-base md:text-lg">Working Hours</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-2 md:space-y-3">
          {DAYS.map((day, i) => {
            const hour = hours.find((h) => h.day_of_week === i);
            return (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-36">
                  <span className="text-sm font-medium">
                    <span className="sm:hidden">{DAYS_SHORT[i]}</span>
                    <span className="hidden sm:inline">{day}</span>
                  </span>
                  <Switch checked={!hour?.is_off} onCheckedChange={(v) => updateHour(i, "is_off", !v)} />
                </div>
                {!hour?.is_off ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={hour?.start_time?.substring(0, 5) || "09:00"} onChange={(e) => updateHour(i, "start_time", e.target.value)} className="w-[7rem]" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="time" value={hour?.end_time?.substring(0, 5) || "18:00"} onChange={(e) => updateHour(i, "end_time", e.target.value)} className="w-[7rem]" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base md:text-lg">Closures / Holidays</CardTitle>
            <Button size="sm" className="rounded-full gap-1.5 text-xs" onClick={() => openClosureDialog()}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 md:p-3 bg-secondary/50 rounded-lg">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{c.date}</span>
                  {c.start_time && c.end_time && (
                    <span className="text-xs text-muted-foreground ml-2">{c.start_time.substring(0, 5)} – {c.end_time.substring(0, 5)}</span>
                  )}
                  {c.reason && <span className="text-xs md:text-sm text-muted-foreground ml-2">— {c.reason}</span>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openClosureDialog(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {closures.length === 0 && <p className="text-xs md:text-sm text-muted-foreground">No closures scheduled.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Closure Add/Edit Dialog */}
      <Dialog open={closureDialogOpen} onOpenChange={setClosureDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingClosure ? "Edit Closure" : "Add Closure"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={closureForm.date} onChange={(e) => setClosureForm({ ...closureForm, date: e.target.value })} className="mt-1" /></div>
            <div><Label>Reason (optional)</Label><Input value={closureForm.reason} onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time (optional)</Label><Input type="time" value={closureForm.start_time} onChange={(e) => setClosureForm({ ...closureForm, start_time: e.target.value })} className="mt-1" /></div>
              <div><Label>End Time (optional)</Label><Input type="time" value={closureForm.end_time} onChange={(e) => setClosureForm({ ...closureForm, end_time: e.target.value })} className="mt-1" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Leave times empty for a full-day closure.</p>
            <Button className="w-full rounded-full" onClick={saveClosure}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Closure</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this closure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClosure}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAvailability;
