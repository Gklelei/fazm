import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Eye,
  File,
  Calendar,
  User,
  MessageSquare,
  DollarSign,
  Receipt,
  CheckCircle,
  Loader2,
  Download,
} from "lucide-react";
import { UseFetchTransactionDetails } from "../Api/FetchTransactionDetails";
import { Empty, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageLoader } from "@/utils/Alerts/PageLoader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReceiptPDF } from "./ReceiptPDF";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";

const TransactionDetails = ({ id }: { id: string }) => {
  const [open, setIsOpen] = useState<boolean>(false);
  const { data, isLoading, refetch } = UseFetchTransactionDetails(id);
  const { data: utils } = UseUtilsContext();

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  return (
    <div>
      <Sheet onOpenChange={setIsOpen} open={open}>
        <SheetTrigger asChild>
          <Button variant={"outline"} size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto">
          <SheetHeader className="text-left px-0">
            {/* Added text-left and px-0 */}
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </SheetTitle>
            {data && (
              <PDFDownloadLink
                document={<ReceiptPDF data={data} academyConfig={utils} />}
                fileName={`Receipt-${data.receiptNumber}.pdf`}
              >
                {({ loading }) => (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </SheetHeader>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <PageLoader />
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-full">
              <Empty>
                <EmptyMedia>
                  <File className="h-12 w-12 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No records found for this transaction</EmptyTitle>
              </Empty>
            </div>
          ) : (
            <div className="px-4 sm:px-6 space-y-6">
              <div className="rounded-lg border p-6 bg-muted/20">
                {/* Increased padding to p-6 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Receipt #{data.receiptNumber}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(data.paymentDate), "PPP")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      data.paymentType === "CASH" ? "default" : "secondary"
                    }
                  >
                    {data.paymentType}
                  </Badge>
                </div>
              </div>
              {/* Athlete Information */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Athlete Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Increased gap to 6 */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium text-base">{`${data.athlete.firstName} ${data.athlete.lastName}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Athlete ID
                    </p>
                    <p className="font-medium text-base">{data.athleteId}</p>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Payment Details */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Amount Paid
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      KES {data.amountPaid.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Collected By
                    </p>
                    <p className="font-medium text-base">{data.collectedBy}</p>
                  </div>
                </div>
              </div>
              <Separator />
              {/* Subscription Period */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Subscription Period
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Start Date
                    </p>
                    <p className="font-medium text-base">
                      {format(new Date(data.invoice?.subscriptionPlan.), "PPP")}
                    </p>
                  </div> */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      End Date
                    </p>
                    <p className="font-medium text-base">
                      {format(new Date(String(data.invoice?.dueDate)), "PPP")}
                    </p>
                  </div>
                </div>
                {/* <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium text-base">
                    {Math.ceil(
                      (new Date(data.invoice?.nextBillingDate || "").getTime() -
                        new Date(data.invoice?.periodStart ?? "").getTime()) /
                        (1000 * 60 * 60 * 24),
                    )}{" "}
                    days
                  </p>
                </div> */}
              </div>
              {/* Notes */}
              {data.notes && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Notes
                    </h4>
                    <div className="rounded-lg border p-4 bg-muted/10">
                      {/* Increased padding */}
                      <p className="text-sm leading-relaxed">{data.notes}</p>
                    </div>
                  </div>
                </>
              )}
              {/* Timestamps */}
              <Separator />
              {/* <div className="space-y-2 text-sm text-muted-foreground">
                <p>Created: {format(new Date(data.createdAt), "PPpp")}</p>
                <p>Updated: {format(new Date(data.updatedAt), "PPpp")}</p>
              </div> */}
              {/* Status Badge */}
              <div className="flex items-center justify-center pt-4 pb-6">
                {" "}
                {/* Added bottom padding */}
                <Badge
                  variant="outline"
                  className="px-4 py-2 border-green-500 text-green-500"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Payment Completed
                </Badge>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TransactionDetails;
