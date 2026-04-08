import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, DollarSign, Sparkles } from "lucide-react";

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      setServices(data || []);
      setLoading(false);
    };
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 px-4 text-center bg-gradient-to-b from-secondary to-background">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-6" />
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">
            Luxe Salon
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Indulge in premium hair care crafted by expert stylists. Book your appointment today.
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-6 rounded-full shadow-lg"
            onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Services
          </Button>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-serif font-semibold text-center text-foreground mb-12">
          Our Services
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4 w-2/3" />
                  <div className="h-4 bg-muted rounded mb-2 w-full" />
                  <div className="h-4 bg-muted rounded mb-4 w-3/4" />
                  <div className="h-10 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No services available at the moment. Please check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card
                key={service.id}
                className="group hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {service.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {service.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {Number(service.price).toFixed(2)}
                    </span>
                  </div>
                  <Button
                    className="w-full rounded-full"
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
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Luxe Salon. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
