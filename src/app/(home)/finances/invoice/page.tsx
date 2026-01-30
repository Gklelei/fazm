import { db } from "@/lib/prisma";
import { getInvoicesQuery } from "@/Modules/Finances/Invoices/Types";
import Invoices from "@/Modules/Finances/Invoices/ui/Invoices";
import React from "react";

const page = async () => {
  const invoices = await db.invoice.findMany(getInvoicesQuery);

  return (
    <div>
      <Invoices data={invoices} />
    </div>
  );
};

export default page;
