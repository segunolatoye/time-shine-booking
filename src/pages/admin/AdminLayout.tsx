import React from "react";
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
  Menu,
} from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/bookings", icon: Calendar, label: "Bookings" },
  { to: "/admin/services", icon: Scissors, label: "Services" },
  { to: "/admin/staff", icon: Users, label: "Staff" },
  { to: "/admin/availability", icon: Clock, label: "Availability" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments" },
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

const AdminLayout = () => {
  const { isAdmin, loading, signOut, user } = useAuth();

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
          <header className="h-12 flex items-center border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger className="mr-3" />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
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
