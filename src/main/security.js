/**
 * Security & Role-Based Access Control (RBAC)
 */
const { ROLES } = require('../shared/constants');

const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    'pos:billing',
    'pos:reprint',
    'pos:returns',
    'pos:cancel_bill',
    'inventory:view',
    'inventory:manage',
    'inventory:adjust',
    'purchases:view',
    'purchases:manage',
    'customers:view',
    'customers:manage',
    'customers:payments',
    'suppliers:view',
    'suppliers:manage',
    'suppliers:payments',
    'expenses:view',
    'expenses:manage',
    'cash_session:manage',
    'reports:dashboard',
    'reports:sales',
    'reports:profit_loss',
    'reports:stock_valuation',
    'users:manage',
    'settings:manage',
    'backup:manage',
    'audit:view',
  ],
  [ROLES.CASHIER]: [
    'pos:billing',
    'pos:reprint',
    'pos:returns',
    'inventory:view',
    'customers:view',
    'customers:payments',
    'expenses:view',
    'expenses:manage',
    'cash_session:manage',
    'reports:dashboard',
  ],
};

function hasPermission(userRole, permission) {
  if (!userRole) return false;
  const perms = ROLE_PERMISSIONS[userRole] || [];
  return perms.includes(permission);
}

function assertPermission(user, permission) {
  if (!user || !user.role) {
    throw new Error('Unauthorized: Authentication required.');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Forbidden: Insufficient privileges. Required permission: ${permission}`);
  }
}

function applySecurityHeaders(session) {
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
      },
    });
  });
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  assertPermission,
  applySecurityHeaders,
};
