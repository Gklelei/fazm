import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, Globe } from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

const AddressInfo = ({ data }: { data: GetAthleteByIdQueryType }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-bold">Address</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Country</span>
              </div>
              <p className="text-sm pl-5">{data.address?.country || "—"}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">County</span>
              </div>
              <p className="text-sm pl-5">{data.address?.county || "—"}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Sub-County</span>
              </div>
              <p className="text-sm pl-5">{data.address?.subCounty || "—"}</p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-medium">Address Line 1</span>
              <p className="text-sm p-2 bg-muted/30 rounded">
                {data.address?.addressLine1 || "—"}
              </p>
            </div>

            {data.address?.addressLine2 && (
              <div className="space-y-1">
                <span className="text-xs font-medium">Address Line 2</span>
                <p className="text-sm p-2 bg-muted/30 rounded">
                  {data.address.addressLine2}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressInfo;
