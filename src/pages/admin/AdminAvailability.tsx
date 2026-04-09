import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      await supabase.from("working_hours").update({ [field]: value } as any).eq("id", existing.id);
    } else {
      const record: any = {
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "18:00",
        is_off: false,
        [field]: value,
      };
      await supabase.from("working_hours").insert(record);
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
                  <Switch
                    checked={!hour?.is_off}
                    onCheckedChange={(v) => updateHour(i, "is_off", !v)}
                  />
                </div>
                {!hour?.is_off ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hour?.start_time?.substring(0, 5) || "09:00"}
                      onChange={(e) => updateHour(i, "start_time", e.target.value)}
                      className="w-[7rem]"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hour?.end_time?.substring(0, 5) || "18:00"}
                      onChange={(e) => updateHour(i, "end_time", e.target.value)}
                      className="w-[7rem]"
                    />
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
          <CardTitle className="font-serif text-base md:text-lg">Closures / Holidays</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <Input type="date" value={newClosure.date} onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })} className="sm:w-48" />
            <Input placeholder="Reason (optional)" value={newClosure.reason} onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })} className="flex-1" />
            <Button onClick={addClosure} className="rounded-full sm:w-auto">Add</Button>
          </div>
          <div className="space-y-2">
            {closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 md:p-3 bg-secondary/50 rounded-lg">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{c.date}</span>
                  {c.reason && <span className="text-xs md:text-sm text-muted-foreground ml-2">— {c.reason}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteClosure(c.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {closures.length === 0 && <p className="text-xs md:text-sm text-muted-foreground">No closures scheduled.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAvailability;
