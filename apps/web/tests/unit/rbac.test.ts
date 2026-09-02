import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  isAtLeastRole,
  PERMISSIONS,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type UserRole,
  type Permission,
} from '@/lib/rbac'

// ROLE_LABELS is the single place that enumerates every UserRole at runtime,
// so it doubles as the canonical role list for exhaustive tests below.
const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[]
const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[]

describe('rbac — PERMISSIONS table integrity', () => {
  it('grants every permission only to roles that actually exist', () => {
    // A typo like 'sales_person' instead of 'salesperson' would silently
    // deny access forever without failing typecheck at the call site.
    for (const permission of ALL_PERMISSIONS) {
      for (const role of PERMISSIONS[permission] as readonly string[]) {
        expect(ALL_ROLES, `${permission} grants unknown role "${role}"`).toContain(role)
      }
    }
  })

  it('gives owner and admin access to every permission', () => {
    // The tenant owner must never be locked out of their own ERP, and admin
    // is the designated delegate. Any new permission must include both.
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission('owner', permission), `owner denied ${permission}`).toBe(true)
      expect(hasPermission('admin', permission), `admin denied ${permission}`).toBe(true)
    }
  })

  it('never grants a permission to the same role twice', () => {
    for (const permission of ALL_PERMISSIONS) {
      const roles = PERMISSIONS[permission] as readonly string[]
      expect(new Set(roles).size, `${permission} has duplicate roles`).toBe(roles.length)
    }
  })
})

describe('rbac — hasPermission denies by default', () => {
  it('denies a null or undefined role every permission', () => {
    // ctx.userRole is null until the JWT auth hook injects the claim, so an
    // unclaimed session must never satisfy an authorizedProcedure.
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission(null, permission)).toBe(false)
      expect(hasPermission(undefined, permission)).toBe(false)
    }
  })

  it('denies a role string that is not in the role list', () => {
    expect(hasPermission('superuser' as UserRole, 'MANAGE_TENANT')).toBe(false)
    expect(hasPermission('' as UserRole, 'VIEW_LEADS')).toBe(false)
  })
})

describe('rbac — viewer is strictly read-only', () => {
  const WRITE_PERMISSIONS = ALL_PERMISSIONS.filter(
    p => p.startsWith('MANAGE_') || p.startsWith('CREATE_') || p.startsWith('APPROVE_')
  )

  it('has write permissions to check (guards against an empty-filter false pass)', () => {
    expect(WRITE_PERMISSIONS.length).toBeGreaterThan(10)
  })

  it('denies viewer every MANAGE_/CREATE_/APPROVE_ permission', () => {
    for (const permission of WRITE_PERMISSIONS) {
      expect(hasPermission('viewer', permission), `viewer was granted ${permission}`).toBe(false)
    }
  })

  it('denies viewer read access to finance and production data', () => {
    // Viewer is a sales-side read-only role — it must not see the books.
    expect(hasPermission('viewer', 'VIEW_FINANCE')).toBe(false)
    expect(hasPermission('viewer', 'VIEW_INVOICES')).toBe(false)
    expect(hasPermission('viewer', 'VIEW_INVENTORY')).toBe(false)
    expect(hasPermission('viewer', 'VIEW_PRODUCTION')).toBe(false)
    expect(hasPermission('viewer', 'VIEW_REPORTS')).toBe(false)
  })

  it('allows viewer the CRM reads it exists for', () => {
    expect(hasPermission('viewer', 'VIEW_LEADS')).toBe(true)
    expect(hasPermission('viewer', 'VIEW_CLIENTS')).toBe(true)
    expect(hasPermission('viewer', 'VIEW_QUOTES')).toBe(true)
  })
})

