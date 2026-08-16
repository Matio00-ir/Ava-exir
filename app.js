(() => {
  "use strict";

  const units = ["کیلوگرم", "گرم", "لیتر", "میلی‌لیتر", "عدد", "بسته", "کارتن"];
  const categories = ["شوینده خودرو", "محصول نهایی", "قرص شیشه‌شوی", "شامپو", "اسپری", "سایر"];
  const labels = { raw: "مواد اولیه", pack: "بسته‌بندی", product: "محصول نهایی" };
  const imported = Array.isArray(window.AVA_IMPORTED_FORMULAS) ? window.AVA_IMPORTED_FORMULAS : [];

  const seed = {
    version: 3,
    units,
    categories,
    materials: [],
    products: [],
    formulaVersions: [],
    inventory: [
      { id: 1, name: "سدیم لوریل اتر سولفات", code: "R1005", category: "raw", quantity: 620, unit: "کیلوگرم", price: 185000, min: 100 },
      { id: 2, name: "گلیسیرین", code: "R5007", category: "raw", quantity: 84, unit: "کیلوگرم", price: 295000, min: 100 },
      { id: 3, name: "اسانس لیمو", code: "R4002", category: "raw", quantity: 12, unit: "کیلوگرم", price: 1250000, min: 100 },
      { id: 4, name: "گالن ۲۰ لیتری", code: "P1003", category: "pack", quantity: 1680, unit: "عدد", price: 82000, min: 1000 },
      { id: 5, name: "درب فشاری", code: "P1014", category: "pack", quantity: 720, unit: "عدد", price: 18500, min: 1000 },
      { id: 6, name: "مایع دستشویی لیمو", code: "LOCAL-001", category: "product", quantity: 248, unit: "کیلوگرم", price: 410000, min: 50 }
    ],
    prices: [],
    productionLogs: [],
    users: [["حمید رضا احمدیان", "مدیر سیستم", "دسترسی کامل", "فعال"], ["محمد امین سلیمی", "مسئول تولید", "تولید و انبار", "فعال"], ["پیمان زرگر", "حسابدار", "قیمت‌ها و گزارش‌ها", "فعال"]]
  };

  const fmt = (n) => new Intl.NumberFormat("fa-IR").format(Math.round(Number(n) || 0));
  const decimal = (n) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 4 }).format(Number(n) || 0);
  const money = (n) => `${fmt(n)} ریال`;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Date.now() + Math.floor(Math.random() * 1000);
  const save = () => localStorage.setItem("ava-state", JSON.stringify(state));
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const parseNum = (v) => Number(String(v ?? "").replace(/[,،٪%]/g, "").replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))) || 0;

  let state;
  try { state = JSON.parse(localStorage.getItem("ava-state") || "null") || structuredClone(seed); } catch (_) { state = structuredClone(seed); }
  for (const key of Object.keys(seed)) if (!Array.isArray(state[key]) && key !== "version") state[key] = structuredClone(seed[key]);
  state.units = [...new Set([...(state.units || []), ...units])];
  state.categories = [...new Set([...(state.categories || []), ...categories])];
  state.materials ||= [];
  state.products ||= [];
  state.formulaVersions ||= [];
  state.productionLogs ||= [];
  state.prices ||= [];

  function toast(message, type = "success") {
    let node = $("#toast");
    if (!node) { node = document.createElement("div"); node.id = "toast"; document.body.appendChild(node); }
    node.textContent = message; node.className = `toast ${type}`;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.className = "", 3000);
  }

  function showSection(id) {
    $$(".page-section").forEach((x) => x.classList.toggle("active", x.id === id));
    $$(".nav-item").forEach((x) => x.classList.toggle("active", x.dataset.section === id));
    const nav = $(`[data-section="${id}"]`);
    if (nav) $("#pageTitle").textContent = nav.textContent.trim();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function materialByCode(code, name = "") {
    return state.materials.find((m) => (code && m.code === code) || (!code && norm(m.name) === norm(name)));
  }

  function importLegacyData() {
    if (state.formulaVersions.some((x) => x.source === "Car_products2.xls")) return;
    const materialMap = new Map();
    const packMap = new Map();
    imported.forEach((legacy) => {
      legacy.formula.forEach((line) => {
        if (!materialMap.has(line.code)) {
          const material = { id: uid(), code: line.code, name: line.name, unit: "کیلوگرم", productIds: [], active: true, currentPrice: line.rate, source: "Car_products2.xls" };
          materialMap.set(line.code, material);
        }
        const material = materialMap.get(line.code);
        material.currentPrice = line.rate || material.currentPrice;
      });
      legacy.packaging.forEach((line) => {
        if (!packMap.has(line.code)) packMap.set(line.code, { id: uid(), code: line.code, name: line.name, category: "pack", unit: "عدد", price: line.rate || 0, quantity: 0, min: 0, source: "Car_products2.xls" });
        else if (line.rate) packMap.get(line.code).price = line.rate;
      });
    });
    const materials = [...materialMap.values()];
    state.materials.push(...materials);
    state.inventory.push(...materials.map((m) => ({ id: uid(), name: m.name, code: m.code, category: "raw", quantity: 0, unit: m.unit, price: m.currentPrice || 0, min: 0, source: m.source })));
    state.inventory.push(...[...packMap.values()]);

    const productMap = new Map();
    imported.forEach((legacy) => {
      const key = `${legacy.code}|${legacy.name}`;
      let product = productMap.get(key);
      if (!product) {
        product = { id: uid(), name: legacy.name, code: legacy.code || `IMP-${legacy.id}`, category: legacy.name.includes("شامپو") ? "شامپو" : legacy.name.includes("قرص") ? "قرص شیشه‌شوی" : "شوینده خودرو", baseUnit: legacy.weightUnit || "گرم", description: `${legacy.brand} | داده واردشده از گزارش فرمولاسیون`, active: true, source: "Car_products2.xls", formulaVersionIds: [] };
        productMap.set(key, product);
      }
      const version = { id: uid(), productId: product.id, title: legacy.sheet || `نسخه ${product.formulaVersionIds.length + 1}`, source: "Car_products2.xls", status: "فعال", batchKg: legacy.batchKg, wastePct: legacy.waste, unitWeight: legacy.weight, unitWeightUnit: legacy.weightUnit, cartonCount: legacy.packCount, createdAt: legacy.sheet.match(/1405[.]/) ? legacy.sheet : "واردشده از فایل", lines: legacy.formula.map((line) => ({ materialCode: line.code, materialName: line.name, percentage: line.percentage, quantityKg: line.quantityKg, rate: line.rate, cost: line.cost })), packaging: legacy.packaging };
      state.formulaVersions.push(version);
      product.formulaVersionIds.push(version.id);
      product.activeFormulaId = product.activeFormulaId || version.id;
      version.lines.forEach((line) => {
        const material = materialMap.get(line.materialCode);
        if (material && !material.productIds.includes(product.id)) material.productIds.push(product.id);
      });
    });
    state.products.push(...productMap.values());
    save();
  }
  importLegacyData();

  function renderDashboard() {
    const inventoryValue = state.inventory.reduce((sum, x) => sum + Number(x.quantity || 0) * Number(x.price || 0), 0);
    const low = state.inventory.filter((x) => Number(x.quantity) <= Number(x.min || 0)).length;
    const production = state.productionLogs.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    $("#inventoryValue").textContent = money(inventoryValue);
    $("#productsCount").textContent = fmt(state.products.filter((x) => x.active !== false).length);
    $("#lowStockCount").textContent = fmt(low);
    $("#productionCount").textContent = `${fmt(production)} کیلوگرم`;
    renderAlerts();
  }

  function renderAlerts() {
    const alerts = state.inventory.filter((x) => Number(x.quantity) <= Number(x.min || 0)).slice(0, 8);
    $("#alertsTable").innerHTML = tableHtml(
      ["نام کالا", "کد", "موجودی فعلی", "حداقل موجودی", "وضعیت"],
      alerts.map((x) => [esc(x.name), esc(x.code || "—"), `${decimal(x.quantity)} ${esc(x.unit)}`, `${decimal(x.min)} ${esc(x.unit)}`, `<span class="badge warn">نیاز به تأمین</span>`]),
      "هشداری وجود ندارد."
    );
  }

  function tableHtml(headers, rows, empty = "موردی پیدا نشد.") {
    return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
  }

  function renderInventory(filter = $(".inventory-tabs .tab.active")?.dataset.filter || "all") {
    const query = norm($("#inventorySearch")?.value);
    const items = state.inventory.filter((x) => (filter === "all" || x.category === filter) && (!query || norm(`${x.name} ${x.code}`).includes(query)));
    $("#inventoryTable").innerHTML = tableHtml(
      ["نام کالا", "کد", "دسته‌بندی", "موجودی", "قیمت واحد", "ارزش موجودی", "وضعیت", "عملیات"],
      items.map((x) => [ `<strong>${esc(x.name)}</strong>`, esc(x.code || "—"), `<span class="badge blue">${labels[x.category]}</span>`, `${decimal(x.quantity)} ${esc(x.unit)}`, money(x.price), money(x.quantity * x.price), `<span class="badge ${x.quantity <= (x.min || 0) ? "warn" : "good"}">${x.quantity <= (x.min || 0) ? "نیاز به تأمین" : "موجود"}</span>`, `<button class="small-button" data-edit-inventory="${x.id}">ویرایش</button> <button class="small-button danger-button" data-delete-inventory="${x.id}">حذف</button>` ]),
      "موردی در این دسته وجود ندارد."
    );
  }

  function renderMaterials() {
    const query = norm($("#materialSearch")?.value);
    const items = state.materials.filter((x) => !query || norm(`${x.name} ${x.code}`).includes(query));
    $("#materialsTable").innerHTML = tableHtml(
      ["نام ماده اولیه", "کد", "واحد", "محصولات قابل استفاده", "نرخ فعلی", "وضعیت", "عملیات"],
      items.map((m) => {
        const products = (m.productIds || []).map((id) => state.products.find((p) => p.id === id)?.name).filter(Boolean);
        return [`<strong>${esc(m.name)}</strong>`, esc(m.code), esc(m.unit), products.length ? esc(products.join("، ")) : "بدون محدودیت ثبت‌شده", money(m.currentPrice), `<span class="badge ${m.active === false ? "warn" : "good"}">${m.active === false ? "غیرفعال" : "فعال"}</span>`, `<button class="small-button" data-edit-material="${m.id}">ویرایش</button> <button class="small-button danger-button" data-delete-material="${m.id}">حذف</button>`];
      }),
      "ماده اولیه‌ای ثبت نشده است."
    );
  }

  function formulaFor(product) {
    return state.formulaVersions.find((v) => v.id === product?.activeFormulaId) || state.formulaVersions.find((v) => v.productId === product?.id);
  }

  function renderProducts() {
    $("#productCards").innerHTML = state.products.map((p) => {
      const versions = state.formulaVersionIds?.length || state.formulaVersions.filter((v) => v.productId === p.id).length;
      const version = formulaFor(p);
      const total = version?.lines.reduce((s, x) => s + Number(x.percentage || 0), 0) || 0;
      return `<div class="product-card"><div class="product-head"><h3>${esc(p.name)}</h3><span class="badge good">${esc(p.code)}</span></div><p>${esc(p.description || "محصول ثبت‌شده در سیستم")}</p><div class="product-meta"><span>دسته: ${esc(p.category)}</span><span>واحد پایه: ${esc(p.baseUnit)}</span><span>نسخه فرمول: ${versions}</span></div><div class="formula"><strong>فرمول فعال: ${esc(version?.title || "ثبت نشده")}</strong><br>${(version?.lines || []).filter((x) => x.percentage > 0).slice(0, 8).map((x) => `${esc(x.materialName)}: ${decimal(x.percentage)}%`).join("، ") || "هنوز فرمولی ثبت نشده"}<br><small>جمع درصد: ${decimal(total)}%</small></div><div class="product-actions"><button class="small-button" data-view-formulas="${p.id}">مشاهده نسخه‌ها</button><button class="small-button" data-edit-product="${p.id}">ویرایش محصول</button><button class="small-button danger-button" data-delete-product="${p.id}">حذف محصول</button></div></div>`;
    }).join("") || `<div class="panel empty-state">محصولی ثبت نشده است.</div>`;
  }

  function renderPrices() {
    const items = state.inventory.filter((x) => x.category !== "product");
    $("#pricesTable").innerHTML = tableHtml(
      ["قلم کالا", "کد", "دسته‌بندی", "قیمت فعلی", "آخرین تغییر", "عملیات"],
      items.map((x) => {
        const h = state.prices.filter((p) => p.itemId === x.id).sort((a, b) => b.createdAt - a.createdAt)[0];
        return [`<strong>${esc(x.name)}</strong>`, esc(x.code || "—"), labels[x.category], money(x.price), h ? esc(h.date) : "قیمت وارداتی/اولیه", `<button class="small-button" data-change-price="${x.id}">تغییر قیمت</button>`];
      })
    );
  }

  function renderUsers() {
    $("#usersTable").innerHTML = tableHtml(["کاربر", "نقش", "سطح دسترسی", "وضعیت"], state.users.map((u) => [`<strong>${esc(u[0])}</strong>`, esc(u[1]), esc(u[2]), `<span class="badge good">${esc(u[3])}</span>`]));
  }

  function renderFormulaVersions(productId = null) {
    const versions = state.formulaVersions.filter((x) => !productId || x.productId === productId);
    $("#formulaVersions").innerHTML = tableHtml(
      ["محصول", "نسخه/منبع", "بچ پایه", "ضایعات", "تعداد در کارتن", "جمع درصد", "وضعیت", "عملیات"],
      versions.map((v) => {
        const p = state.products.find((x) => x.id === v.productId);
        const total = v.lines.reduce((sum, x) => sum + Number(x.percentage || 0), 0);
        return [`<strong>${esc(p?.name || "—")}</strong>`, esc(v.title), `${decimal(v.batchKg)} کیلوگرم`, `${decimal(v.wastePct)}%`, fmt(v.cartonCount), `${decimal(total)}%`, `<span class="badge ${Math.abs(total - 100) < .01 ? "good" : "warn"}">${Math.abs(total - 100) < .01 ? "تأییدپذیر" : "نیازمند بررسی"}</span>`, `<button class="small-button" data-use-version="${v.id}">فعال‌سازی</button>`];
      }),
      "نسخه فرمولی وجود ندارد."
    );
  }

  function populateOptions() {
    const productOptions = state.products.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.code)})</option>`).join("");
    $("#productionProduct").innerHTML = productOptions;
    $("#priceItem").innerHTML = state.inventory.filter((x) => x.category !== "product").map((x) => `<option value="${x.id}">${esc(x.name)} (${esc(x.code || "")})</option>`).join("");
    $("#formulaProduct").innerHTML = productOptions;
    $("#materialProducts").innerHTML = state.products.map((p) => `<label class="check-option"><input type="checkbox" value="${p.id}"> ${esc(p.name)}</label>`).join("");
  }

  function materialOptionHtml(query = "", selected = "") {
    const q = norm(query);
    return state.materials.filter((m) => m.active !== false && (!q || norm(`${m.name} ${m.code}`).includes(q))).slice(0, 12).map((m) => `<button type="button" class="autocomplete-option" data-material-choice="${m.id}" data-name="${esc(m.name)}">${esc(m.name)} <small>${esc(m.code)}</small></button>`).join("") || `<span class="autocomplete-empty">ماده‌ای یافت نشد</span>`;
  }

  function addFormulaLine(line = {}) {
    const host = $("#formulaLines");
    const row = document.createElement("div");
    row.className = "formula-row";
    row.innerHTML = `<div class="material-picker"><input class="material-search" placeholder="جستجوی ماده اولیه..." value="${esc(line.materialName || "")}" autocomplete="off"><div class="autocomplete-menu">${materialOptionHtml(line.materialName)}</div><input type="hidden" class="material-id" value="${esc(line.materialId || "")}"></div><input class="formula-percent" type="number" min="0" step="0.0001" placeholder="درصد" value="${line.percentage ?? ""}"><input class="formula-quantity" type="number" min="0" step="0.0001" placeholder="کیلوگرم" value="${line.quantityKg ?? ""}"><input class="formula-rate" type="number" min="0" step="1" placeholder="نرخ ریال/کیلو" value="${line.rate ?? ""}"><button type="button" class="icon-remove" data-remove-formula-row>×</button>`;
    host.appendChild(row);
  }

  function collectFormulaLines() {
    return $$(".formula-row", $("#formulaLines")).map((row) => {
      const material = state.materials.find((m) => String(m.id) === String($(".material-id", row).value));
      return material ? { materialId: material.id, materialCode: material.code, materialName: material.name, percentage: parseNum($(".formula-percent", row).value), quantityKg: parseNum($(".formula-quantity", row).value), rate: parseNum($(".formula-rate", row).value), cost: parseNum($(".formula-quantity", row).value) * parseNum($(".formula-rate", row).value) } : null;
    }).filter(Boolean);
  }

  function calculate() {
    const data = new FormData($("#productionForm"));
    const product = state.products.find((p) => String(p.id) === String(data.get("product")));
    const version = formulaFor(product);
    if (!product || !version) return;
    const amount = parseNum(data.get("amount")) || version.batchKg || 1;
    const multiplier = version.batchKg ? amount / version.batchKg : amount;
    let raw = 0;
    const shortages = [];
    const lines = version.lines.filter((x) => x.percentage > 0).map((line) => {
      const need = (line.quantityKg || (line.percentage / 100) * version.batchKg) * multiplier;
      const material = state.materials.find((m) => m.code === line.materialCode);
      const inv = state.inventory.find((i) => i.code === line.materialCode || (material && norm(i.name) === norm(material.name)));
      const rate = line.rate || material?.currentPrice || inv?.price || 0;
      const cost = need * rate; raw += cost;
      if (!inv || inv.quantity < need) shortages.push(`${line.materialName}: کمبود ${decimal(need - (inv?.quantity || 0))} کیلوگرم`);
      return `<div class="calc-line"><span>${esc(line.materialName)} (${decimal(need)} کیلوگرم)</span><b>${money(cost)}</b></div>`;
    }).join("");
    const waste = version.wastePct || 0;
    const labor = parseNum(data.get("labor"));
    const overhead = parseNum(data.get("overhead"));
    const margin = parseNum(data.get("profit"));
    const packaging = version.packaging.reduce((sum, item) => sum + Number(item.cost || item.quantity * item.rate || 0) * multiplier, 0);
    const base = raw + packaging;
    const laborCost = base * labor / 100;
    const overheadCost = base * overhead / 100;
    const cost = base + laborCost + overheadCost;
    const sale = cost * (1 + margin / 100);
    $("#calculationResult").innerHTML = `<strong>محاسبه نسخه ${esc(version.title)} برای ${decimal(amount)} کیلوگرم ${esc(product.name)}</strong>${lines}<div class="calc-line"><span>ضایعات</span><b>${decimal(waste)}%</b></div><div class="calc-line"><span>بسته‌بندی تاریخی نسخه</span><b>${money(packaging)}</b></div><div class="calc-line"><span>مواد و بسته‌بندی</span><b>${money(base)}</b></div><div class="calc-line"><span>دستمزد + سربار</span><b>${money(laborCost + overheadCost)}</b></div><div class="calc-line"><span>قیمت پیشنهادی با سود ${margin}%</span><b>${money(sale)}</b></div><div class="notice ${shortages.length ? "danger" : "success"}">${shortages.length ? `⚠ کمبود موجودی: ${shortages.join("، ")}` : "✓ موجودی مواد برای این محاسبه کافی است."}</div>`;
  }

  function openModal(id, editId = "") {
    $("#modalBackdrop").classList.add("open");
    $$(".modal").forEach((x) => x.style.display = "none");
    const modal = $(`#${id}`); if (!modal) return;
    modal.style.display = "block";
    populateOptions();
    if (id === "inventoryModal") {
      const f = $("#inventoryForm"), item = state.inventory.find((x) => String(x.id) === String(editId));
      f.reset(); f.dataset.editId = editId || ""; f.querySelector("button").textContent = item ? "ذخیره تغییرات" : "ذخیره قلم";
      if (item) { f.name.value = item.name; f.code.value = item.code || ""; f.category.value = item.category; f.quantity.value = item.quantity; f.unit.value = item.unit; f.price.value = item.price; f.min.value = item.min || 0; }
    }
    if (id === "materialModal") {
      const f = $("#materialForm"), item = state.materials.find((x) => String(x.id) === String(editId));
      f.reset(); f.dataset.editId = editId || ""; f.querySelector("button").textContent = item ? "ذخیره تغییرات" : "ذخیره ماده اولیه";
      if (item) { f.name.value = item.name; f.code.value = item.code; f.unit.value = item.unit; f.price.value = item.currentPrice || 0; $$(".check-option input", $("#materialProducts")).forEach((x) => x.checked = (item.productIds || []).includes(Number(x.value))); }
    }
    if (id === "productModal") {
      const f = $("#productForm"), item = state.products.find((x) => String(x.id) === String(editId));
      f.reset(); f.dataset.editId = editId || ""; f.querySelector("button").textContent = item ? "ذخیره تغییرات" : "ذخیره محصول";
      if (item) { f.name.value = item.name; f.code.value = item.code; f.category.value = item.category; f.unit.value = item.baseUnit; f.description.value = item.description || ""; }
    }
    if (id === "formulaModal") {
      const f = $("#formulaForm"), product = state.products.find((x) => String(x.id) === String(editId));
      f.reset(); f.dataset.editProduct = editId || ""; $("#formulaLines").innerHTML = "";
      if (product) { $("#formulaProduct").value = product.id; const version = formulaFor(product); if (version) { f.title.value = version.title; f.batchKg.value = version.batchKg; f.waste.value = version.wastePct; f.cartonCount.value = version.cartonCount; version.lines.forEach((line) => addFormulaLine({ ...line, materialId: state.materials.find((m) => m.code === line.materialCode)?.id })); } }
      if (!$("#formulaLines").children.length) addFormulaLine();
    }
    if (id === "productionModal") { calculate(); }
    if (id === "priceModal") {
      const f = $("#priceForm"); f.reset(); const item = state.inventory.find((x) => String(x.id) === String(editId)); if (item) { f.item.value = item.id; f.price.value = item.price; }
    }
  }
  const closeModal = () => $("#modalBackdrop").classList.remove("open");

  function exportReport(type = "inventory") {
    let headers, rows, name;
    if (type === "materials") { headers = ["کد", "نام ماده", "واحد", "نرخ فعلی", "محصولات قابل استفاده"]; rows = state.materials.map((m) => [m.code, m.name, m.unit, m.currentPrice, (m.productIds || []).map((id) => state.products.find((p) => p.id === id)?.name).filter(Boolean).join("، ")]); name = "مواد-اولیه"; }
    else if (type === "formulas") { headers = ["محصول", "کد محصول", "نسخه", "کد ماده", "نام ماده", "درصد", "مقدار کیلوگرم", "نرخ", "مبلغ"]; rows = state.formulaVersions.flatMap((v) => { const p = state.products.find((x) => x.id === v.productId); return v.lines.map((x) => [p?.name, p?.code, v.title, x.materialCode, x.materialName, x.percentage, x.quantityKg, x.rate, x.cost]); }); name = "فرمول-محصولات"; }
    else if (type === "production") { headers = ["تاریخ", "محصول", "مقدار", "نسخه", "هزینه مواد", "هزینه بسته‌بندی", "هزینه نهایی"]; rows = state.productionLogs.map((x) => [x.date, x.product, x.amount, x.version, x.rawCost, x.packagingCost, x.totalCost]); name = "گزارش-تولید"; }
    else { headers = ["کد", "نام کالا", "دسته", "موجودی", "واحد", "قیمت واحد", "ارزش موجودی"]; rows = state.inventory.map((x) => [x.code, x.name, labels[x.category], x.quantity, x.unit, x.price, x.quantity * x.price]); name = "گزارش-انبار"; }
    const html = `<html><meta charset="UTF-8"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.xls`; a.click(); URL.revokeObjectURL(a.href); toast("خروجی اکسل آماده شد.");
  }

  document.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (b?.dataset.section) return showSection(b.dataset.section);
    if (b?.dataset.sectionTarget) { showSection(b.dataset.sectionTarget); if (b.dataset.sectionTarget === "inventory" && b.closest(".quick-grid")) openModal("inventoryModal"); if (b.dataset.sectionTarget === "products" && b.closest(".quick-grid")) openModal("productModal"); return; }
    if (b?.dataset.open) return openModal(b.dataset.open, b.dataset.editId);
    if (b?.classList.contains("modal-close")) return closeModal();
    if (b?.dataset.editInventory) return openModal("inventoryModal", b.dataset.editInventory);
    if (b?.dataset.deleteInventory) { if (confirm("این قلم از انبار حذف شود؟")) { state.inventory = state.inventory.filter((x) => String(x.id) !== String(b.dataset.deleteInventory)); save(); refresh(); toast("قلم حذف شد."); } return; }
    if (b?.dataset.editMaterial) return openModal("materialModal", b.dataset.editMaterial);
    if (b?.dataset.deleteMaterial) { if (confirm("این ماده اولیه حذف شود؟")) { state.materials = state.materials.filter((x) => String(x.id) !== String(b.dataset.deleteMaterial)); state.inventory = state.inventory.filter((x) => !(x.category === "raw" && String(x.id) === String(b.dataset.deleteMaterial))); save(); refresh(); toast("ماده اولیه حذف شد."); } return; }
    if (b?.dataset.editProduct) return openModal("productModal", b.dataset.editProduct);
    if (b?.dataset.deleteProduct) { if (confirm("این محصول و نسخه‌های فرمول آن حذف شود؟")) { const id = Number(b.dataset.deleteProduct); state.products = state.products.filter((x) => x.id !== id); state.formulaVersions = state.formulaVersions.filter((x) => x.productId !== id); save(); refresh(); toast("محصول حذف شد."); } return; }
    if (b?.dataset.viewFormulas) { renderFormulaVersions(Number(b.dataset.viewFormulas)); showSection("formulas"); return; }
    if (b?.dataset.useVersion) { const v = state.formulaVersions.find((x) => x.id === Number(b.dataset.useVersion)); if (v) { const p = state.products.find((x) => x.id === v.productId); p.activeFormulaId = v.id; save(); renderProducts(); renderFormulaVersions(); toast("نسخه فرمول فعال شد."); } return; }
    if (b?.dataset.changePrice) return openModal("priceModal", b.dataset.changePrice);
    if (b?.dataset.report) return exportReport(b.dataset.report);
    if (b?.dataset.addFormula) return addFormulaLine();
    if (b?.dataset.removeFormulaRow) { b.closest(".formula-row")?.remove(); return; }
    if (b?.dataset.materialChoice) { const row = b.closest(".material-picker"); const material = state.materials.find((m) => String(m.id) === String(b.dataset.materialChoice)); $(".material-search", row).value = material.name; $(".material-id", row).value = material.id; $(".autocomplete-menu", row).classList.remove("open"); return; }
    if (b?.classList.contains("tab")) { const group = b.closest(".tabs"); $$(".tab", group).forEach((x) => x.classList.remove("active")); b.classList.add("active"); if (b.dataset.filter) renderInventory(b.dataset.filter); }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches(".material-search")) { const menu = event.target.closest(".material-picker").querySelector(".autocomplete-menu"); menu.innerHTML = materialOptionHtml(event.target.value); menu.classList.add("open"); }
    if (event.target.id === "inventorySearch") renderInventory();
    if (event.target.id === "materialSearch") renderMaterials();
    if (event.target.closest("#productionForm")) calculate();
  });
  document.addEventListener("focusin", (event) => { if (event.target.matches(".material-search")) event.target.closest(".material-picker").querySelector(".autocomplete-menu").classList.add("open"); });
  document.addEventListener("click", (event) => { if (!event.target.closest(".material-picker")) $$(".autocomplete-menu").forEach((x) => x.classList.remove("open")); });
  $("#modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") closeModal(); });

  $("#inventoryForm").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.currentTarget, d = new FormData(f), id = Number(f.dataset.editId), old = state.inventory.find((x) => x.id === id);
    const item = { id: id || uid(), name: d.get("name").trim(), code: d.get("code").trim() || `INV-${uid()}`, category: d.get("category"), quantity: parseNum(d.get("quantity")), unit: d.get("unit"), price: parseNum(d.get("price")), min: parseNum(d.get("min")) };
    state.inventory = id ? state.inventory.map((x) => x.id === id ? { ...old, ...item } : x) : [item, ...state.inventory]; save(); refresh(); closeModal(); toast(id ? "انبار ویرایش شد." : "قلم به انبار اضافه شد.");
  });
  $("#materialForm").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.currentTarget, d = new FormData(f), id = Number(f.dataset.editId), selected = $$(".check-option input:checked", $("#materialProducts")).map((x) => Number(x.value)), old = state.materials.find((x) => x.id === id);
    const item = { id: id || uid(), name: d.get("name").trim(), code: d.get("code").trim(), unit: d.get("unit"), currentPrice: parseNum(d.get("price")), productIds: selected, active: old?.active !== false, source: old?.source || "پنل" };
    state.materials = id ? state.materials.map((x) => x.id === id ? item : x) : [item, ...state.materials];
    const inv = state.inventory.find((x) => x.code === item.code); if (inv) Object.assign(inv, { name: item.name, unit: item.unit, price: item.currentPrice }); else state.inventory.unshift({ id: uid(), name: item.name, code: item.code, category: "raw", quantity: 0, unit: item.unit, price: item.currentPrice, min: 0 });
    save(); refresh(); closeModal(); toast(id ? "ماده اولیه ویرایش شد." : "ماده اولیه ثبت شد.");
  });
  $("#productForm").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.currentTarget, d = new FormData(f), id = Number(f.dataset.editId), old = state.products.find((x) => x.id === id); const item = { id: id || uid(), name: d.get("name").trim(), code: d.get("code").trim() || `PRD-${uid()}`, category: d.get("category"), baseUnit: d.get("unit"), description: d.get("description").trim(), active: old?.active !== false, formulaVersionIds: old?.formulaVersionIds || [], activeFormulaId: old?.activeFormulaId };
    state.products = id ? state.products.map((x) => x.id === id ? item : x) : [item, ...state.products]; save(); refresh(); closeModal(); toast(id ? "محصول ویرایش شد." : "محصول ثبت شد.");
  });
  $("#formulaForm").addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.currentTarget, productId = Number(f.editProduct || f.dataset.editProduct || $("#formulaProduct").value), product = state.products.find((p) => p.id === productId), lines = collectFormulaLines(); if (!product || !lines.length) return toast("محصول و حداقل یک ماده اولیه را انتخاب کنید.", "error");
    const total = lines.reduce((sum, x) => sum + x.percentage, 0); if (Math.abs(total - 100) > .01 && !confirm(`جمع درصد فرمول ${decimal(total)}٪ است. ذخیره شود؟`)) return;
    const version = { id: uid(), productId, title: f.title.value.trim() || `نسخه ${state.formulaVersions.filter((x) => x.productId === productId).length + 1}`, source: "پنل", status: "فعال", batchKg: parseNum(f.batchKg.value), wastePct: parseNum(f.waste.value), cartonCount: parseNum(f.cartonCount.value), createdAt: new Date().toLocaleDateString("fa-IR"), lines, packaging: [] };
    state.formulaVersions.push(version); product.formulaVersionIds.push(version.id); product.activeFormulaId = version.id; lines.forEach((line) => { const m = state.materials.find((x) => x.id === line.materialId); if (m && !m.productIds.includes(product.id)) m.productIds.push(product.id); }); save(); refresh(); closeModal(); toast("نسخه فرمول ذخیره و فعال شد.");
  });
  $("#productionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const product = state.products.find((p) => String(p.id) === String(data.get("product")));
    const version = formulaFor(product);
    if (!product || !version) return;
    const amount = parseNum(data.get("amount"));
    const multiplier = version.batchKg ? amount / version.batchKg : amount;
    const rawCost = version.lines.reduce((sum, line) => sum + Number(line.cost || (line.quantityKg || 0) * (line.rate || 0)) * multiplier, 0);
    const packagingCost = version.packaging.reduce((sum, line) => sum + Number(line.cost || (line.quantity || 0) * (line.rate || 0)) * multiplier, 0);
    const base = rawCost + packagingCost;
    const totalCost = base * (1 + (parseNum(data.get("labor")) + parseNum(data.get("overhead"))) / 100);
    state.productionLogs.unshift({ id: uid(), date: new Date().toLocaleDateString("fa-IR"), product: product.name, version: version.title, amount, rawCost, packagingCost, totalCost });
    save(); refresh(); closeModal(); toast("گزارش محاسبه تولید ثبت شد.");
  });
  $("#addUserButton")?.addEventListener("click", () => {
    const name = prompt("نام و نام خانوادگی کاربر:");
    if (!name?.trim()) return;
    const role = prompt("نقش کاربر:", "کاربر جدید") || "کاربر جدید";
    const access = prompt("سطح دسترسی:", "مشاهده") || "مشاهده";
    state.users.push([name.trim(), role.trim(), access.trim(), "فعال"]);
    save(); renderUsers(); toast("کاربر جدید ثبت شد.");
  });
  $("#priceForm").addEventListener("submit", (e) => { e.preventDefault(); const d = new FormData(e.currentTarget), item = state.inventory.find((x) => String(x.id) === String(d.get("item"))); if (!item) return; const old = item.price; item.price = parseNum(d.get("price")); state.prices.push({ itemId: item.id, date: d.get("date"), createdAt: Date.now(), changeText: old ? `${item.price >= old ? "↗" : "↘"} ${decimal(Math.abs((item.price - old) / old * 100))}%` : "جدید" }); const material = state.materials.find((m) => m.code === item.code); if (material) material.currentPrice = item.price; save(); refresh(); closeModal(); toast("قیمت ثبت شد."); });

  function refresh() { populateOptions(); renderDashboard(); renderInventory(); renderMaterials(); renderProducts(); renderPrices(); renderUsers(); renderFormulaVersions(); }
  const menuToggle = $("#mobileMenuToggle"), shell = $(".app-shell"); if (menuToggle) menuToggle.addEventListener("click", () => shell.classList.toggle("menu-open"));
  refresh();
})();
