import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";

interface Staff {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
}

const StaffSelect = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  useEffect(() => {
    if (!state?.serviceId) {
      navigate("/");
      return;
    }
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("staff_services")
        .select("staff:staff_id(id, name, bio, photo_url)")
        .eq("service_id", state.serviceId);

      const staffMembers = (data || [])
        .map((d: any) => d.staff)
        .filter(Boolean);
      setStaffList(staffMembers);
      setLoading(false);
    };
    fetchStaff();
  }, [state, navigate]);

  const selectStaff = (staff: Staff | null) => {
    navigate("/book/datetime", {
      state: {
        ...state,
        staffId: staff?.id || null,
        staffName: staff?.name || "Any Available",
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </button>

        <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
          Choose Your Stylist
        </h1>
        <p className="text-muted-foreground mb-8">
          For <span className="font-medium text-foreground">{state?.serviceName}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Any Available option */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-primary/30 hover:border-primary"
            onClick={() => selectStaff(null)}
          >
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-serif font-semibold text-foreground mb-1">Any Available</h3>
              <p className="text-sm text-muted-foreground">We'll match you with the best available stylist</p>
            </CardContent>
          </Card>

          {loading ? (
            [1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4" />
                  <div className="h-5 bg-muted rounded mb-2 w-2/3 mx-auto" />
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                </CardContent>
              </Card>
            ))
          ) : (
            staffList.map((staff) => (
              <Card
                key={staff.id}
                className="cursor-pointer hover:shadow-lg transition-all border-border/50 hover:border-primary/50"
                onClick={() => selectStaff(staff)}
              >
                <CardContent className="p-6 text-center">
                  {staff.photo_url ? (
                    <img
                      src={staff.photo_url}
                      alt={staff.name}
                      className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="font-serif font-semibold text-foreground mb-1">{staff.name}</h3>
                  {staff.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{staff.bio}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default StaffSelect;
