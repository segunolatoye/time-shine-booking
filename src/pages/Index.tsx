import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, Scissors, Phone, MapPin, Instagram, Facebook } from "lucide-react";

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
  const [showDuration, setShowDuration] = useState(true);
  const [enableStaff, setEnableStaff] = useState(true);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [servicesRes, settingsRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase.from("settings").select("key, value").in("key", ["salon_name", "show_service_duration", "enable_staff_selection", "contact_phone", "salon_address", "instagram_url", "facebook_url"]),
      ]);

      setServices(servicesRes.data || []);
      
      const settingsMap = (settingsRes.data || []).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as any);
      if (settingsMap.salon_name?.name) {
        setSalonName(settingsMap.salon_name.name);
      }
      if (settingsMap.show_service_duration?.enabled !== undefined) {
        setShowDuration(settingsMap.show_service_duration.enabled !== false);
      }
      if (settingsMap.enable_staff_selection?.enabled !== undefined) {
        setEnableStaff(settingsMap.enable_staff_selection.enabled !== false);
      }
      if (settingsMap.contact_phone?.phone) {
        setPhone(settingsMap.contact_phone.phone);
      }
      if (settingsMap.salon_address?.address) {
        setAddress(settingsMap.salon_address.address);
      }
      if (settingsMap.instagram_url?.url) {
        setInstagram(settingsMap.instagram_url.url);
      }
      if (settingsMap.facebook_url?.url) {
        setFacebook(settingsMap.facebook_url.url);
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
    <div className="min-h-screen bg-background">
      {/* Compact header */}
      <header className="border-b border-border/50 bg-secondary/30 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6 text-primary" />
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-serif font-semibold text-foreground mb-6">
          Choose a Service
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => (
              <Card
                key={service.id}
                className="group hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden cursor-pointer"
                onClick={() => handleBook(service)}
              >
                {service.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <CardContent className="p-5">
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {showDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {service.duration}min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {Number(service.price).toFixed(2)}
                      </span>
                    </div>
                    <Button size="sm" className="rounded-full">
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 pt-8 pb-12 px-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-3 mt-12">
        {(phone || address) && (
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-6 gap-y-2 mb-2">
            {phone && <span className="flex items-center justify-center gap-1.5"><Phone className="w-4 h-4" /> {phone}</span>}
            {address && <span className="flex items-center justify-center gap-1.5"><MapPin className="w-4 h-4" /> {address}</span>}
          </div>
        )}
        {(instagram || facebook) && (
          <div className="flex items-center justify-center gap-5 mb-2">
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {facebook && (
              <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
        <div className="text-xs">&copy; {new Date().getFullYear()} {salonName}</div>
      </footer>
    </div>
  );
};

export default Index;
