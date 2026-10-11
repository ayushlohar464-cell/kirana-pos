/**
 * Validation Schemas using Zod
 */
const { z } = require('zod');
const { PAYMENT_MODES, STOCK_MOVEMENT_TYPES, ROLES } = require('../shared/constants');

const paymentModeEnum = z.enum([
  PAYMENT_MODES.CASH,
  PAYMENT_MODES.UPI,
  PAYMENT_MODES.CARD,
  PAYMENT_MODES.CREDIT,
  PAYMENT_MODES.BANK_TRANSFER,
  PAYMENT_MODES.CHEQUE,
]);

const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(4).max(100),
});

const userCreateSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum([ROLES.OWNER, ROLES.CASHIER]),
});

const userUpdateSchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().trim().min(2).max(100).optional(),
  role: z.enum([ROLES.OWNER, ROLES.CASHIER]).optional(),
  password: z.string().min(6).max(100).optional().nullable(),
  is_active: z.number().int().min(0).max(1).optional(),
});

const categorySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(255).optional().default(''),
});

const productSchema = z.object({
  id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  name_regional: z.string().trim().max(200).optional().default(''),
  sku: z.string().trim().max(50).optional().default(''),
  barcode: z.string().trim().max(50).optional().default(''),
  unit_code: z.string().trim().min(1).max(20).default('pcs'),
  purchase_cost: z.number().int().min(0), // in paise
  selling_price: z.number().int().min(0), // in paise
  mrp: z.number().int().min(0).default(0), // in paise
  tax_rate: z.number().min(0).max(100).default(0), // percentage e.g. 5.0
  current_stock: z.number().default(0), // float allowed for kg/l
  min_stock_alert: z.number().min(0).default(5),
  is_active: z.number().int().min(0).max(1).default(1),
});

const stockAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  movement_type: z.enum([
    STOCK_MOVEMENT_TYPES.ADJUSTMENT_ADD,
    STOCK_MOVEMENT_TYPES.ADJUSTMENT_SUB,
    STOCK_MOVEMENT_TYPES.WASTAGE,
    STOCK_MOVEMENT_TYPES.OPENING,
  ]),
  quantity_change: z.number().refine(val => val !== 0, 'Quantity change cannot be zero'),
  reason: z.string().trim().min(2).max(255),
});

const saleItemSchema = z.object({
  product_id: z.number().int().positive(),
  product_name: z.string().min(1),
  unit_code: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().int().min(0), // in paise
  discount_amount: z.number().int().min(0).default(0), // in paise
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().int().min(0).default(0), // in paise
  total_price: z.number().int().min(0), // in paise
});

const saleCreateSchema = z.object({
  customer_id: z.number().int().positive().nullable().optional(),
  items: z.array(saleItemSchema).min(1, 'Sale must include at least one item'),
  subtotal: z.number().int().min(0),
  discount_amount: z.number().int().min(0).default(0),
  tax_amount: z.number().int().min(0).default(0),
  round_off: z.number().int().default(0),
  grand_total: z.number().int().min(0),
  paid_amount: z.number().int().min(0).default(0),
  credit_amount: z.number().int().min(0).default(0),
  payment_mode: paymentModeEnum,
  payment_reference: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
});

const purchaseItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().positive(),
  unit_cost: z.number().int().min(0),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().int().min(0).default(0),
  total_cost: z.number().int().min(0),
});

const purchaseCreateSchema = z.object({
  supplier_id: z.number().int().positive(),
  purchase_invoice_no: z.string().trim().min(1).max(100),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
  items: z.array(purchaseItemSchema).min(1, 'Purchase must include at least one item'),
  subtotal: z.number().int().min(0),
  discount_amount: z.number().int().min(0).default(0),
  tax_amount: z.number().int().min(0).default(0),
  grand_total: z.number().int().min(0),
  paid_amount: z.number().int().min(0).default(0),
  balance_due: z.number().int().min(0).default(0),
  payment_mode: paymentModeEnum.optional().default(PAYMENT_MODES.CASH),
  payment_reference: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
});

const customerSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(20).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  credit_limit: z.number().int().min(0).default(0), // in paise
});

const supplierSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(150),
  company_name: z.string().trim().max(150).optional().default(''),
  phone: z.string().trim().max(20).optional().default(''),
  gstin: z.string().trim().max(20).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
});

const partyPaymentSchema = z.object({
  party_id: z.number().int().positive(), // customer_id or supplier_id
  party_type: z.enum(['customer', 'supplier']),
  amount: z.number().int().positive('Payment amount must be greater than zero'), // in paise
  payment_mode: paymentModeEnum,
  transaction_reference: z.string().trim().max(100).optional().default(''),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  notes: z.string().trim().max(255).optional().default(''),
});

const expenseSchema = z.object({
  id: z.number().int().positive().optional(),
  category: z.string().trim().min(1).max(100),
  amount: z.number().int().positive('Expense amount must be greater than zero'),
  payment_mode: z.enum([
    PAYMENT_MODES.CASH,
    PAYMENT_MODES.UPI,
    PAYMENT_MODES.BANK_TRANSFER,
    PAYMENT_MODES.CHEQUE,
  ]),
  description: z.string().trim().min(1).max(300),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
});

const cashSessionOpenSchema = z.object({
  opening_cash: z.number().int().min(0),
  notes: z.string().trim().max(255).optional().default(''),
});

const cashSessionCloseSchema = z.object({
  session_id: z.number().int().positive(),
  actual_cash: z.number().int().min(0),
  notes: z.string().trim().max(500).optional().default(''),
});

const saleReturnSchema = z.object({
  sale_id: z.number().int().positive(),
  customer_id: z.number().int().positive().nullable().optional(),
  items: z.array(z.object({
    sale_item_id: z.number().int().positive(),
    product_id: z.number().int().positive(),
    quantity: z.number().positive(),
    refund_rate: z.number().int().min(0), // in paise
    condition: z.enum(['restockable', 'damaged_wasted']).default('restockable'),
  })).min(1, 'At least one item must be returned'),
  total_refund_amount: z.number().int().min(0),
  refund_mode: z.enum([PAYMENT_MODES.CASH, PAYMENT_MODES.UPI, PAYMENT_MODES.CREDIT]),
  reason: z.string().trim().min(2).max(300),
});

const settingsUpdateSchema = z.record(z.string(), z.string());

module.exports = {
  loginSchema,
  userCreateSchema,
  userUpdateSchema,
  categorySchema,
  productSchema,
  stockAdjustmentSchema,
  saleItemSchema,
  saleCreateSchema,
  purchaseItemSchema,
  purchaseCreateSchema,
  customerSchema,
  supplierSchema,
  partyPaymentSchema,
  expenseSchema,
  cashSessionOpenSchema,
  cashSessionCloseSchema,
  saleReturnSchema,
  settingsUpdateSchema,
};
