import { AbsentReason } from "@/Modules/Seed/SeedReasonsForAbsentism";

export {};
declare global {
  module "*.css";
  interface AthleteAddress {
    id: string;
    country: string;
    subCounty: string;
    addressLine1: string;
    addressLine2: string;
    athleteId: string;
    county: string;
  }

  interface AthleteMedical {
    id: string;
    bloogGroup: string;
    allergies: string[];
    medicalConditions: string[];
    athleteId: string;
  }

  interface AthleteGuardian {
    id: string;
    fullNames: string;
    relationship: string;
    email: string;
    phoneNumber: string;
    athleteId: string;
  }

  interface AthleteEmergencyContact {
    id: string;
    name: string;
    phoneNumber: string;
    relationship: string;
    athleteId: string;
  }

  interface Athlete {
    id: string;
    athleteId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string;
    dateOfBirth: string;
    profilePicture: string | null;
    height: string;
    weight: string;
    foot: string;
    hand: string;
    positions: string[];
    status: " ACTIVE" | "PENDING" | " DEACTIVATED" | "  DEFAULT";
    birthCertificate: string | null;
    nationalIdFront: string | null;
    nationalIdBack: string | null;
    passportCover: string | null;
    passportBioData: string | null;
    address?: AthleteAddress | null;
    medical?: AthleteMedical | null;
    guardians?: AthleteGuardian[] | null;
    emergencyContacts?: AthleteEmergencyContact[] | null;
    finances?: AthleteFinance[] | null;
    createdAt: Date;
    updatedAt: Date;
  }
  interface finances {
    id: string;
    amountPaid: number;
    paymentDate: Date;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    paymentType: PAYMENTS_TYPE;
    receiptNumber: string;
  }

  type PAYMENTS_TYPE =
    | "CASH"
    | "BANK_TRANSFER"
    | "MPESA_SEND_MONEY"
    | "MPESA_PAYBILL";
  type AthleteListResponse = Athlete[];

  type financeResponse = {
    id: string;
    amountPaid: number;
    paymentDate: Date;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    paymentType: PAYMENTS_TYPE;
    receiptNumber: string;
    collectedBy: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    athleteId: string;
    athlete: {
      firstName: string;
      lastName: string;
      profilePIcture: string | null;
    };
  };
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
    }[];
    expense: {
      name: string;
      id: string;
    }[];
    locations: {
      id: string;
      name: string;
      value: string;
    }[];
    drills: {
      id: string;
      value: string;
      name: string;
      description: string;
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
      label: AbsentReason;
    }[];
  } | null;

  export type TrainingStatus =
    | "STARTED"
    | "COMPLETED"
    | "CANCELLED"
    | "SCHEDULED";
  type UserRole = "COACH" | "ADMIN" | "DOCTOR";

  interface TrainingSession {
    id: string;
    batchesId: string;
    date: Date;
    description: string;
    name: string;
    note: string | null;
    status: TrainingStatus;
    duration: number;
    trainingLocationsId: string;
    sytemUsersId: string;

    coach: Coach;
    location: TrainingLocation;

    _count: {
      drills: number;
      athletes: number;
    };
  }

  interface Batch {
    id: string;
    name: string;
    description: string | null;
  }

  interface Coach {
    id: string;
    staffId: string;
    fullNames: string;
    email: string;
    role: UserRole;
    createAt: Date;
    updateAt: Date;
  }

  interface TrainingLocation {
    id: string;
    name: string;
    value: string;
  }

  export interface Athlete {
    id: string;
    athleteId: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    profilePIcture: string | null;
    position: string;
    batchesId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Drill {
    id: string;
    name: string;
    value: string;
    description: string | null;
  }

  interface dashboardItems {
    totalPlayers: number;
    totalCoaches: number;
    guardianCount: number;
    totalFinances: {
      _sum: {
        amountPaid: number | null;
      };
    };
    monthlyRevenue: {
      _sum: {
        amountPaid: number | null;
      };
    };
    yearlyIncome: {
      amountPaid: number;
      paymentDate: Date;
    }[];
    weeklyPayments: {
      amountPaid: number;
      paymentType: PAYMENTS_TYPE;
      receiptNumber: string;
      athlete: {
        firstName: string;
        lastName: string;
        athleteId: string;
      };
    }[];
    totalWeeklyPayments: number;
    totalWeeklyTainings: number;
    weeklyTrainings: {
      _count: {
        athletes: number;
      };
      coach: {
        fullNames: string;
        staffId: string;
      };
      location: {
        name: string;
      };
      duration: number;
      date: Date;
      name: string;
    }[];
  }

  interface GuardiansResponse {
    id: string;
    fullNames: string;
    relationship: string;
    email: string;
    phoneNumber: string;
    athleteId: string;
    athlete: {
      firstName: string;
      lastName: string | null;
      middleName: string | null;
      profilePIcture: string | null;
    };
  }
  type idPrefix = "ATH-FFA" | "STAFF-FFA";
}
