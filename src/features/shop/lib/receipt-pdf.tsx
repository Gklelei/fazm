import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { letterhead } from "@/features/finance/lib/statement-pdf";
import type { SaleDetail } from "../queries";
import { SaleReceiptDocument } from "../components/SaleReceiptDocument";

export const saleReceiptPdf = async (sale: SaleDetail, baseUrl: string) =>
  renderToBuffer(<SaleReceiptDocument academy={await letterhead()} logoUrl={`${baseUrl}/Fazam Logo Half.jpg`} sale={sale} />);
