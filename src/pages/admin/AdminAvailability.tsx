import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminAvailability = () => {
  const [hours, setHours] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [newClosure, setNewClosure] = useState({ date: "", reason: "" });
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
      await supabase.from("working_hours").update({ [field]: value }).eq("id", existing.id);
    } else {
      await supabase.from("working_hours").insert({
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "18:00",
        is_off: false,
        [field]: value,
      });
    }
    fetchData();
  };

  const addClosure = async () => {
    if (!newClosure.date) return;
    await supabase.from("closures").insert({ date: newClosure.date, reason: newClosure.reason || null });
    setNewClosure({ date: "", reason: "" });
    fetchData();
    toast({ title: "Closure added" });
  };

  const deleteClosure = async (id: string) => {
    await supabase.from("closures").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-6">Availability</h1>

        <Card>
          <CardHeader><CardTitle className="font-serif">Working Hours</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day, i) => {
              const hour = hours.find((h) => h.day_of_week === i);
              return (
                <div key={i} className="flex items-center gap-4 py-2">
                  <span className="w-24 text-sm font-medium">{day}</span>
                  <Switch
                    checked={!hour?.is_off}
                    onCheckedChange={(v) => updateHour(i, "is_off", !v)}
                  />
                  {!hour?.is_off && (
                    <>
                      <Input
                        type="time"
                        value={hour?.start_time?.substring(0, 5) || "09:00"}
                        onChange={(e) => updateHour(i, "start_time", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hour?.end_time?.substring(0, 5) || "18:00"}
                        onChange={(e) => updateHour(i, "end_time", e.target.value)}
                        className="w-32"
                      />
                    </>
                  )}
                  {hour?.is_off && <span className="text-sm text-muted-foreground">Closed</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif">Closures / Holidays</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Input type="date" value={newClosure.date} onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })} className="w-48" />
            <Input placeholder="Reason (optional)" value={newClosure.reason} onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })} className="flex-1" />
            <Button onClick={addClosure} className="rounded-full">Add</Button>
          </div>
          <div className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <span className="font-medium">{c.date}</span>
                  {c.reason && <span className="text-sm text-muted-foreground ml-2">— {c.reason}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteClosure(c.id)} className="text-destructive">Remove</Button>
              </div>
            ))}
            {closures.length === 0 && <p className="text-sm text-muted-foreground">No closures scheduled.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAvailability;
