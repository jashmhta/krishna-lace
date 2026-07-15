import * as XLSX from "xlsx";
import { inr } from "./format.js";

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((r) => {
    const o = {};
    for (const k of Object.keys(r)) o[k.trim()] = r[k];
    return o;
  });
}

// ---- Import products from an .xlsx / .csv file ----
// Accepts flexible headers: name, sku/code, category, stock/qty, unit, cost, price, low stock
export function importProductsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const rows = sheetToRows(wb.Sheets[wb.SheetNames[0]]);
        const products = rows
          .filter((r) => r.name || r.Name || r["Product Name"])
          .map((r) => {
            const get = (...keys) => {
              for (const k of keys) if (r[k] !== undefined && r[k] !== "") return r[k];
              return "";
            };
            return {
              name: String(get("name", "Name", "Product Name", "product")).trim(),
              sku: String(get("sku", "SKU", "Code", "code", "Item Code")).trim(),
              category: String(get("category", "Category", "Type")).trim() || "General",
              stock: Number(get("stock", "Stock", "Qty", "Quantity", "quantity")) || 0,
              unit: String(get("unit", "Unit")).trim() || "Piece",
              cost: Number(get("cost", "Cost", "Cost Price", "purchase price")) || 0,
              price: Number(get("price", "Price", "Selling Price", "MRP", "rate")) || 0,
              lowStock: Number(get("low stock", "LowStock", "low_stock", "reorder", "Low Stock")) || 10,
            };
          })
          .filter((p) => p.name);
        resolve(products);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ---- Export helpers ----
function download(workbook, filename) {
  XLSX.writeFile(workbook, filename);
}

export function exportProducts(products) {
  const rows = products.map((p) => ({
    Name: p.name,
    SKU: p.sku,
    Category: p.category,
    Stock: p.stock,
    Unit: p.unit,
    "Cost Price": p.cost,
    "Selling Price": p.price,
    "Low Stock Alert": p.lowStock,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  download(wb, "inventory.xlsx");
}

export function exportClients(clients) {
  const rows = clients.map((c) => ({
    Name: c.name,
    Phone: c.phone,
    Email: c.email,
    Address: c.address,
    GSTIN: c.gstin,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 26 }, { wch: 34 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  download(wb, "clients.xlsx");
}

export function exportInvoices(invoices) {
  const rows = invoices.map((inv) => {
    const subtotal = inv.items.reduce((s, it) => s + (it.qty * it.price - (it.discount || 0)), 0);
    const tax = (subtotal * (inv.taxRate || 0)) / 100;
    const total = subtotal + tax - (inv.discount || 0);
    return {
      "Invoice No": inv.number,
      Date: inv.date,
      Client: inv.client?.name || "",
      Phone: inv.client?.phone || "",
      Items: inv.items.length,
      Subtotal: subtotal,
      Tax: tax,
      Discount: inv.discount || 0,
      Total: total,
      Paid: inv.paid || 0,
      Status: inv.status,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 6 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoices");
  download(wb, "invoices.xlsx");
}

// A blank template users can fill in and re-import
export function downloadInventoryTemplate() {
  const rows = [
    { Name: "Flower Net Lace — White", SKU: "L-101", Category: "Lace", Stock: 120, Unit: "Meter", "Cost Price": 18, "Selling Price": 35, "Low Stock Alert": 15 },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  download(wb, "inventory-template.xlsx");
}
