import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";

const statusOptions = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const AdminBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const fetchBookings = async () => {
    let query = supabase
      .from("bookings")
      .select("*, services(name), staff(name), payments(*)")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter as any);
    }

    const { data } = await query;
    setBookings(data || []);
  };

  useEffect(() => { fetchBookings(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status: status as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchBookings();
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: "bg-yellow-100 text-yellow-800",
      pending_verification: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      completed: "bg-muted text-muted-foreground",
      cancelled: "bg-red-100 text-red-800",
      no_show: "bg-muted text-muted-foreground",
    };
    return colors[status] || "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-foreground">Bookings</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {bookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{b.customer_name}</h3>
                  <p className="text-sm text-muted-foreground">{b.customer_email} {b.customer_phone && `· ${b.customer_phone}`}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {b.services?.name} · {b.staff?.name || "Any"} · {format(parse(b.booking_date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")} · {b.start_time?.substring(0, 5)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColor(b.status)} border-0`}>
                    {statusOptions.find((s) => s.value === b.status)?.label || b.status}
                  </Badge>
                  <Select value={b.status} onValueChange={(v) => updateStatus(b.id, v)}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {bookings.length === 0 && <p className="text-muted-foreground">No bookings found.</p>}
      </div>
    </div>
  );
};

export default AdminBookings;
