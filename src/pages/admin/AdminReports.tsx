import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, CalendarDays, Users } from "lucide-react";
import { subDays, format } from "date-fns";

const AdminReports = () => {
  const [dateRange, setDateRange] = useState("30"); // days
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    bookingsCount: 0,
    topServices: [] as { name: string; count: number; percentage: number }[],
    topStaff: [] as { name: string; count: number; percentage: number }[],
  });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const days = parseInt(dateRange);
      
      let startDateStr = "2000-01-01"; // Default for 'all'
      if (days > 0) {
        const startDate = subDays(new Date(), days);
        startDateStr = format(startDate, "yyyy-MM-dd");
      }

      // Fetch Payments for Revenue
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .in("status", ["paid_full", "paid_partial"])
        .gte("created_at", startDateStr + "T00:00:00Z");

      const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

      // Fetch Bookings for Stats
      const { data: bookings } = await supabase
        .from("bookings")
        .select("status, booking_date, services(name), staff(name)")
        .not("status", "eq", "cancelled")
        .gte("booking_date", startDateStr);

      const validBookings = bookings || [];
      const totalBookings = validBookings.length;

      // Calculate Top Services
      const serviceCounts: Record<string, number> = {};
      // Calculate Top Staff
      const staffCounts: Record<string, number> = {};

      validBookings.forEach((b: any) => {
        const sName = b.services?.name || "Unknown Service";
        const stName = b.staff?.name || "No Staff Assigned";
        
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
        staffCounts[stName] = (staffCounts[stName] || 0) + 1;
      });

      const formatTopList = (counts: Record<string, number>) => {
        return Object.entries(counts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5
      };

      setStats({
        revenue: totalRevenue,
        bookingsCount: totalBookings,
        topServices: formatTopList(serviceCounts),
        topStaff: formatTopList(staffCounts),
      });

      setLoading(false);
    };

    fetchReports();
  }, [dateRange]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground">Analytics & Reports</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-48 bg-background">
            <SelectValue placeholder="Select Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="0">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-32 bg-secondary/50 rounded-xl" />
          <div className="h-32 bg-secondary/50 rounded-xl" />
          <div className="h-64 bg-secondary/50 rounded-xl md:col-span-2" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
                  <h3 className="text-2xl font-bold">${stats.revenue.toFixed(2)}</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Bookings</p>
                  <h3 className="text-2xl font-bold">{stats.bookingsCount}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {[
              { title: "Top Services", icon: BarChart3, data: stats.topServices },
              { title: "Top Staff", icon: Users, data: stats.topStaff },
            ].map((section, i) => (
              <Card key={i}>
                <CardHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center gap-2">
                  <section.icon className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base font-serif">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {section.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data available for this period.</p>
                  ) : section.data.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="font-medium truncate pr-4">{item.name}</span><span className="text-muted-foreground">{item.count} bookings</span></div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }} /></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;