import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, Droplets, Pill } from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

const MedicalEmergencyInformation = ({
  data,
}: {
  data: GetAthleteByIdQueryType;
}) => {
  const hasAllergies =
    data.medical?.allergies && data.medical.allergies.length > 0;
  const hasConditions =
    data.medical?.medicalConditions &&
    data.medical.medicalConditions.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10">
            <Activity className="h-4 w-4 text-amber-600" />
          </div>
          <CardTitle className="text-base font-bold">Medical Info</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Blood Group */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Blood Group</span>
            </div>
            <Badge className="px-2.5 py-1 bg-primary/10 text-primary">
              {data.medical?.bloogGroup || "—"}
            </Badge>
          </div>

          {/* Allergies */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Allergies</span>
            </div>
            {hasAllergies ? (
              <div className="flex flex-wrap gap-1.5">
                {data.medical?.allergies.map((item, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs gap-1 px-2 py-0.5"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {item}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">
                No allergies recorded
              </p>
            )}
          </div>

          {/* Medical Conditions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Medical Conditions</span>
            </div>
            {hasConditions ? (
              <div className="flex flex-wrap gap-1.5">
                {data.medical?.medicalConditions.map((item, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs bg-purple-50 border-purple-200 text-purple-700"
                  >
                    {i + 1}. {item}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">
                No medical conditions
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MedicalEmergencyInformation;
