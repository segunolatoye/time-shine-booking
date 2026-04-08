import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock } from "lucide-react";
import { format, addDays, parse, addMinutes, isBefore, isToday } from "date-fns";

const DateTimeSelect = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  useEffect(() => {
    if (!state?.serviceId) {
      navigate("/");
    }
  }, [state, navigate]);

  useEffect(() => {
    if (!selectedDate || !state) return;
    generateSlots(selectedDate);
  }, [selectedDate]);

  const generateSlots = async (date: Date) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");

    // Check closures
    const { data: closures } = await supabase
      .from("closures")
      .select("*")
      .eq("date", dateStr)
      .or(`staff_id.is.null${state.staffId ? `,staff_id.eq.${state.staffId}` : ""}`);

    const fullDayClosed = (closures || []).some(
      (c: any) => !c.start_time && !c.staff_id
    );
    if (fullDayClosed) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    // Get working hours
    let query = supabase
      .from("working_hours")
      .select("*")
      .eq("day_of_week", dayOfWeek);

    if (state.staffId) {
      query = query.or(`staff_id.is.null,staff_id.eq.${state.staffId}`);
    } else {
      query = query.is("staff_id", null);
    }

    const { data: hours } = await query;

    // Use staff-specific hours if available, else global
    let workingHour = (hours || []).find((h: any) => h.staff_id === state.staffId);
    if (!workingHour) {
      workingHour = (hours || []).find((h: any) => !h.staff_id);
    }

    if (!workingHour || workingHour.is_off) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }

    // Get breaks
    const { data: breaks } = await supabase
      .from("staff_breaks")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .or(state.staffId ? `staff_id.eq.${state.staffId}` : "staff_id.is.null");

    // Get existing bookings
    let bookingQuery = supabase
      .from("bookings")
      .select("start_time, end_time, staff_id")
      .eq("booking_date", dateStr)
      .not("status", "in", '("cancelled")');

    if (state.staffId) {
      bookingQuery = bookingQuery.eq("staff_id", state.staffId);
    }

    const { data: bookings } = await bookingQuery;

    // Get buffer time from settings
    const { data: bufferSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "buffer_time")
      .maybeSingle();

    const bufferMinutes = bufferSetting?.value?.minutes || 0;
    const duration = state.serviceDuration || 60;

    // Generate slots
    const startOfDay = parse(workingHour.start_time, "HH:mm:ss", date);
    const endOfDay = parse(workingHour.end_time, "HH:mm:ss", date);
    const now = new Date();
    const generatedSlots: string[] = [];

    let cursor = startOfDay;
    while (isBefore(addMinutes(cursor, duration), endOfDay) || addMinutes(cursor, duration).getTime() === endOfDay.getTime()) {
      const slotStart = cursor;
      const slotEnd = addMinutes(cursor, duration);
      const slotTimeStr = format(slotStart, "HH:mm");

      // Skip past times for today
      if (isToday(date) && isBefore(slotStart, now)) {
        cursor = addMinutes(cursor, 15);
        continue;
      }

      // Check breaks
      const duringBreak = (breaks || []).some((b: any) => {
        const breakStart = parse(b.start_time, "HH:mm:ss", date);
        const breakEnd = parse(b.end_time, "HH:mm:ss", date);
        return isBefore(slotStart, breakEnd) && isBefore(breakStart, slotEnd);
      });

      // Check existing bookings
      const overlaps = (bookings || []).some((b: any) => {
        const bStart = parse(b.start_time, "HH:mm:ss", date);
        const bEnd = parse(b.end_time, "HH:mm:ss", date);
        const bEndWithBuffer = addMinutes(bEnd, bufferMinutes);
        return isBefore(slotStart, bEndWithBuffer) && isBefore(bStart, slotEnd);
      });

      // Check partial closures
      const partialClosed = (closures || []).some((c: any) => {
        if (!c.start_time) return false;
        const cStart = parse(c.start_time, "HH:mm:ss", date);
        const cEnd = parse(c.end_time, "HH:mm:ss", date);
        return isBefore(slotStart, cEnd) && isBefore(cStart, slotEnd);
      });

      if (!duringBreak && !overlaps && !partialClosed) {
        generatedSlots.push(slotTimeStr);
      }

      cursor = addMinutes(cursor, 15);
    }

    setSlots(generatedSlots);
    setLoadingSlots(false);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedSlot) return;
    const startTime = selectedSlot;
    const endDate = parse(selectedSlot, "HH:mm", selectedDate);
    const endTime = format(addMinutes(endDate, state.serviceDuration || 60), "HH:mm");

    navigate("/book/details", {
      state: {
        ...state,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: startTime + ":00",
        endTime: endTime + ":00",
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate("/book/staff", { state })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
          Select Date & Time
        </h1>
        <p className="text-muted-foreground mb-8">
          {state?.serviceName} with {state?.staffName}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, addDays(new Date(), -1))}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <div>
            {!selectedDate ? (
              <p className="text-muted-foreground">Please select a date to see available times.</p>
            ) : loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground">No available time slots for this date.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Available times
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      className="rounded-lg"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
                {selectedSlot && (
                  <Button className="w-full mt-6 rounded-full" size="lg" onClick={handleContinue}>
                    Continue
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimeSelect;
