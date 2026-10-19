"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { ActionError, asRole } from "@/lib/action";
import { createAuditLog } from "@/lib/audit";
import { formatCurrency } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { academyDate } from "@/lib/academy-time";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { athleteName } from "@/features/athletes/lib/names";
import { adjustSchema, productSchema, receiveSchema, saleSchema, type AdjustInput, type ProductInput, type ReceiveInput, type SaleInput } from "../schemas";
import { moveStock, nextSaleNumber, variantLabel } from "../lib/stock";

const done = (message: string) => {
  revalidatePath("/shop", "layout");
  return { success: true as const, message };
};

/** A product and its sizes. New sizes can start with opening stock; removed sizes with history are hidden, not deleted. */
export async function saveProduct(input: ProductInput) {
  return asRole("finance", async (user) => {
    const { id, variants, ...v } = productSchema.parse(input);
    const data = { ...v, description: v.description || null, photo: v.photo || null };
    const productId = await db.$transaction(async (tx) => {
      const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
      const existing = await tx.productVariant.findMany({ where: { productId: product.id }, select: { id: true, _count: { select: { movements: true, saleLines: true } } } });
      const kept = new Set(variants.map((x) => x.id).filter(Boolean));
      for (const old of existing.filter((e) => !kept.has(e.id))) {
        if (old._count.movements || old._count.saleLines) await tx.productVariant.update({ where: { id: old.id }, data: { isArchived: true } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const [position, x] of variants.entries()) {
        const fields = { size: x.size, colour: x.colour, position, isArchived: false };
        const saved = x.id && existing.some((e) => e.id === x.id)
          ? await tx.productVariant.update({ where: { id: x.id }, data: fields })
          : await tx.productVariant.upsert({ where: { productId_size_colour: { productId: product.id, size: x.size, colour: x.colour } }, create: { productId: product.id, ...fields }, update: fields });
        if (!x.id && x.opening > 0) await moveStock(tx, { variantId: saved.id, quantity: x.opening, kind: "RECEIVED", note: "Opening stock", userId: user.id });
      }
      return product.id;
    });
    await createAuditLog({ action: id ? "UPDATE_PRODUCT" : "CREATE_PRODUCT", resource: "Shop", recordId: productId, userId: user.id, details: `${id ? "Changed" : "Added"} ${v.name} (${formatCurrency(v.price)}, ${variants.length} sizes)` });
    return { ...done(`${v.name} saved`), id: productId };
  });
}

export async function archiveProduct(id: string, archived: boolean) {
  return asRole("finance", async (user) => {
    const p = await db.product.update({ where: { id }, data: { isArchived: archived }, select: { name: true } });
    await createAuditLog({ action: archived ? "ARCHIVE_PRODUCT" : "RESTORE_PRODUCT", resource: "Shop", recordId: id, userId: user.id, details: `${archived ? "Took" : "Put"} ${p.name} ${archived ? "off" : "back on"} sale` });
    return done(archived ? `${p.name} taken off sale` : `${p.name} back on sale`);
  });
}

/** A delivery: stock in for one or more sizes. */
export async function receiveStock(input: ReceiveInput) {
  return asRole("finance", async (user) => {
    const v = receiveSchema.parse(input);
    const lines = v.lines.filter((l) => l.quantity > 0);
    if (!lines.length) throw new ActionError("Enter how many came in for at least one size.");
    const total = lines.reduce((s, l) => s + l.quantity, 0);
    await db.$transaction(async (tx) => {
      for (const l of lines) await moveStock(tx, { variantId: l.variantId, quantity: l.quantity, kind: "RECEIVED", note: v.note, userId: user.id });
    });
    const product = await db.productVariant.findUnique({ where: { id: lines[0].variantId }, select: { product: { select: { id: true, name: true } } } });
    await createAuditLog({ action: "RECEIVE_STOCK", resource: "Shop", recordId: product?.product.id, userId: user.id, details: `Received ${total} ${product?.product.name ?? "items"}${v.note ? ` (${v.note})` : ""}` });
    return done(`${total} added to stock`);
  });
}

/** Sets a size's stock to what was counted, with the reason. */
export async function adjustStock(input: AdjustInput) {
  return asRole("finance", async (user) => {
    const v = adjustSchema.parse(input);
    const variant = await db.productVariant.findUnique({ where: { id: v.variantId }, select: { stock: true, size: true, colour: true, product: { select: { id: true, name: true } } } });
    if (!variant) throw new ActionError("That size no longer exists. Refresh the page.");
    const label = variantLabel(variant.product.name, variant);
    await db.$transaction(async (tx) => {
      const { stock } = await tx.productVariant.findUniqueOrThrow({ where: { id: v.variantId }, select: { stock: true } });
      await moveStock(tx, { variantId: v.variantId, quantity: v.count - stock, kind: "ADJUSTED", note: v.note, userId: user.id, label });
    });
    await createAuditLog({ action: "ADJUST_STOCK", resource: "Shop", recordId: variant.product.id, userId: user.id, details: `Set ${label} stock from ${variant.stock} to ${v.count} (${v.note})` });
    return done(`${label}: ${v.count} in stock`);
  });
}

/** A sale: prices from the catalogue, stock taken out, paid now or charged to the athlete as an invoice. */
export async function createSale(input: SaleInput) {
  return asRole("finance", async (user) => {
    const v = saleSchema.parse(input);
    const athlete = v.athleteId
      ? await db.athlete.findUnique({ where: { athleteId: v.athleteId }, select: { id: true, athleteId: true, firstName: true, middleName: true, lastName: true } })
      : null;
    if (v.athleteId && !athlete) throw new ActionError("That athlete no longer exists. Pick again.");

    const quantities = new Map<string, number>();
    for (const l of v.lines) quantities.set(l.variantId, (quantities.get(l.variantId) ?? 0) + l.quantity);
    const variants = await db.productVariant.findMany({
      where: { id: { in: [...quantities.keys()] }, isArchived: false, product: { isArchived: false } },
      select: { id: true, size: true, colour: true, product: { select: { name: true, price: true } } },
    });
    if (variants.length !== quantities.size) throw new ActionError("Something in the sale is no longer for sale. Refresh the page.");
    const lines = variants.map((x) => {
      const quantity = quantities.get(x.id)!;
      const unitPrice = new Prisma.Decimal(x.product.price);
      return { variantId: x.id, description: variantLabel(x.product.name, x), quantity, unitPrice, amount: unitPrice.mul(quantity) };
    });
    const total = lines.reduce((s, l) => s.add(l.amount), new Prisma.Decimal(0));
    const now = new Date();
    const onAccount = v.payment === "ACCOUNT";
    const s = onAccount ? await getSettings() : null;

    const sale = await db.$transaction(async (tx) => {
      const saleNumber = await nextSaleNumber(tx, Number(academyDate(now).slice(0, 4)));
      let invoiceId: string | undefined;
      if (onAccount) {
        const [invoiceNumber] = await nextDocumentNumbers(tx, "INV", 1, now);
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            athleteId: athlete!.athleteId,
            type: "ITEM_PURCHASE",
            description: `Shop ${saleNumber}`,
            lines: { create: lines.map((l, position) => ({ position, description: l.description, quantity: l.quantity, unitAmount: l.unitPrice, amount: l.amount })) },
            unitAmount: total,
            quantity: 1,
            amountDue: total,
            amountPaid: new Prisma.Decimal(0),
            status: "PENDING",
            dueDate: new Date(now.getTime() + s!.invoiceDueDays * 86_400_000),
            isRecurring: false,
            issuedBy: user.name,
          },
        });
        invoiceId = invoice.id;
      }
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          athleteId: athlete?.id,
          customerName: athlete ? null : v.customerName || null,
          status: onAccount ? "ON_ACCOUNT" : "PAID",
          paymentType: onAccount ? null : v.payment,
          reference: v.reference || null,
          notes: v.notes || null,
          total,
          invoiceId,
          soldById: user.id,
          soldBy: user.name,
          lines: { create: lines },
        },
      });
      for (const l of lines) await moveStock(tx, { variantId: l.variantId, quantity: -l.quantity, kind: "SOLD", saleId: sale.id, userId: user.id, label: l.description });
      return sale;
    });

    const who = athlete ? athleteName(athlete) : v.customerName || "walk-in";
    await createAuditLog({
      action: "CREATE_SALE",
      resource: "Shop",
      recordId: sale.saleNumber,
      userId: user.id,
      athleteId: athlete?.id,
      details: `Sold ${lines.reduce((n, l) => n + l.quantity, 0)} items to ${who} for ${formatCurrency(Number(total))} (${sale.saleNumber}${onAccount ? ", on account" : ""})`,
    });
    if (athlete) revalidatePath("/players/user-profile/[id]", "page");
    return { ...done(onAccount ? `${sale.saleNumber} charged to ${who}'s account` : `${sale.saleNumber} recorded`), saleNumber: sale.saleNumber };
  });
}

