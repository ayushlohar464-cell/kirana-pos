/**
 * Repository Layer Index
 */
const { getDb } = require('../connection');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  getDb() {
    return getDb();
  }

  findById(id) {
    return this.getDb().prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
  }

  findAll(limit = 100, offset = 0) {
    return this.getDb().prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`).all(limit, offset);
  }

  count() {
    const res = this.getDb().prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get();
    return res ? res.count : 0;
  }
}

module.exports = {
  BaseRepository,
  productsRepo: new BaseRepository('products'),
  salesRepo: new BaseRepository('sales'),
  customersRepo: new BaseRepository('customers'),
  suppliersRepo: new BaseRepository('suppliers'),
  purchasesRepo: new BaseRepository('purchases'),
};
