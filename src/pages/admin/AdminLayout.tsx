import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Scissors,
  Users,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Clock,
  BarChart3,
  Menu,
  Bell,
  UserCog,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/bookings", icon: Calendar, label: "Bookings" },
  { to: "/admin/services", icon: Scissors, label: "Services" },
  { to: "/admin/staff", icon: Users, label: "Staff" },
  { to: "/admin/users", icon: UserCog, label: "Users" },
  { to: "/admin/availability", icon: Clock, label: "Availability" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments" },
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

function AdminSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Scissors className="w-5 h-5 text-primary shrink-0" />
        {!collapsed && (
          <h1 className="text-lg font-serif font-bold text-foreground truncate">
            Hair by Rhuqqui
          </h1>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="hover:bg-secondary/50"
                      activeClassName="bg-primary text-primary-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-3 border-t border-border">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={collapsed ? "" : "w-full justify-start gap-2 text-muted-foreground"}
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </Sidebar>
  );
}

type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
};

const AdminLayout = () => {
  const { isAdmin, loading, signOut, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          const newNotif = {
            id: payload.new.id || Math.random().toString(),
            title: "New Booking!",
            description: `${payload.new.customer_name} just booked an appointment.`,
            timestamp: new Date()
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 10));
          setUnreadCount((c) => c + 1);
          toast({ title: newNotif.title, description: newNotif.description });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        (payload) => {
          const newNotif = {
            id: payload.new.id || Math.random().toString(),
            title: "New Payment!",
            description: `A new payment of $${payload.new.amount} was received.`,
            timestamp: new Date()
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 10));
          setUnreadCount((c) => c + 1);
          toast({ title: newNotif.title, description: newNotif.description });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-serif font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <Button onClick={signOut} variant="outline">Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3" />
              <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
            </div>
            
            <DropdownMenu onOpenChange={(open) => { if (open) setUnreadCount(0); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-card" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Recent Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No new notifications.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((n) => (
                      <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 gap-1 cursor-default focus:bg-transparent">
                        <div className="flex justify-between w-full items-center">
                          <span className="font-medium text-sm text-foreground">{n.title}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground leading-snug">{n.description}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