describe('rbac — separation of duties between departments', () => {
  it('stops a salesperson approving their own quote', () => {
    // Quote approval is the discount/margin control — a salesperson may
    // create and send, but a sales_manager or above must approve.
    expect(hasPermission('salesperson', 'CREATE_QUOTE')).toBe(true)
    expect(hasPermission('salesperson', 'APPROVE_QUOTE')).toBe(false)
    expect(hasPermission('sales_manager', 'APPROVE_QUOTE')).toBe(true)
  })

  it('keeps sales roles out of the general ledger', () => {
    for (const role of ['salesperson', 'sales_manager'] as UserRole[]) {
      expect(hasPermission(role, 'VIEW_FINANCE'), `${role} can view finance`).toBe(false)
      expect(hasPermission(role, 'MANAGE_FINANCE'), `${role} can post journals`).toBe(false)
    }
    // …while still letting them see the invoices they raised.
    expect(hasPermission('salesperson', 'VIEW_INVOICES')).toBe(true)
  })

  it('stops the accountant raising purchase orders or moving stock', () => {
    // The accountant records spend; the purchase_manager commits to it.
    expect(hasPermission('accountant', 'VIEW_INVENTORY')).toBe(true)
    expect(hasPermission('accountant', 'CREATE_PO')).toBe(false)
    expect(hasPermission('accountant', 'APPROVE_PO')).toBe(false)
    expect(hasPermission('accountant', 'MANAGE_INVENTORY')).toBe(false)
    expect(hasPermission('purchase_manager', 'CREATE_PO')).toBe(true)
  })

  it('stops the purchase manager touching the books they are audited by', () => {
    expect(hasPermission('purchase_manager', 'VIEW_FINANCE')).toBe(false)
    expect(hasPermission('purchase_manager', 'MANAGE_FINANCE')).toBe(false)
    expect(hasPermission('accountant', 'MANAGE_FINANCE')).toBe(true)
  })

  it('stops shop-floor staff editing production plans or QC results', () => {
    expect(hasPermission('production_staff', 'VIEW_PRODUCTION')).toBe(true)
    expect(hasPermission('production_staff', 'MANAGE_PRODUCTION')).toBe(false)
    expect(hasPermission('production_staff', 'VIEW_QC')).toBe(true)
    expect(hasPermission('production_staff', 'MANAGE_QC')).toBe(false)
    expect(hasPermission('production_manager', 'MANAGE_QC')).toBe(true)
  })

  it('confines delivery staff to delivery', () => {
    expect(hasPermission('delivery_staff', 'MANAGE_DELIVERY')).toBe(true)
    expect(hasPermission('delivery_staff', 'VIEW_FINANCE')).toBe(false)
    expect(hasPermission('delivery_staff', 'MANAGE_INVENTORY')).toBe(false)
    expect(hasPermission('delivery_staff', 'VIEW_LEADS')).toBe(false)
    expect(hasPermission('delivery_staff', 'MANAGE_PRODUCTION')).toBe(false)
  })

  it('reserves tenant and user administration for owner and admin alone', () => {
    const privileged: Permission[] = ['MANAGE_TENANT', 'MANAGE_USERS', 'VIEW_SETTINGS']
    for (const permission of privileged) {
      expect(PERMISSIONS[permission]).toEqual(['owner', 'admin'])
      for (const role of ALL_ROLES) {
        if (role === 'owner' || role === 'admin') continue
        expect(hasPermission(role, permission), `${role} can ${permission}`).toBe(false)
      }
    }
  })
})

describe('rbac — isAtLeastRole ordering', () => {
  it('is reflexive for every role', () => {
    for (const role of ALL_ROLES) {
      expect(isAtLeastRole(role, role), `${role} is not >= itself`).toBe(true)
    }
  })

  it('ranks owner above admin and admin above everything else', () => {
    expect(isAtLeastRole('owner', 'admin')).toBe(true)
    expect(isAtLeastRole('admin', 'owner')).toBe(false)
    for (const role of ALL_ROLES) {
      if (role === 'owner' || role === 'admin') continue
      expect(isAtLeastRole('admin', role), `admin not >= ${role}`).toBe(true)
      expect(isAtLeastRole(role, 'admin'), `${role} >= admin`).toBe(false)
    }
  })

  it('ranks viewer at or below every other role', () => {
    for (const role of ALL_ROLES) {
      expect(isAtLeastRole(role, 'viewer'), `${role} not >= viewer`).toBe(true)
    }
  })

  it('ranks managers above their own staff', () => {
    expect(isAtLeastRole('sales_manager', 'salesperson')).toBe(true)
    expect(isAtLeastRole('salesperson', 'sales_manager')).toBe(false)
    expect(isAtLeastRole('production_manager', 'production_staff')).toBe(true)
    expect(isAtLeastRole('production_staff', 'production_manager')).toBe(false)
  })
})

describe('rbac — role metadata completeness', () => {
  it('labels every role', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role], `${role} has an empty label`).toBeTruthy()
    }
  })

  it('offers every role except owner when assigning a team member', () => {
    // Ownership is set at signup and must not be grantable from the team UI.
    expect(ASSIGNABLE_ROLES).not.toContain('owner')
    expect([...ASSIGNABLE_ROLES].sort()).toEqual(
      ALL_ROLES.filter(r => r !== 'owner').sort()
    )
  })
})
