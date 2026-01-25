import {
  CalendarDays,
  CheckSquare,
  // ClipboardCheck,
  DollarSign,
  Receipt,
  Users,
  UserPlus,
  User,
  Shield,
  Settings,
  SlidersHorizontal,
  // CreditCard,
  // Trophy,
  Users2,
  // FileText,
  LayoutDashboard,
  BarChart3,
  ClipboardCheck,
  CreditCardIcon,
  TrophyIcon,
  DoorClosedLocked,
} from "lucide-react";

export const data = {
  navMain: [
    {
      title: "Overview",
      icon: <LayoutDashboard className="size-4" />,
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: <BarChart3 className="size-4" />,
        },
      ],
    },

    {
      title: "User Management",
      icon: <Users className="size-4" />,
      items: [
        {
          title: "Athletes",
          url: "/users/players",
          icon: <UserPlus className="size-4" />,
        },
        {
          title: "All Users",
          url: "/users/staff",
          icon: <Users2 className="size-4" />,
        },
        {
          title: "Guardians",
          url: "/guardians",
          icon: <User className="size-4" />,
        },
        {
          title: "Roles & Permissions",
          url: "/users/roles",
          icon: <Shield className="size-4" />,
        },
      ],
    },

    {
      title: "Finance",
      icon: <DollarSign className="size-4" />,
      items: [
        {
          title: "Transactions",
          url: "/finances/view",
          icon: <Receipt className="size-4" />,
        },
        {
          title: "Fees",
          url: "/finances/fees",
          icon: <DoorClosedLocked />,
        },
        {
          title: "Invoices",
          url: "/finances/invoice",
          icon: <Receipt className="size-4" />,
        },
        {
          title: "Expense",
          url: "/expenses",
          icon: <CreditCardIcon className="size-4" />,
        },
        {
          title: "Expense Categories",
          url: "expenses-categories",
          icon: <TrophyIcon className="size-4" />,
        },
      ],
    },

    {
      title: "Training",
      icon: <CalendarDays className="size-4" />,
      items: [
        {
          title: "Sessions",
          url: "/training/sessions",
          icon: <CheckSquare className="size-4" />,
        },
        {
          title: "Assesments",
          url: "/assesments",
          icon: <ClipboardCheck className="size-4" />,
        },
      ],
    },

    {
      title: "System",
      icon: <Settings className="size-4" />,
      items: [
        {
          title: "General Settings",
          url: "/settings/utils",
          icon: <SlidersHorizontal className="size-4" />,
        },

        // {
        //   title: "Audit Logs",
        //   url: "/settings/logs",
        //   icon: <FileText className="size-4" />,
        // },
      ],
    },
  ],
};
