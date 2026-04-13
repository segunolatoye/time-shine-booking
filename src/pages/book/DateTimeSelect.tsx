import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Globe } from "lucide-react";
import { format, addDays, parse, addMinutes, isBefore, isToday, startOfDay, isSameDay } from "date-fns";
import PublicFooter from "@/components/PublicFooter";

const DateTimeSelect = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timezone, setTimezone] = useState<string>("America/New_York");

  // Pre-fetched data for smart calendar
  const [offDays, setOffDays] = useState<number[]>([]);
  const [closureDates, setClosureDates] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;

  useEffect(() => {
    if (!state?.serviceId) {
      navigate("/");
    }
  }, [state, navigate]);

  // Pre-fetch working hours, closures, and timezone for smart calendar
  useEffect(() => {
    if (!state) return;
    const fetchCalendarData = async () => {
      const [whRes, closureRes, tzRes] = await Promise.all([
        state.staffId
          ? supabase.from("working_hours").select("day_of_week, is_off, staff_id").or(`staff_id.is.null,staff_id.eq.${state.staffId}`)
          : supabase.from("working_hours").select("day_of_week, is_off, staff_id").is("staff_id", null),
        supabase.from("closures").select("date, start_time, staff_id")
          .or(`staff_id.is.null${state.staffId ? `,staff_id.eq.${state.staffId}` : ""}`),
        supabase.from("settings").select("value").eq("key", "timezone").maybeSingle(),
      ]);

      // Determine off days - use staff-specific if available, else global
      const hours = whRes.data || [];
      const offDaySet = new Set<number>();
      for (let d = 0; d < 7; d++) {
        const staffHour = hours.find((h: any) => h.day_of_week === d && h.staff_id === state.staffId);
        const globalHour = hours.find((h: any) => h.day_of_week === d && !h.staff_id);
        const hour = staffHour || globalHour;
        if (!hour || hour.is_off) offDaySet.add(d);
      }
      setOffDays(Array.from(offDaySet));

      // Full-day closures (no start_time means full day)
      const fullClosures = (closureRes.data || [])
        .filter((c: any) => !c.start_time)
        .map((c: any) => c.date);
      setClosureDates(fullClosures);

      // Timezone
      const tz = (tzRes.data?.value as any)?.timezone;
      if (tz) setTimezone(tz);

      setDataLoaded(true);
    };
    fetchCalendarData();
  }, [state]);

  // Smart date disabling function
  const isDateDisabled = useCallback((date: Date) => {
    // Past dates
    if (isBefore(date, startOfDay(new Date()))) return true;
    // Off days (recurring weekly)
    if (offDays.includes(date.getDay())) return true;
    // Full-day closures
    const dateStr = format(date, "yyyy-MM-dd");
    if (closureDates.includes(dateStr)) return true;
    return false;
  }, [offDays, closureDates]);

  useEffect(() => {
    if (!selectedDate || !state) return;
    generateSlots(selectedDate);
  }, [selectedDate]);

  const generateSlots = async (date: Date) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, "yyyy-MM-dd");

    // Check closures (partial ones for this specific date)
    const { data: closures } = await supabase
      .from("closures")
      .select("*")
      .eq("date", dateStr)
      .or(`staff_id.is.null${state.staffId ? `,staff_id.eq.${state.staffId}` : ""}`);

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

    // Get buffer time
    const { data: bufferSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "buffer_time")
      .maybeSingle();

    const bufferMinutes = (bufferSetting?.value as any)?.minutes || 0;
    const duration = state.serviceDuration || 60;

    // Generate slots
    const startOfDayTime = parse(workingHour.start_time, "HH:mm:ss", date);
    const endOfDayTime = parse(workingHour.end_time, "HH:mm:ss", date);
    const now = new Date();
    const generatedSlots: string[] = [];

    let cursor = startOfDayTime;
    while (isBefore(addMinutes(cursor, duration), endOfDayTime) || addMinutes(cursor, duration).getTime() === endOfDayTime.getTime()) {
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

  const formatSlotDisplay = (slot: string) => {
    const [h, m] = slot.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex-1 w-full">
        <button
          onClick={() => navigate("/book/staff", { state })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 md:mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-1 md:mb-2">
          Select Date & Time
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mb-1">
          {state?.serviceName} with {state?.staffName}
        </p>
        <p className="text-xs text-muted-foreground mb-6 md:mb-8 flex items-center gap-1">
          <Globe className="w-3 h-3" /> {timezone.replace(/_/g, " ")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Card>
            <CardContent className="p-3 md:p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md pointer-events-auto"
                fromDate={new Date()}
                toDate={addDays(new Date(), 90)}
              />
            </CardContent>
          </Card>

          <div>
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">Select a date to see available times.</p>
              </div>
            ) : loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <p className="text-muted-foreground text-sm">No available time slots for this date.</p>
                <p className="text-xs text-muted-foreground mt-1">Try selecting a different date.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Available times — {format(selectedDate, "MMM d, yyyy")}
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      className="rounded-lg text-sm"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {formatSlotDisplay(slot)}
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
      <PublicFooter />
    </div>
  );
};

export default DateTimeSelect;
