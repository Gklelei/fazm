import {
  CalendarDays,
  CheckSquare,
  DollarSign,
  Receipt,
  Users,
  UserPlus,
  User,
  Settings,
  SlidersHorizontal,
  Users2,
  LayoutDashboard,
  BarChart3,
  ClipboardCheck,
  CreditCardIcon,
  TrophyIcon,
  DoorClosedLocked,
  UserCheck2Icon,
  TagIcon,
  TerminalSquare,
  BarChart2,
} from "lucide-react";
import { ROLES } from "@/generated/prisma/enums";

// Derived from the Prisma `ROLES` enum so this can never drift from the
// database's real set of roles (it previously hand-declared a parallel
// union that included a nonexistent "STAFF" role and omitted "DOCTOR").
export type AppRole = ROLES;

export const ALL_ROLES: AppRole[] = Object.values(ROLES);

type NavSubItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  roles?: AppRole[];
};

type NavItem = {
  title: string;
  url?: string;
  icon: React.ReactNode;
  roles?: AppRole[];
  items?: NavSubItem[];
};

export const data: { navMain: NavItem[] } = {
  navMain: [
    {
      title: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      roles: ALL_ROLES,
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: <BarChart3 className="size-4" />,
          roles: ALL_ROLES,
        },
      ],
    },

    {
      title: "User Management",
      icon: <Users className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN", "DOCTOR"],
      items: [
        {
          title: "Athletes",
          url: "/players",
          icon: <UserPlus className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "COACH", "DOCTOR"],
        },
        {
          title: "Staff & Coaches",
          url: "/staff",
          icon: <Users2 className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          title: "Guardians",
          url: "/guardians",
          icon: <User className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
      ],
    },

    {
      title: "Finance & Billing",
      icon: <DollarSign className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
      items: [
        {
          title: "Transactions",
          url: "/transactions",
          icon: <Receipt className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Fee Structure",
          url: "/fees",
          icon: <DoorClosedLocked className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Invoices",
          url: "/invoices",
          icon: <Receipt className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Expenses",
          url: "/expenses",
          icon: <CreditCardIcon className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Expense Categories",
          url: "/expenses-categories",
          icon: <TrophyIcon className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Coupons",
          url: "/coupons",
          icon: <TagIcon className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
      ],
    },

    {
      title: "Training & Performance",
      icon: <CalendarDays className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN", "COACH"],
      items: [
        {
          title: "Training Sessions",
          url: "/sessions",
          icon: <CheckSquare className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "COACH"],
        },
        {
          title: "Assessments",
          url: "/assesments",
          icon: <ClipboardCheck className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "COACH"],
        },
      ],
    },

    {
      title: "System Settings",
      icon: <Settings className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN"],
      items: [
        {
          title: "General Configuration",
          url: "/settings",
          icon: <SlidersHorizontal className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          title: "Academy Profile",
          url: "/academy",
          icon: <UserCheck2Icon className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          title: "System Logs",
          url: "/settings/audit-logs",
          icon: <TerminalSquare className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
      ],
    },
    // {
    //   title: "Analytics",
    //   icon: <BarChart3 className="size-4" />,
    //   roles: ["SUPER_ADMIN", "ADMIN"],
    //   items: [
    //     {
    //       title: "Overview",
    //       url: "/stats",
    //       icon: <BarChart2 className="size-4" />,
    //       roles: ["SUPER_ADMIN", "ADMIN"],
    //     },
    //   ],
    // },
  ],
};
