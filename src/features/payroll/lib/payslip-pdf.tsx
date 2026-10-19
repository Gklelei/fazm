import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { letterhead } from "@/features/finance/lib/statement-pdf";
import { PayslipDocument, type PayslipData } from "../components/PayslipDocument";

export const payslipPdf = async (slip: PayslipData, baseUrl: string) =>
  renderToBuffer(<PayslipDocument academy={await letterhead()} logoUrl={`${baseUrl}/Fazam Logo Half.jpg`} slip={slip} />);
