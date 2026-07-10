export type UserRole =
  | 'owner'
  | 'admin'
  | 'sales_manager'
  | 'salesperson'
  | 'production_manager'
  | 'production_staff'
  | 'accountant'
  | 'purchase_manager'
  | 'delivery_staff'
  | 'viewer'

// Higher weight = more access
const ROLE_WEIGHT: Record<UserRole, number> = {
  owner:              100,
  admin:               90,
  sales_manager:       70,
  purchase_manager:    65,
  accountant:          65,
  salesperson:         60,
  production_manager:  70,
  production_staff:    40,
  delivery_staff:      40,
  viewer:              10,
}

export const PERMISSIONS = {
  // Tenant & users
  MANAGE_TENANT:       ['owner', 'admin'],
  MANAGE_USERS:        ['owner', 'admin'],
  VIEW_SETTINGS:       ['owner', 'admin'],

  // CRM
  VIEW_LEADS:          ['owner', 'admin', 'sales_manager', 'salesperson', 'viewer'],
  MANAGE_LEADS:        ['owner', 'admin', 'sales_manager', 'salesperson'],
  VIEW_CLIENTS:        ['owner', 'admin', 'sales_manager', 'salesperson', 'accountant', 'viewer'],
  MANAGE_CLIENTS:      ['owner', 'admin', 'sales_manager', 'salesperson'],

  // Sales / quotations
  VIEW_QUOTES:         ['owner', 'admin', 'sales_manager', 'salesperson', 'accountant', 'viewer'],
  CREATE_QUOTE:        ['owner', 'admin', 'sales_manager', 'salesperson'],
  APPROVE_QUOTE:       ['owner', 'admin', 'sales_manager'],

  // Drawings
  VIEW_DRAWINGS:       ['owner', 'admin', 'sales_manager', 'salesperson', 'production_manager', 'production_staff'],
  MANAGE_DRAWINGS:     ['owner', 'admin', 'sales_manager', 'production_manager'],

  // Purchase / inventory
  VIEW_INVENTORY:      ['owner', 'admin', 'production_manager', 'production_staff', 'purchase_manager', 'accountant'],
  MANAGE_INVENTORY:    ['owner', 'admin', 'purchase_manager'],
  CREATE_PO:           ['owner', 'admin', 'purchase_manager'],
  APPROVE_PO:          ['owner', 'admin', 'purchase_manager'],

  // Production
  VIEW_PRODUCTION:     ['owner', 'admin', 'production_manager', 'production_staff', 'delivery_staff'],
  MANAGE_PRODUCTION:   ['owner', 'admin', 'production_manager'],

  // Delivery
  VIEW_DELIVERY:       ['owner', 'admin', 'production_manager', 'delivery_staff', 'sales_manager'],
  MANAGE_DELIVERY:     ['owner', 'admin', 'production_manager', 'delivery_staff'],

  // Finance
  VIEW_FINANCE:        ['owner', 'admin', 'accountant'],
  MANAGE_FINANCE:      ['owner', 'admin', 'accountant'],
  VIEW_INVOICES:       ['owner', 'admin', 'accountant', 'sales_manager', 'salesperson'],

  // Reports
  VIEW_REPORTS:        ['owner', 'admin', 'sales_manager', 'accountant'],
} as const satisfies Record<string, UserRole[]>

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}

export function isAtLeastRole(role: UserRole, minRole: UserRole): boolean {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minRole]
}

// All roles that can be assigned to team members (not owner — that's set at signup)
export const ASSIGNABLE_ROLES: UserRole[] = [
  'admin',
  'sales_manager',
  'salesperson',
  'production_manager',
  'production_staff',
  'accountant',
  'purchase_manager',
  'delivery_staff',
  'viewer',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:              'Owner',
  admin:              'Admin',
  sales_manager:      'Sales Manager',
  salesperson:        'Salesperson',
  production_manager: 'Production Manager',
  production_staff:   'Production Staff',
  accountant:         'Accountant',
  purchase_manager:   'Purchase Manager',
  delivery_staff:     'Delivery Staff',
  viewer:             'Viewer (Read-only)',
}
