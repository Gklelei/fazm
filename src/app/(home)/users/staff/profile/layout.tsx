import { StaffSideBar } from "@/components/StaffSideBar";
import React, { ReactNode } from "react";

const StaffProfileLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex h-full w-full">
      {/* This sidebar will now sit to the left of the content */}
      <StaffSideBar />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
};

export default StaffProfileLayout;
