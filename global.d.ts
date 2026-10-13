export {};
declare global {
  module "*.css";

  // Shared return shape for most "use server" actions. Prefer this over
  // redeclaring `{ success: boolean; message: string }` locally in a
  // server-action file — a handful of actions intentionally use a
  // different shape (e.g. { status: "SUCCESS" | "ERROR" }) where their
  // return value needs to carry more than a single message.
  type ActionResult = { success: boolean; message: string };

  export type UtilsResponse = {
    academy: {
      id: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
      paymentMathod: string;
      paymentMethodType: string;
      academyName: string;
      tagline: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      logoUrl: string | null;
      heroImageUrl: string | null;
      primaryColor: string | null;
      receiptFooterNotes: string | null;
    } | null;

    plans: {
      id: string;
      name: string;
      amount: string;
      interval: string;
    }[];
    expense: {
      name: string;
      id: string;
    }[];
    locations: {
      id: string;
      name: string;
      value: string;
      voided: 0 | 1;
    }[];
    drills: {
      id: string;
      value: string;
      name: string;
      description: string;
      voided: 0 | 1;
    }[];
    batches: {
      id: string;
      name: string;
      description: string;
    }[];
    coaches: {
      staffId: string;
      fullNames: string;
    }[];

    attendance: {
      id: string;
      status: string;
      label: string | null;
    }[];
  } | null;

  export interface Drill {
    id: string;
    name: string;
    value: string;
    description: string | null;
  }
}
