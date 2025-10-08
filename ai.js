// ai.js — simple AI categorization for FinanceFlow

async function aiCategorize(description, categories) {
  const text = description.toLowerCase();

  if (text.includes("salary") || text.includes("pay")) return "Salary";
  if (text.includes("coffee") || text.includes("starbucks")) return "Food";
  if (text.includes("amazon") || text.includes("shop")) return "Shopping";
  if (text.includes("bill") || text.includes("electric") || text.includes("rent")) return "Bills";

  // fallback: pick first available category
  return categories[0] || "Other";
}
