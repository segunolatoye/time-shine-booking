import React, { createContext, useContext, useState, ReactNode } from "react";

export interface BookingData {
  serviceId?: string;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: number;
  staffId?: string | null;
  staffName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: "cash_app" | "zelle";
}

interface BookingContextType {
  booking: BookingData;
  setBooking: (data: Partial<BookingData>) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [booking, setBookingState] = useState<BookingData>({});

  const setBooking = (data: Partial<BookingData>) => {
    setBookingState((prev) => ({ ...prev, ...data }));
  };

  const resetBooking = () => setBookingState({});

  return (
    <BookingContext.Provider value={{ booking, setBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used within BookingProvider");
  return context;
}
