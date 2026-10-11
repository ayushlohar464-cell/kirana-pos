/**
 * Reporting & Business Analytics Service
 */
const { getDb } = require('../database/connection');
const { SALE_STATUS } = require('../shared/constants');

class ReportService {
  getDashboardStats() {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Today's completed sales
    const todaySales = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(credit_amount), 0) as total_credit_given
      FROM sales
      WHERE created_at >= ? AND status != ?
    `).get(`${today}T00:00:00.000Z`, SALE_STATUS.CANCELLED);

    // Today's collections by payment mode
    const collectionsByMode = db.prepare(`
      SELECT payment_mode, COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE payment_date = ?
      GROUP BY payment_mode
    `).all(today);

    // Total Customer Udhar (Receivables)
    const totalReceivables = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as total_udhar
      FROM customers
      WHERE is_active = 1 AND current_balance > 0
    `).get();

    // Total Supplier Payables
    const totalPayables = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as total_payable
      FROM suppliers
      WHERE is_active = 1 AND current_balance > 0
    `).get();

    // Low stock count
    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as low_count
      FROM products
      WHERE is_active = 1 AND current_stock <= min_stock_alert
    `).get();

    // Total products count
    const totalProducts = db.prepare(`
      SELECT COUNT(*) as total_count
      FROM products
      WHERE is_active = 1
    `).get();

    // Recent 5 sales
    const recentSales = db.prepare(`
      SELECT s.id, s.invoice_number, s.grand_total, s.created_at, s.status,
             c.name as customer_name, u.username as cashier
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC LIMIT 5
    `).all();

    // Top 5 selling products this month
    const startOfMonth = `${today.slice(0, 7)}-01T00:00:00.000Z`;
    const topProducts = db.prepare(`
      SELECT si.product_name, si.unit_code,
             SUM(si.quantity) as total_qty,
             SUM(si.total_price) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.status != ?
      GROUP BY si.product_id
      ORDER BY total_qty DESC LIMIT 5
    `).all(startOfMonth, SALE_STATUS.CANCELLED);

    return {
      today: {
        total_bills: Number(todaySales.total_bills),
        total_sales: Number(todaySales.total_sales),
        total_collected: Number(todaySales.total_collected),
        total_credit_given: Number(todaySales.total_credit_given),
        collections_by_mode: collectionsByMode,
      },
      summary: {
        total_udhar: Number(totalReceivables.total_udhar),
        total_payable: Number(totalPayables.total_payable),
        low_stock_count: Number(lowStockCount.low_count),
        total_products_count: Number(totalProducts.total_count),
      },
      recent_sales: recentSales,
      top_products: topProducts,
    };
  }

  getSalesReport({ from_date, to_date }) {
    const db = getDb();
    const fromIso = `${from_date}T00:00:00.000Z`;
    const toIso = `${to_date}T23:59:59.999Z`;

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(grand_total), 0) as total_grand,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(credit_amount), 0) as total_credit
      FROM sales
      WHERE created_at >= ? AND created_at <= ? AND status != ?
    `).get(fromIso, toIso, SALE_STATUS.CANCELLED);

    const dailyBreakdown = db.prepare(`
      SELECT 
        DATE(created_at) as sale_date,
        COUNT(*) as bill_count,
        COALESCE(SUM(grand_total), 0) as revenue,
        COALESCE(SUM(paid_amount), 0) as cash_collected,
        COALESCE(SUM(credit_amount), 0) as credit_given
      FROM sales
      WHERE created_at >= ? AND created_at <= ? AND status != ?
      GROUP BY DATE(created_at)
      ORDER BY sale_date DESC
    `).all(fromIso, toIso, SALE_STATUS.CANCELLED);

    return {
      summary,
      dailyBreakdown,
    };
  }

  getPaymentCollectionsReport({ from_date, to_date }) {
    const db = getDb();
    const collections = db.prepare(`
      SELECT 
        payment_mode,
        reference_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE payment_date >= ? AND payment_date <= ?
      GROUP BY payment_mode, reference_type
      ORDER BY total_amount DESC
    `).all(from_date, to_date);

    const grandTotal = collections.reduce((acc, row) => acc + row.total_amount, 0);

    return {
      from_date,
      to_date,
      collections,
      grandTotal,
    };
  }

  getStockValuationReport() {
    const db = getDb();
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(current_stock), 0) as total_units_in_stock,
        COALESCE(SUM(current_stock * purchase_cost), 0) as total_cost_value,
        COALESCE(SUM(current_stock * selling_price), 0) as total_retail_value
      FROM products
      WHERE is_active = 1 AND current_stock > 0
    `).get();

    const items = db.prepare(`
      SELECT p.id, p.name, p.unit_code, p.current_stock, p.purchase_cost, p.selling_price,
             (p.current_stock * p.purchase_cost) as total_cost,
             (p.current_stock * p.selling_price) as total_retail,
             ((p.selling_price - p.purchase_cost) * p.current_stock) as projected_profit
      FROM products p
      WHERE p.is_active = 1 AND p.current_stock > 0
      ORDER BY (p.current_stock * p.selling_price) DESC
    `).all();

    return {
      summary: {
        total_items: Number(summary.total_items),
        total_units_in_stock: Number(summary.total_units_in_stock),
        total_cost_value: Math.round(Number(summary.total_cost_value)),
        total_retail_value: Math.round(Number(summary.total_retail_value)),
        projected_margin: Math.round(Number(summary.total_retail_value) - Number(summary.total_cost_value)),
      },
      items,
    };
  }

  getProfitLossReport({ from_date, to_date }) {
    const db = getDb();
    const fromIso = `${from_date}T00:00:00.000Z`;
    const toIso = `${to_date}T23:59:59.999Z`;

    // 1. Total Sales Revenue
    const salesRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total_revenue
      FROM sales
      WHERE created_at >= ? AND created_at <= ? AND status != ?
    `).get(fromIso, toIso, SALE_STATUS.CANCELLED);

    // 2. Cost of Goods Sold (COGS) based on sold items * product purchase cost
    const cogsRow = db.prepare(`
      SELECT COALESCE(SUM(si.quantity * p.purchase_cost), 0) as total_cogs
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.created_at >= ? AND s.created_at <= ? AND s.status != ?
    `).get(fromIso, toIso, SALE_STATUS.CANCELLED);

    // 3. Total Expenses in period
    const expensesRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE expense_date >= ? AND expense_date <= ?
    `).get(from_date, to_date);

    // 4. Sales returns / refunds
    const refundsRow = db.prepare(`
      SELECT COALESCE(SUM(total_refund_amount), 0) as total_refunds
      FROM returns
      WHERE created_at >= ? AND created_at <= ?
    `).get(fromIso, toIso);

    const revenue = Number(salesRow.total_revenue);
    const cogs = Math.round(Number(cogsRow.total_cogs));
    const grossProfit = revenue - cogs;
    const expenses = Number(expensesRow.total_expenses);
    const refunds = Number(refundsRow.total_refunds);
    const netProfit = grossProfit - expenses - refunds;

    return {
      period: { from_date, to_date },
      revenue,
      cogs,
      grossProfit,
      expenses,
      refunds,
      netProfit,
    };
  }

  getPartyBalances() {
    const db = getDb();
    const customersWithUdhar = db.prepare(`
      SELECT id, name, phone, current_balance, credit_limit
      FROM customers
      WHERE is_active = 1 AND current_balance > 0
      ORDER BY current_balance DESC
    `).all();

    const suppliersPayable = db.prepare(`
      SELECT id, name, company_name, phone, current_balance
      FROM suppliers
      WHERE is_active = 1 AND current_balance > 0
      ORDER BY current_balance DESC
    `).all();

    return {
      customers: customersWithUdhar,
      suppliers: suppliersPayable,
    };
  }
}

module.exports = new ReportService();
