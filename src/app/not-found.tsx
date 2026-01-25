"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full border-2 border-dashed opacity-10"></div>
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full border-2 border-dashed opacity-10"></div>

        <Card className="relative overflow-hidden border shadow-lg w-full">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-current to-transparent opacity-5"></div>

          <CardHeader className="space-y-4 pb-6 pt-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-4">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background">
                  <span className="text-lg font-black">404</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Page Not Found
              </CardTitle>
              <p className="text-sm font-medium uppercase tracking-wider">
                The requested resource is unavailable
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pb-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">!</span>
                </div>
                <p className="text-sm leading-relaxed text-left">
                  This page may have been moved, deleted, or you might have
                  followed an incorrect link. If you believe this is an error,
                  please contact the system administrator for assistance.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">i</span>
                </div>
                <p className="text-sm leading-relaxed text-left">
                  Check the URL for typos or navigate back to the homepage using
                  the button below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 group">
                <Link
                  href="/"
                  className="flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span className="font-semibold">Return to Homepage</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-10 group"
                onClick={() => window.history.back()}
              >
                <div className="flex items-center justify-center space-x-2 cursor-pointer">
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  <span className="text-sm">Go Back to Previous Page</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
