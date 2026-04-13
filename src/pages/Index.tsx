import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, Scissors } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  image_url: string | null;
}

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [salonName, setSalonName] = useState("Hair by Rhuqqui");
  const [logoUrl, setLogoUrl] = useState("");
  const [showDuration, setShowDuration] = useState(true);
  const [enableBooking, setEnableBooking] = useState(true);
  const [enableStaff, setEnableStaff] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [servicesRes, settingsRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase.from("settings").select("key, value").in("key", ["salon_name", "salon_logo", "show_service_duration", "enable_booking", "enable_staff_selection"]),
      ]);

      setServices(servicesRes.data || []);
      
      const settingsMap = (settingsRes.data || []).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
      if (settingsMap.salon_name?.name) {
        setSalonName(settingsMap.salon_name.name);
      }
      if (settingsMap.salon_logo?.url) {
        setLogoUrl(settingsMap.salon_logo.url);
      }
      if (settingsMap.show_service_duration?.enabled !== undefined) {
        setShowDuration(settingsMap.show_service_duration.enabled !== false);
      }
      if (settingsMap.enable_booking?.enabled !== undefined) {
        setEnableBooking(settingsMap.enable_booking.enabled !== false);
      }
      if (settingsMap.enable_staff_selection?.enabled !== undefined) {
        setEnableStaff(settingsMap.enable_staff_selection.enabled !== false);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleBook = (service: Service) => {
    const state = {
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: service.duration,
      servicePrice: Number(service.price),
    };
    if (enableStaff) {
      navigate("/book/staff", { state });
    } else {
      navigate("/book/datetime", {
        state: {
          ...state,
          staffId: null,
          staffName: "Any Available",
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact header */}
      <header className="border-b border-border/50 bg-secondary/30 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <Scissors className="w-6 h-6 text-primary" />
            )}
            <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
              {salonName}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Select a service to book your appointment
          </p>
        </div>
      </header>

      {/* Services grid */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-serif font-semibold text-foreground">
            Choose a Service
          </h2>
          {!enableBooking && !loading && (
            <span className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full w-fit">
              Bookings currently closed
            </span>
          )}
        </div>

        {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse flex flex-col">
              <CardContent className="p-3 sm:p-5">
                  <div className="h-5 bg-muted rounded mb-3 w-2/3" />
                  <div className="h-4 bg-muted rounded mb-2 w-full" />
                  <div className="h-4 bg-muted rounded mb-4 w-3/4" />
                  <div className="h-10 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No services available at the moment. Please check back soon!
          </p>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {services.map((service) => (
              <Card
                key={service.id}
              className={`group transition-all duration-300 border-border/50 overflow-hidden flex flex-col ${enableBooking ? "hover:shadow-lg cursor-pointer" : "opacity-90"}`}
                onClick={() => enableBooking && handleBook(service)}
              >
                {service.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${enableBooking ? "group-hover:scale-105" : ""}`}
                    />
                  </div>
                )}
              <CardContent className="p-3 sm:p-5 flex flex-col flex-1">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground mb-1 line-clamp-2">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mt-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      {showDuration && (
                        <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {service.duration}m
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {Number(service.price).toFixed(2)}
                      </span>
                    </div>
                  {enableBooking && (
                    <Button size="sm" className="rounded-full w-full xl:w-auto h-8 text-xs sm:text-sm">
                        Book
                      </Button>
                  )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default Index;
