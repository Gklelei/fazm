import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
// import PaymentModal from "@/Modules/Finances/Ui/PaymentModal";
import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import { Calendar, Mail, Phone, Shield, Target, Activity } from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

const PersonalInfo = ({ data }: { data: GetAthleteByIdQueryType }) => {
  const memberSince = new Date(data.createdAt || new Date()).getFullYear();

  const statusMessages: Record<string, string> = {
    " ACTIVE": "Athlete is eligible for training and matches.",
    PENDING: "Registration under review by the academy.",
    " DEACTIVATED": "Account suspended. Contact administration.",
    "  DEFAULT": "Awaiting initial document upload.",
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-start">
          <div className="flex flex-col items-center md:items-start md:w-1/4">
            <div className="relative mb-3">
              <ProfileAvatar
                name={`${data.firstName}${data.lastName}`}
                url={data.profilePIcture || ""}
                size={250}
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-bold text-lg">
                {data.firstName} {data.lastName}
              </h2>
              <Badge variant="outline" className="gap-1 mt-1 text-xs">
                <Calendar className="h-3 w-3" />
                Member since {memberSince}
              </Badge>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Athlete ID</span>
              </div>
              <span className="font-mono text-sm font-bold">
                {data.athleteId}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Position</span>
              </div>
              <span className="text-sm font-semibold">{data.positions}</span>
            </div>

            <div className="flex flex-col p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Contact</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {data.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">
                    {data.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-2 md:col-span-3 p-3 rounded-lg border bg-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Account Status</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span
                      className={cn(
                        "font-medium",
                        data.status === "ACTIVE"
                          ? "text-green-600"
                          : data.status === "PENDING"
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {data.status.trim()}
                    </span>
                    {" • "}
                    {statusMessages[data.status] || "Unknown status"}
                  </p>
                </div>
                <div>
                  {/* <Sheet>
                    <SheetTrigger asChild>
                      <Button size="sm" className="gap-1 h-8 text-xs">
                        <CreditCard className="h-3 w-3" />
                        Make Payment
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <PaymentModal id={data.athleteId} />
                    </SheetContent>
                  </Sheet> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalInfo;
