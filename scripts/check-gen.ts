import { getDashboardStats, getCategoryRatio, getMonthlyAcquisition, getLaptopStats, filterAssets, getConsumableStats } from "@/data";

const s = getDashboardStats();
console.log("dashboard stats:", s);
console.log("expect totalAssets=906, rfidUnregistered=601, laptopsOut=16-ish");
console.log("category ratio:", getCategoryRatio().map((c) => `${c.name}:${c.count}`).join(", "));
console.log("category total:", getCategoryRatio().reduce((a, c) => a + c.count, 0));
console.log("laptop stats:", getLaptopStats());
console.log("consumable stats:", getConsumableStats());
console.log("monthly (last 4):", getMonthlyAcquisition().slice(-4));
const f = filterAssets({ page: 1, pageSize: 5 });
console.log("filter total:", f.total, "totalAmount:", f.totalAmount.toLocaleString("ko-KR"));
console.log("sample mgmt nos:", f.rows.map((r) => r.lockedManagementNo).slice(0, 3));
