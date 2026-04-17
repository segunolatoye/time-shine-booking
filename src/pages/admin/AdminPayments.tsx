import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, RotateCcw, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/admin/DataTable";

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refundPayment, setRefundPayment] = useState<any>(null);
  const [refundNotes, setRefundNotes] = useState("");
  const [cancelBookingToo, setCancelBookingToo] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, bookings(customer_name, customer_email, customer_phone, booking_date, services(name, price))")
      .order("created_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const filteredPayments = statusFilter === "all" ? payments : payments.filter((p) => p.status === statusFilter);

  const verifyPayment = async (payment: any, approved: boolean) => {
    const total = Number(payment.service_total || payment.bookings?.services?.price || 0);
    const paid = Number(payment.amount);
    const balanceRemaining = payment.service_total > 0 ? Number(payment.balance_remaining) : Math.max(0, total - paid);
    
    const newStatus = approved ? (balanceRemaining > 0 ? "paid_partial" : "paid_full") : "failed";
    const { error } = await supabase.from("payments").update({
      status: newStatus as any,
      verified_at: new Date().toISOString(),
      admin_notes: approved ? payment.admin_notes : "Rejected by admin",
    }).eq("id", payment.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (approved) {
      await supabase.from("bookings").update({ status: "confirmed" as any }).eq("id", payment.booking_id);
    }
    toast({ title: approved ? "Payment approved" : "Payment rejected" });
    fetchPayments();
  };

  const confirmRefund = async () => {
    if (!refundPayment) return;
    const { error } = await supabase.from("payments").update({
      status: "refunded" as any,
      admin_notes: refundNotes || "Refunded by admin",
      verified_at: new Date().toISOString(),
    }).eq("id", refundPayment.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (cancelBookingToo) {
      await supabase.from("bookings").update({ status: "cancelled" as any }).eq("id", refundPayment.booking_id);
    }
    toast({ title: "Payment refunded" });
    setRefundPayment(null);
    setRefundNotes("");
    setCancelBookingToo(true);
    fetchPayments();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("payments").delete().eq("id", deleteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Payment deleted" }); fetchPayments(); }
    setDeleteId(null);
  };

  const viewReceipt = async (urlOrPath: string) => {
    if (!urlOrPath) return;
    // If it's already a full public URL, just open it
    if (urlOrPath.startsWith("http")) {
      setReceiptUrl(urlOrPath);
      return;
    }
    // Otherwise, generate a secure temporary URL from the private bucket
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(urlOrPath, 60);
    if (error) {
      toast({ title: "Error loading receipt", description: error.message, variant: "destructive" });
    } else if (data) {
      setReceiptUrl(data.signedUrl);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      pending_verification: "bg-blue-100 text-blue-800",
      paid_partial: "bg-green-100 text-green-800",
      paid_full: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-muted text-muted-foreground",
    };
    return colors[status] || "";
  };

  const canRefund = (status: string) => ["paid_full", "paid_partial"].includes(status);

  const columns: Column<any>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{p.bookings?.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{p.bookings?.customer_email}</p>
          {p.bookings?.customer_phone && <p className="text-xs text-muted-foreground truncate">{p.bookings?.customer_phone}</p>}
          <p className="text-xs text-muted-foreground truncate">{p.bookings?.services?.name}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (p) => {
        const total = Number(p.service_total || p.bookings?.services?.price || 0);
        const paid = Number(p.amount);
        const balance = p.service_total > 0 ? Number(p.balance_remaining) : Math.max(0, total - paid);
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium">${paid.toFixed(2)}</p>
            {balance > 0 && p.status !== "failed" && p.status !== "refunded" && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">Bal: ${balance.toFixed(2)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "method",
      header: "Method",
      hideOnMobile: true,
      render: (p) => <span className="text-sm">{p.method === "cash_app" ? "Cash App" : "Zelle"}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      hideOnMobile: true,
      render: (p) => <span className="text-xs text-muted-foreground">{p.reference || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge className={`${statusColor(p.status)} border-0 text-xs`}>
          {p.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      render: (p) => {
        // Check an expanded list of common field names where the file might be saved
        let url = p.proof_screenshot_url || p.receipt_url || p.receipt || p.proof_url || p.proof || p.payment_proof || p.metadata?.receipt_url;
        if (url === "null" || url === "undefined") url = null;
        
        return url ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewReceipt(url)}>
            <FileText className="w-3 h-3 mr-1" /> View
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      hideOnMobile: true,
      render: (p) => <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</span>,
    },
  ];

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-4 md:mb-6">Payment Verification</h1>

      <DataTable
        data={filteredPayments}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by customer, email, or phone..."
        searchFn={(p, q) =>
          p.bookings?.customer_name?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          p.bookings?.customer_email?.toLowerCase().includes(q) ||
          p.bookings?.customer_phone?.toLowerCase().includes(q)
        }
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_verification">Pending Verification</SelectItem>
              <SelectItem value="paid_full">Paid Full</SelectItem>
              <SelectItem value="paid_partial">Paid Partial</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={(p) => (
          <div className="flex gap-1">
            {p.status === "pending_verification" && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" title="Approve" onClick={() => verifyPayment(p, true)}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Reject" onClick={() => verifyPayment(p, false)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </>
            )}
            {canRefund(p.status) && (
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Refund" onClick={() => { setRefundPayment(p); setRefundNotes(""); setCancelBookingToo(true); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteId(p.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        emptyMessage="No payments yet."
      />

      <Dialog open={!!refundPayment} onOpenChange={(v) => !v && setRefundPayment(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Refund Payment</DialogTitle>
          </DialogHeader>
          {refundPayment && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>{refundPayment.bookings?.customer_name}</strong></p>
                <p className="text-muted-foreground">${Number(refundPayment.amount).toFixed(2)} via {refundPayment.method === "cash_app" ? "Cash App" : "Zelle"}</p>
              </div>
              <div>
                <Label>Admin Notes (optional)</Label>
                <Textarea value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} className="mt-1" placeholder="Reason for refund..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={cancelBookingToo} onCheckedChange={setCancelBookingToo} />
                <Label className="text-sm">Also cancel the associated booking</Label>
              </div>
              <Button className="w-full rounded-full" onClick={confirmRefund}>Confirm Refund</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete this payment record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Payment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!receiptUrl} onOpenChange={(v) => !v && setReceiptUrl(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptUrl && (
          <div className="flex-1 overflow-hidden rounded-md border border-border bg-secondary/10 flex flex-col relative">
            <img 
              src={receiptUrl} 
              alt="Payment Receipt" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <iframe src={receiptUrl} className="w-full h-full hidden" title="Payment Receipt" />
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-border">
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                Open in New Tab
              </a>
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;
