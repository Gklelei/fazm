import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { UtilsProviderWrapper } from "@/Modules/Settings/UtilsProvider";
import { ReactNode } from "react";
import { PageLoader } from "./Alerts/PageLoader";

const MainLayoutWrapper = ({ children }: { children: ReactNode }) => {
  const { utilsLoading } = UseUtilsContext();
  if (utilsLoading) return <PageLoader />;
  return <UtilsProviderWrapper>{children}</UtilsProviderWrapper>;
};

export default MainLayoutWrapper;
