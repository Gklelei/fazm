"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type Section = {
  key: string;
  label: string;
  description?: string;
  content: React.ReactNode;
};

export default function ResponsiveSections({
  sections,
  defaultKey,
  className,
}: {
  sections: Section[];
  defaultKey?: string;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const firstKey = defaultKey ?? sections[0]?.key;

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        <Accordion type="single" collapsible defaultValue={firstKey}>
          {sections.map((s) => (
            <AccordionItem key={s.key} value={s.key}>
              <AccordionTrigger className="text-left">
                <div className="flex flex-col">
                  <span className="font-semibold">{s.label}</span>
                  {s.description ? (
                    <span className="text-xs text-muted-foreground">
                      {s.description}
                    </span>
                  ) : null}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3">{s.content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  return (
    <Tabs defaultValue={firstKey} className={cn("w-full", className)}>
      <div className="w-full overflow-x-auto">
        <TabsList className="inline-flex w-max gap-1">
          {sections.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        <div className="p-4 sm:p-6">
          {sections.map((s) => (
            <TabsContent key={s.key} value={s.key} className="m-0">
              {s.content}
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
