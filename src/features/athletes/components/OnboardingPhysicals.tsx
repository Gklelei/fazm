"use client";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Ruler, Weight, Hand, Footprints, Target } from "lucide-react";

const AthletePhysicals = () => {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Physical Attributes & Playing Position
        </CardTitle>
        <CardDescription>
          Record the athlete&apos;s physical measurements and playing positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="height"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  Height (cm)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    placeholder="e.g., 175"
                    min="0"
                    step="0.1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="weight"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  Weight (kg)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    placeholder="e.g., 70"
                    min="0"
                    step="0.1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="dominantFoot"
            control={control}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                  Dominant Foot
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className="w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select dominant foot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="dominantHand"
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 w-full">
                  <Hand className="h-4 w-4 text-muted-foreground" />
                  Dominant Hand
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl className=" w-full">
                    <SelectTrigger>
                      <SelectValue placeholder="Select dominant hand" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="both">Both (Ambidextrous)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="playingPositions"
          control={control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Playing Positions
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="e.g., Forward, Midfielder, Striker"
                  className="resize-none"
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                List all positions this athlete can play (separate with commas)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default AthletePhysicals;
