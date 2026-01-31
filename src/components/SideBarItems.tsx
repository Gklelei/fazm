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
  Mail,
  MessageSquare,
} from "lucide-react";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "COACH" | "FINANCE" | "STAFF";

export const ALL_ROLES: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "COACH",
  "FINANCE",
  "STAFF",
];

type NavSubItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  roles?: AppRole[];
};

type NavItem = {
  title: string;
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
      roles: ["SUPER_ADMIN", "ADMIN"],
      items: [
        {
          title: "Athletes",
          url: "/users/players",
          icon: <UserPlus className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "COACH"],
        },
        {
          title: "Staff & Coaches",
          url: "/users/staff",
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
          url: "/finances/view",
          icon: <Receipt className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Fee Structure",
          url: "/finances/fees",
          icon: <DoorClosedLocked className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
        },
        {
          title: "Invoices",
          url: "/finances/invoice",
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
      ],
    },

    {
      title: "Training & Performance",
      icon: <CalendarDays className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN", "COACH"],
      items: [
        {
          title: "Training Sessions",
          url: "/training/sessions",
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
          url: "/settings/utils",
          icon: <SlidersHorizontal className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          title: "Academy Profile",
          url: "/academy",
          icon: <UserCheck2Icon className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
      ],
    },

    {
      title: "Communication",
      icon: <Mail className="size-4" />,
      roles: ["SUPER_ADMIN", "ADMIN"],
      items: [
        {
          title: "Send Email",
          url: "/mail",
          icon: <Mail className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          title: "Send SMS",
          url: "/sms",
          icon: <MessageSquare className="size-4" />,
          roles: ["SUPER_ADMIN", "ADMIN"],
        },
      ],
    },
  ],
};
