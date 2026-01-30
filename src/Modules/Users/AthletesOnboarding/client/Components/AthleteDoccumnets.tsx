// import { CloudinaryUpload } from "@/components/ImageUploader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFormContext } from "react-hook-form";
import {
  FileText,
  CreditCard,
  BookOpen,
  Info,
  CheckCircle2,
} from "lucide-react";
import { LocalFsUpload } from "@/components/FsUploader/LocalFsImageUploader";

const AthleteDoccumnets = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Identity Verification
        </CardTitle>
        <CardDescription>
          Upload a valid identification document to verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="birth-cert" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="birth-cert" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Birth Certificate</span>
              <span className="sm:hidden">Birth Cert</span>
            </TabsTrigger>
            <TabsTrigger value="national-id" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">National ID</span>
              <span className="sm:hidden">ID</span>
            </TabsTrigger>
            <TabsTrigger value="passport" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Passport</span>
            </TabsTrigger>
          </TabsList>

          {/* Birth Certificate Tab */}
          <TabsContent value="birth-cert" className="space-y-4 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">Upload Requirements:</p>
                <ul className="space-y-1 text-sm list-none">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Take the photo in a well-lit environment
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Ensure all text is clear and readable
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Accepted formats: PNG, JPG, JPEG (max 4MB)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <FormField
              name="birthCertificate"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth Certificate Image</FormLabel>
                  <FormControl>
                    {/* <CloudinaryUpload
                      onChange={field.onChange}
                      value={field.value}
                      maxSizeMB={4}
                      folder="fazam/documents"
                    /> */}
                    <LocalFsUpload
                      onChange={(url: string) => {
                        field.onChange(url);
                      }}
                      value={field.value || ""}
                      folder="BIRTH_CERTIFICATES"
                      maxSizeMB={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* National ID Tab */}
          <TabsContent value="national-id" className="space-y-4 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">Upload Requirements:</p>
                <ul className="space-y-1 text-sm list-none">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Take photos in a well-lit room
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Do not cover or censor any part of the ID
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Ensure name, photo, and signature are visible
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Accepted formats: PNG, JPG, JPEG (max 4MB each)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="idFront"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>National ID - Front Side</FormLabel>
                    <FormControl>
                      {/* <CloudinaryUpload
                        onChange={field.onChange}
                        value={field.value}
                        maxSizeMB={4}
                        folder="fazam/documents"
                      /> */}
                      <LocalFsUpload
                        onChange={(url: string) => {
                          field.onChange(url);
                        }}
                        value={field.value || ""}
                        folder="NATIONAL_IDENTIFICATIONS"
                        maxSizeMB={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="idBack"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>National ID - Back Side</FormLabel>
                    <FormControl>
                      {/* <CloudinaryUpload
                        onChange={field.onChange}
                        value={field.value}
                        maxSizeMB={4}
                        folder="fazam/documents"
                      /> */}

                      <LocalFsUpload
                        onChange={(url: string) => {
                          field.onChange(url);
                        }}
                        value={field.value || ""}
                        folder="NATIONAL_IDENTIFICATIONS"
                        maxSizeMB={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Passport Tab */}
          <TabsContent value="passport" className="space-y-4 mt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">Upload Requirements:</p>
                <ul className="space-y-1 text-sm list-none">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Take photos in a well-lit environment
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Ensure face and ID details are clearly visible
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Do not cover or censor any information
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Accepted formats: PNG, JPG, JPEG (max 4MB each)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="passportPage"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport Bio-Data Page</FormLabel>
                    <FormControl>
                      {/* <CloudinaryUpload
                        onChange={field.onChange}
                        value={field.value}
                        maxSizeMB={4}
                        folder="fazam/documents"
                      /> */}
                      <LocalFsUpload
                        onChange={(url: string) => {
                          field.onChange(url);
                        }}
                        value={field.value || ""}
                        folder="PASSPORTS"
                        maxSizeMB={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="passportCover"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport Front Cover</FormLabel>
                    <FormControl>
                      {/* <CloudinaryUpload
                        onChange={field.onChange}
                        value={field.value}
                        maxSizeMB={4}
                        folder="fazam/documents"
                      /> */}
                      <LocalFsUpload
                        onChange={(url: string) => {
                          field.onChange(url);
                        }}
                        value={field.value || ""}
                        folder="PASSPORTS"
                        maxSizeMB={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AthleteDoccumnets;
