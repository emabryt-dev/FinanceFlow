// ai.js

// categorizeTransaction(description, categories)
async function categorizeTransaction(desc, categories) {
  const s = (desc||'').toLowerCase();
  const mapping = [
    {k:['salary','pay','invoice'],'cat':'Salary'},
    {k:['coffee','starbuck','cafe','latte','tea','breakfast','lunch','dinner'],'cat':'Food'},
    {k:['amazon','shop','order','purchase','mall','target'],'cat':'Shopping'},
    {k:['rent','mortgage'],'cat':'Rent'},
    {k:['electric','water','bill','internet','phone'],'cat':'Bills'},
    {k:['uber','taxi','lyft','bus','train'],'cat':'Transport'},
    {k:['gym','membership'],'cat':'Health'}
  ];
  for (const m of mapping) {
    if (m.k.some(t => s.includes(t))) return m.cat;
  }
  // fuzzy: if description contains category name
  for (const c of categories) {
    if (s.includes(c.toLowerCase())) return c;
  }
  // fallback
  return categories[0] || 'Other';
}

// predictMonthlySavings(months=12, transactions[])
function predictMonthlySavings(transactions, months=12) {
  // compute monthly totals
  const sums = {};
  transactions.forEach(tx=>{
    const m = tx.date.slice(0,7);
    sums[m] = (sums[m]||0) + (tx.type==='expense' ? -tx.amount : tx.amount);
  });
  const values = Object.values(sums).map(v => v || 0);
  const avg = values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
  // simplistic projection: assume avg net per month
  return Array.from({length:months}, (_,i)=>({monthOffset:i+1, projected: avg}));
}

// detectRecurring(transactions)
function detectRecurring(transactions) {
  // find descriptions with multiple occurrences
  const map = {};
  transactions.forEach(tx=>{
    const key = tx.description.toLowerCase();
    map[key] = (map[key]||0) + 1;
  });
  const recurring = Object.entries(map)
    .filter(([k,v])=>v>1)
    .map(([k,v])=>({description:k,count:v}));
  return recurring;
}

window.FFAI = { categorizeTransaction, predictMonthlySavings, detectRecurring };