/** Cancels a sale and puts the items back in stock. A charge to an account is cancelled too, while nothing has been paid on it. */
export async function cancelSale(saleNumber: string, reason: string) {
  return asRole("finance", async (user) => {
    const why = reason.trim().slice(0, 200);
    if (!why) throw new ActionError("Say why it's being cancelled.");
    const sale = await db.sale.findUnique({ where: { saleNumber }, include: { lines: true, invoice: { select: { id: true, amountPaid: true, invoiceNumber: true } } } });
    if (!sale) throw new ActionError("That sale no longer exists. Refresh the page.");
    if (sale.status === "CANCELLED") throw new ActionError("That sale is already cancelled.");
    if (sale.invoice && Number(sale.invoice.amountPaid) > 0) throw new ActionError(`Something has been paid on ${sale.invoice.invoiceNumber}. Sort out the payment first.`);
    await db.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED", cancelledAt: new Date(), notes: [sale.notes, `Cancelled: ${why}`].filter(Boolean).join("\n") } });
      if (sale.invoice) await tx.invoice.update({ where: { id: sale.invoice.id }, data: { status: "CANCELED" } });
      for (const l of sale.lines) await moveStock(tx, { variantId: l.variantId, quantity: l.quantity, kind: "RETURNED", saleId: sale.id, note: why, userId: user.id });
    });
    await createAuditLog({ action: "CANCEL_SALE", resource: "Shop", recordId: saleNumber, userId: user.id, athleteId: sale.athleteId ?? undefined, details: `Cancelled ${saleNumber} (${formatCurrency(Number(sale.total))}): ${why}` });
    revalidatePath("/invoices");
    return done(`${saleNumber} cancelled; items back in stock`);
  });
}
