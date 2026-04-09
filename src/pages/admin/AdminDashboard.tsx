import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingVerifications: 0,
    weekBookings: 0,
    weekRevenue: 0,
  });
  const [todayBookingsList, setTodayBookingsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      const [todayRes, pendingRes, weekRes, revenueRes] = await Promise.all([
        supabase.from("bookings").select("*, services(name), staff(name)").eq("booking_date", today).not("status", "eq", "cancelled"),
        supabase.from("bookings").select("id", { count: "exact" }).eq("status", "pending_verification"),
        supabase.from("bookings").select("id", { count: "exact" }).gte("booking_date", weekAgo).not("status", "eq", "cancelled"),
        supabase.from("payments").select("amount").eq("status", "paid_full").gte("created_at", weekAgo + "T00:00:00"),
      ]);

      const revenue = (revenueRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      setTodayBookingsList(todayRes.data || []);
      setStats({
        todayBookings: todayRes.data?.length || 0,
        pendingVerifications: pendingRes.count || 0,
        weekBookings: weekRes.count || 0,
        weekRevenue: revenue,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Today's Bookings", value: stats.todayBookings, icon: Calendar, color: "text-primary" },
    { label: "Pending Verification", value: stats.pendingVerifications, icon: AlertCircle, color: "text-yellow-600" },
    { label: "This Week", value: stats.weekBookings, icon: Clock, color: "text-blue-600" },
    { label: "Week Revenue", value: `$${stats.weekRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
  ];

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-4 md:mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color} shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="font-serif text-base md:text-lg">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {todayBookingsList.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings today.</p>
          ) : (
            <div className="space-y-2">
              {todayBookingsList.map((b: any) => (
                <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 rounded-lg bg-secondary/50">
                  <div className="min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{b.customer_name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {b.services?.name} · {b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}
                    </p>
                  </div>
                  <span className="text-xs md:text-sm text-muted-foreground shrink-0">
                    {b.staff?.name || "Any"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
