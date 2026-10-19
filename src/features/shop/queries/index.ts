import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { cursorArgs, pageOf } from "@/lib/cursor";
import { getSettings } from "@/lib/settings";
import { athleteName } from "@/features/athletes/lib/names";
import { variantLabel } from "../lib/stock";

const n = (d: unknown) => Number(d ?? 0);
const PAGE = 30;

export async function catalogue(archived = false) {
  const [products, s] = await Promise.all([
    db.product.findMany({
      where: { isArchived: archived },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { variants: { where: { isArchived: false }, orderBy: { position: "asc" }, select: { id: true, size: true, colour: true, stock: true } } },
    }),
    getSettings(),
  ]);
  return {
    lowStockLevel: s.lowStockLevel,
    products: products.map((p) => ({ id: p.id, name: p.name, category: p.category, description: p.description, photo: p.photo, price: n(p.price), variants: p.variants })),
  };
}
export type Catalogue = Awaited<ReturnType<typeof catalogue>>;
export type ProductRow = Catalogue["products"][number];

export type SaleFilters = { search?: string; status?: "PAID" | "ON_ACCOUNT" | "CANCELLED" };
export const saleFiltersFromParams = (sp: URLSearchParams): SaleFilters => ({
  search: sp.get("search")?.trim().slice(0, 60) || undefined,
  status: (["PAID", "ON_ACCOUNT", "CANCELLED"] as const).find((x) => x === sp.get("status")),
});

const SALE_SELECT = {
  id: true,
  saleNumber: true,
  createdAt: true,
  status: true,
  paymentType: true,
  reference: true,
  total: true,
  customerName: true,
  soldBy: true,
  athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
  invoice: { select: { invoiceNumber: true, status: true } },
  lines: { select: { description: true, quantity: true } },
} satisfies Prisma.SaleSelect;

const saleRow = (x: Prisma.SaleGetPayload<{ select: typeof SALE_SELECT }>) => ({
  id: x.id,
  saleNumber: x.saleNumber,
  createdAt: x.createdAt.toISOString(),
  status: x.status,
  paymentType: x.paymentType,
  reference: x.reference,
  total: n(x.total),
  customer: x.athlete ? athleteName(x.athlete) : x.customerName,
  athleteId: x.athlete?.athleteId ?? null,
  soldBy: x.soldBy,
  invoice: x.invoice,
  items: x.lines.reduce((s, l) => s + l.quantity, 0),
  summary: x.lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.description}` : l.description)).join(", "),
});
export type SaleRow = ReturnType<typeof saleRow>;

export async function listSales({ search, status }: SaleFilters, cursor?: string | null) {
  const where: Prisma.SaleWhereInput = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { athlete: { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }, { athleteId: { contains: search, mode: "insensitive" } }] } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    db.sale.findMany({ where, select: SALE_SELECT, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...cursorArgs(cursor, PAGE) }),
    db.sale.count({ where }),
  ]);
  const page = pageOf(rows, PAGE);
  return { items: page.items.map(saleRow), nextCursor: page.nextCursor, total };
}
export type SalesPage = Awaited<ReturnType<typeof listSales>>;

export async function saleByNumber(saleNumber: string) {
  const x = await db.sale.findUnique({ where: { saleNumber }, select: { ...SALE_SELECT, notes: true, lines: { select: { description: true, quantity: true, unitPrice: true, amount: true } } } });
  if (!x) return null;
  return { ...saleRow(x), notes: x.notes, lines: x.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: n(l.unitPrice), amount: n(l.amount) })) };
}
export type SaleDetail = NonNullable<Awaited<ReturnType<typeof saleByNumber>>>;

/** This month's takings, items and best sellers (cancelled sales left out). */
export async function salesSummary(from: Date) {
  const where = { status: { not: "CANCELLED" as const }, createdAt: { gte: from } };
  const [totals, byStatus, lines] = await Promise.all([
    db.sale.aggregate({ where, _sum: { total: true }, _count: true }),
    db.sale.groupBy({ by: ["status"], where, _sum: { total: true } }),
    db.saleLine.groupBy({ by: ["variantId"], where: { sale: where }, _sum: { quantity: true, amount: true } }),
  ]);
  const variants = await db.productVariant.findMany({ where: { id: { in: lines.map((l) => l.variantId) } }, select: { id: true, product: { select: { name: true } } } });
  const byProduct = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const l of lines) {
    const name = variants.find((v) => v.id === l.variantId)?.product.name ?? "Removed product";
    const row = byProduct.get(name) ?? { name, quantity: 0, amount: 0 };
    row.quantity += l._sum.quantity ?? 0;
    row.amount += n(l._sum.amount);
    byProduct.set(name, row);
  }
  return {
    total: n(totals._sum.total),
    sales: totals._count,
    onAccount: n(byStatus.find((b) => b.status === "ON_ACCOUNT")?._sum.total),
    items: lines.reduce((s, l) => s + (l._sum.quantity ?? 0), 0),
    top: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

export async function listMovements(cursor?: string | null) {
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { variant: { select: { size: true, colour: true, product: { select: { name: true } } } } },
      ...cursorArgs(cursor, PAGE),
    }),
    db.stockMovement.count(),
  ]);
  const page = pageOf(rows, PAGE);
  const users = await db.user.findMany({ where: { id: { in: page.items.map((r) => r.userId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
  const sales = await db.sale.findMany({ where: { id: { in: page.items.map((r) => r.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } });
  return {
    total,
    nextCursor: page.nextCursor,
    items: page.items.map((m) => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      item: variantLabel(m.variant.product.name, m.variant),
      kind: m.kind,
      quantity: m.quantity,
      balance: m.balance,
      note: m.note,
      saleNumber: sales.find((x) => x.id === m.saleId)?.saleNumber ?? null,
      by: users.find((u) => u.id === m.userId)?.name ?? null,
    })),
  };
}
export type MovementsPage = Awaited<ReturnType<typeof listMovements>>;
export type MovementRow = MovementsPage["items"][number];
