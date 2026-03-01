import { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";

interface data {
  name: string;
  value: ATHLETE_ACCOUNT_STATUS;
}

export const statusData: data[] = [
  { name: "Active", value: ATHLETE_ACCOUNT_STATUS.ACTIVE },
  { name: "Inactive", value: ATHLETE_ACCOUNT_STATUS.DEACTIVATED },
  { name: "Pending", value: ATHLETE_ACCOUNT_STATUS.PENDING },
  { name: "default", value: ATHLETE_ACCOUNT_STATUS.DEFAULT },
];
