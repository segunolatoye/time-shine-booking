import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
            Payment Submitted!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your payment has been successfully submitted and is currently pending verification. You can check your booking details anytime using your personal link.
          </p>
          <Button
            onClick={() => navigate(`/booking/${token}`)}
            className="w-full rounded-full"
            size="lg"
          >
            View Booking Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;