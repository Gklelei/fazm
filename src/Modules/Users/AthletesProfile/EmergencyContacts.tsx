import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Heart, Plus, Edit, Trash2 } from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

const EmergencyContacts = ({ data }: { data: GetAthleteByIdQueryType }) => {
  const hasContacts =
    data.emergencyContacts && data.emergencyContacts.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-destructive/10">
              <Heart className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-base font-bold">
              Emergency Contacts
            </CardTitle>
          </div>
          <Button size="sm" className="gap-1.5 h-8 text-xs hidden">
            <Plus className="h-3.5 w-3.5" />
            Add Contact
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasContacts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.emergencyContacts?.map((contact, i) => (
              <div
                key={contact.id}
                className="border rounded-lg p-3 border-destructive/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-destructive/10 text-destructive text-xs h-5 w-5 p-0 justify-center">
                      {i + 1}
                    </Badge>
                    <h3 className="font-semibold text-sm">{contact.name}</h3>
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
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {contact.phoneNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {contact.relationship}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex p-2 rounded-full bg-muted mb-3">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">
              No Emergency Contacts
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add contacts for emergency situations
            </p>
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Contact
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyContacts;
