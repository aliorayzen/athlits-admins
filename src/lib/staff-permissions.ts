import type { StaffPermission } from "@/types/api";

export interface StaffPermissionOption {
  value: StaffPermission;
  label: string;
  description: string;
}

export interface StaffPermissionGroup {
  label: string;
  options: StaffPermissionOption[];
}

export const STAFF_PERMISSION_GROUPS: StaffPermissionGroup[] = [
  {
    label: "Venue",
    options: [
      { value: "VENUE_READ", label: "View venue", description: "See venue details and settings." },
      { value: "VENUE_WRITE", label: "Edit venue", description: "Update venue details and settings." },
    ],
  },
  {
    label: "Courts",
    options: [
      { value: "COURTS_READ", label: "View courts", description: "See courts, schedules, and pricing." },
      { value: "COURTS_WRITE", label: "Manage courts", description: "Create and update court setup." },
      { value: "COURTS_DELETE", label: "Delete courts", description: "Remove courts from the venue." },
    ],
  },
  {
    label: "Bookings",
    options: [
      { value: "BOOKINGS_READ", label: "View bookings", description: "See booking details and schedules." },
      { value: "BOOKINGS_WRITE", label: "Manage bookings", description: "Create and update bookings." },
      { value: "BOOKINGS_APPROVE", label: "Approve bookings", description: "Approve pending booking requests." },
      { value: "BOOKINGS_CANCEL", label: "Cancel bookings", description: "Cancel existing bookings." },
      { value: "BOOKINGS_DELETE", label: "Delete bookings", description: "Permanently remove bookings." },
    ],
  },
  {
    label: "Customers",
    options: [
      { value: "CUSTOMERS_READ", label: "View customers", description: "See customer profiles and activity." },
      { value: "CUSTOMERS_WRITE", label: "Manage customers", description: "Update customer information." },
      { value: "CUSTOMERS_BLOCK", label: "Block customers", description: "Restrict customers from booking." },
    ],
  },
  {
    label: "Promotions",
    options: [
      { value: "PROMOTIONS_READ", label: "View promotions", description: "See promotions and eligibility." },
      { value: "PROMOTIONS_WRITE", label: "Manage promotions", description: "Create and update promotions." },
      { value: "PROMOTIONS_DELETE", label: "Delete promotions", description: "Remove promotions." },
    ],
  },
  {
    label: "Finance",
    options: [
      { value: "FINANCE_READ", label: "View finance", description: "See financial records and balances." },
      { value: "FINANCE_WRITE", label: "Manage finance", description: "Update financial records." },
    ],
  },
  {
    label: "Reports",
    options: [
      { value: "REPORTS_READ", label: "View reports", description: "Open operational reports." },
    ],
  },
  {
    label: "Notifications",
    options: [
      { value: "NOTIFICATIONS_READ", label: "View notifications", description: "See venue notifications." },
      { value: "NOTIFICATIONS_WRITE", label: "Manage notifications", description: "Create and update notifications." },
      { value: "NOTIFICATIONS_SEND", label: "Send notifications", description: "Send notifications to recipients." },
    ],
  },
];

export const ALL_STAFF_PERMISSIONS = STAFF_PERMISSION_GROUPS.flatMap((group) =>
  group.options.map((option) => option.value),
);

export const STAFF_PERMISSION_PRESETS: Array<{
  label: string;
  description: string;
  permissions: StaffPermission[];
}> = [
  {
    label: "Basic",
    description: "Daily venue operations",
    permissions: [
      "VENUE_READ",
      "COURTS_READ",
      "COURTS_WRITE",
      "BOOKINGS_READ",
      "BOOKINGS_WRITE",
      "BOOKINGS_APPROVE",
      "FINANCE_READ",
      "REPORTS_READ",
    ],
  },
  {
    label: "Bookings only",
    description: "Booking desk access",
    permissions: [
      "BOOKINGS_READ",
      "BOOKINGS_WRITE",
      "BOOKINGS_APPROVE",
      "BOOKINGS_CANCEL",
      "CUSTOMERS_READ",
    ],
  },
  {
    label: "Manager",
    description: `All ${ALL_STAFF_PERMISSIONS.length} permissions`,
    permissions: ALL_STAFF_PERMISSIONS,
  },
];
