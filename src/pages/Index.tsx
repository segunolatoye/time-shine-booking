import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, Scissors } from "lucide-react";

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [servicesRes, settingsRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("active", true)
          .order("sort_order"),
        supabase.from("settings").select("value").eq("key", "salon_name").maybeSingle(),
      ]);

      setServices(servicesRes.data || []);
      if (settingsRes.data?.value?.name) {
        setSalonName(settingsRes.data.value.name);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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
                onClick={() =>
                  navigate("/book/staff", {
                    state: {
                      serviceId: service.id,
                      serviceName: service.name,
                      serviceDuration: service.duration,
                      servicePrice: Number(service.price),
                    },
                  })
                }
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
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {service.duration}min
                      </span>
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

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {salonName}
      </footer>
    </div>
  );
};

export default Index;
