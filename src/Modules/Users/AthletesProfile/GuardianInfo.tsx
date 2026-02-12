import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Phone,
  Mail,
  Shield,
  Edit,
  Trash2,
  Contact,
} from "lucide-react";
import AddGuardian from "./EditUserProfile/AddGuardian";
import { GetAthleteByIdQueryType } from "../Types";

const GuardianInfo = ({ data }: { data?: GetAthleteByIdQueryType }) => {
  const hasGuardians = data?.guardians && data.guardians.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Guardians</CardTitle>
          </div>
          <AddGuardian athleteId={data && data.athleteId} />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasGuardians ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.guardians?.map((guardian, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-primary/10">
                      <Contact className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-1.5">
                        {guardian.fullNames}
                        {index === 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                          >
                            Primary
                          </Badge>
                        )}
                      </h3>
                      <Badge variant="secondary" className="gap-1 text-xs mt-1">
                        <Shield className="h-2.5 w-2.5" />
                        {guardian.relationship}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary hidden"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hidden"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-muted">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">
                      {guardian.phoneNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-muted">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      {guardian.email}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex p-2 rounded-full bg-muted mb-3">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No Guardians</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add guardians for emergency contact
            </p>
            <AddGuardian athleteId={data && data.athleteId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GuardianInfo;
