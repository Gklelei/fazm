"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import Link from "next/link";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg">
        <Card className="relative overflow-hidden border shadow-lg w-full">
          <CardHeader className="space-y-4 pb-6 pt-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center border-4">
                <AlertTriangle className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Something Went Wrong
              </CardTitle>
              <p className="text-sm font-medium uppercase tracking-wider">
                An unexpected error occurred
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pb-8">
            <p className="text-sm leading-relaxed text-center">
              We hit an unexpected problem while loading this page. You can
              try again, or head back to the homepage. If this keeps
              happening, please contact the system administrator.
            </p>

            <div className="space-y-3">
              <Button onClick={() => reset()} className="w-full h-12 group">
                <RotateCw className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
                <span className="font-semibold">Try Again</span>
              </Button>

              <Button asChild variant="outline" className="w-full h-10">
                <Link
                  href="/"
                  className="flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Return to Homepage</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
