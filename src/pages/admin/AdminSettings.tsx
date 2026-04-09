import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const [cashApp, setCashApp] = useState({ cashtag: "", note: "" });
  const [zelle, setZelle] = useState({ email: "", phone: "", note: "" });
  const [deposit, setDeposit] = useState({ type: "none", value: 0 });
  const [buffer, setBuffer] = useState({ minutes: 0 });
  const [salonName, setSalonName] = useState("Luxe Salon");
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("key, value");
      (data || []).forEach((s: any) => {
        const v = s.value as any;
        if (s.key === "cash_app_details") setCashApp(v);
        if (s.key === "zelle_details") setZelle(v);
        if (s.key === "deposit_rules") setDeposit(v);
        if (s.key === "buffer_time") setBuffer(v);
        if (s.key === "salon_name") setSalonName(v.name || "Luxe Salon");
      });
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("settings").insert({ key, value });
    }
    toast({ title: "Settings saved" });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Settings</h1>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="font-serif text-base md:text-lg">Salon Info</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-3">
          <div>
            <Label>Salon Name</Label>
            <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} className="mt-1" />
          </div>
          <Button className="rounded-full w-full sm:w-auto" onClick={() => saveSetting("salon_name", { name: salonName })}>Save</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="font-serif text-base md:text-lg">Cash App</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>$Cashtag</Label>
              <Input value={cashApp.cashtag} onChange={(e) => setCashApp({ ...cashApp, cashtag: e.target.value })} className="mt-1" placeholder="$YourCashTag" />
            </div>
            <div>
              <Label>Note / Instructions</Label>
              <Input value={cashApp.note} onChange={(e) => setCashApp({ ...cashApp, note: e.target.value })} className="mt-1" />
            </div>
            <Button className="rounded-full w-full sm:w-auto" onClick={() => saveSetting("cash_app_details", cashApp)}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="font-serif text-base md:text-lg">Zelle</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={zelle.email} onChange={(e) => setZelle({ ...zelle, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={zelle.phone} onChange={(e) => setZelle({ ...zelle, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Note / Instructions</Label>
              <Input value={zelle.note} onChange={(e) => setZelle({ ...zelle, note: e.target.value })} className="mt-1" />
            </div>
            <Button className="rounded-full w-full sm:w-auto" onClick={() => saveSetting("zelle_details", zelle)}>Save</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="font-serif text-base md:text-lg">Deposit Rules</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Deposit Type</Label>
              <Select value={deposit.type} onValueChange={(v) => setDeposit({ ...deposit, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Full Payment</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {deposit.type !== "none" && (
              <div>
                <Label>{deposit.type === "percentage" ? "Percentage (%)" : "Amount ($)"}</Label>
                <Input type="number" value={deposit.value} onChange={(e) => setDeposit({ ...deposit, value: parseFloat(e.target.value) || 0 })} className="mt-1" />
              </div>
            )}
            <Button className="rounded-full w-full sm:w-auto" onClick={() => saveSetting("deposit_rules", deposit)}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="font-serif text-base md:text-lg">Buffer Time</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-3">
            <div>
              <Label>Minutes between bookings</Label>
              <Input type="number" value={buffer.minutes} onChange={(e) => setBuffer({ minutes: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
            <Button className="rounded-full w-full sm:w-auto" onClick={() => saveSetting("buffer_time", buffer)}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
