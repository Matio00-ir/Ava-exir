(() => {
  "use strict";
  const seed = {
    inventory: [
      { id: 1, name: "سدیم لوریل اتر سولفات", category: "raw", quantity: 620, unit: "کیلوگرم", price: 185000, min: 100 },
      { id: 2, name: "گلیسیرین", category: "raw", quantity: 84, unit: "کیلوگرم", price: 295000, min: 100 },
      { id: 3, name: "اسانس لیمو", category: "raw", quantity: 12, unit: "کیلوگرم", price: 1250000, min: 100 },
      { id: 4, name: "گالن ۲۰ لیتری", category: "pack", quantity: 1680, unit: "عدد", price: 82000, min: 1000 },
      { id: 5, name: "درب فشاری", category: "pack", quantity: 720, unit: "عدد", price: 18500, min: 1000 },
      { id: 6, name: "مایع دستشویی لیمو", category: "product", quantity: 248, unit: "کیلوگرم", price: 410000, min: 50 }
    ],
    products: [
      { id: 1, name: "مایع دستشویی لیمو", type: "شوینده", unit: "کیلوگرم", description: "مایع دستشویی با رایحه لیمو و فرمول ملایم", formula: [["سدیم لوریل اتر سولفات", .18], ["گلیسیرین", .04], ["اسانس لیمو", .006]] },
      { id: 2, name: "شامپو روزانه", type: "بهداشتی", unit: "کیلوگرم", description: "شامپو مناسب مصرف روزانه", formula: [["سدیم لوریل اتر سولفات", .2], ["گلیسیرین", .03]] },
      { id: 3, name: "شیشه‌شوی", type: "نظافتی", unit: "کیلوگرم", description: "محلول شیشه‌شوی بدون ایجاد لکه", formula: [["اسانس لیمو", .002]] }
    ],
    prices: [],
    users: [["مریم احمدی", "مدیر سیستم", "دسترسی کامل", "فعال"], ["علی رضایی", "مسئول تولید", "تولید و انبار", "فعال"], ["سارا کریمی", "حسابدار", "قیمت‌ها و گزارش‌ها", "فعال"]]
  };
  let state;
  try { state = JSON.parse(localStorage.getItem("ava-state") || "null") || seed; } catch (_) { state = seed; }
  state.inventory = Array.isArray(state.inventory) ? state.inventory : seed.inventory;
  state.products = Array.isArray(state.products) ? state.products : seed.products;
  state.prices = Array.isArray(state.prices) ? state.prices : [];
  state.users = Array.isArray(state.users) ? state.users : seed.users;
  const labels = { raw: "مواد اولیه", pack: "ادوات بسته‌بندی", product: "موجودی محصول" };
  const fmt = (n) => new Intl.NumberFormat("fa-IR").format(Math.round(Number(n) || 0));
  const money = (n) => `${fmt(n)} ریال`;
  const save = () => localStorage.setItem("ava-state", JSON.stringify(state));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function toast(message, type = "success") {
    let node = $("#toast");
    if (!node) { node = document.createElement("div"); node.id = "toast"; document.body.appendChild(node); }
    node.textContent = message; node.className = `toast ${type}`;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.className = "", 2800);
  }
  function showSection(id) {
    $$(".page-section").forEach((x) => x.classList.toggle("active", x.id === id));
    $$(".nav-item").forEach((x) => x.classList.toggle("active", x.dataset.section === id));
    const nav = $(`[data-section="${id}"]`); if (nav) $("#pageTitle").textContent = nav.textContent.trim();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderInventory(filter = $(".tab.active")?.dataset.filter || "all") {
    const query = ($("#inventorySearch")?.value || "").trim().toLowerCase();
    const items = state.inventory.filter((x) => (filter === "all" || x.category === filter) && x.name.toLowerCase().includes(query));
    $("#inventoryTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>نام کالا</th><th>دسته‌بندی</th><th>موجودی</th><th>قیمت واحد</th><th>ارزش موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>${items.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td><span class="badge blue">${labels[x.category]}</span></td><td>${fmt(x.quantity)} ${esc(x.unit)}</td><td>${money(x.price)}</td><td>${money(x.quantity * x.price)}</td><td><span class="badge ${x.quantity <= (x.min ?? 0) ? "warn" : "good"}">${x.quantity <= (x.min ?? 0) ? "نیاز به تأمین" : "موجود"}</span></td><td><button class="small-button" data-edit-inventory="${x.id}">ویرایش</button> <button class="small-button danger-button" data-delete-inventory="${x.id}">حذف</button></td></tr>`).join("") || `<tr><td colspan="7">موردی پیدا نشد.</td></tr>`}</tbody></table></div>`;
    const alerts = state.inventory.filter((x) => x.quantity <= (x.min ?? 0)).slice(0, 4);
    $("#alertsTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>نام کالا</th><th>موجودی فعلی</th><th>حداقل موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>${alerts.map((x) => `<tr><td><strong>${esc(x.name)}</strong></td><td>${fmt(x.quantity)} ${esc(x.unit)}</td><td>${fmt(x.min)} ${esc(x.unit)}</td><td><span class="badge warn">رو به اتمام</span></td><td><button class="small-button" data-edit-inventory="${x.id}">تأمین موجودی</button></td></tr>`).join("") || `<tr><td colspan="5">هشداری وجود ندارد.</td></tr>`}</tbody></table></div>`;
  }
  function renderProducts() {
    $("#productCards").innerHTML = state.products.map((p) => `<div class="product-card"><div class="product-head"><h3>${esc(p.name)}</h3><span class="badge good">فعال</span></div><p>${esc(p.description || "محصول ثبت‌شده در سیستم")}</p><div class="formula"><strong>فرمول پایه / ${esc(p.unit)}</strong><br>${(p.formula || []).map(([n, a]) => `${esc(n)}: ${a} ${esc(p.unit)}`).join("، ") || "هنوز فرمولی ثبت نشده"}</div><div class="product-actions"><button class="small-button" data-edit-product="${p.id}">ویرایش محصول</button><button class="small-button danger-button" data-delete-product="${p.id}">حذف محصول</button></div></div>`).join("");
  }
  function renderPrices(filter = $(".price-tabs .tab.active")?.dataset.priceFilter || "all") {
    const host = $("#pricesTable");
    if (!host) return;
    if (!$(".price-tabs")) {
      const tabs = document.createElement("div");
      tabs.className = "tabs price-tabs";
      tabs.innerHTML = `<button class="tab active" data-price-filter="all">همه</button><button class="tab" data-price-filter="raw">مواد اولیه</button><button class="tab" data-price-filter="pack">ادوات بسته‌بندی</button><button class="tab" data-price-filter="product">محصولات</button>`;
      host.parentElement.insertBefore(tabs, host);
    }
    $$(".price-tabs .tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.priceFilter === filter));
    const items = state.inventory.filter((x) => filter === "all" || x.category === filter);
    host.innerHTML = `<div class="table-wrap"><table><thead><tr><th>قلم کالا</th><th>دسته‌بندی</th><th>قیمت فعلی</th><th>آخرین تاریخ تغییر</th><th>تغییر ماهانه</th><th>عملیات</th></tr></thead><tbody>${items.map((x) => { const h = state.prices.filter((p) => p.itemId === x.id).sort((a, b) => b.createdAt - a.createdAt)[0]; return `<tr><td><strong>${esc(x.name)}</strong></td><td><span class="badge blue">${labels[x.category]}</span></td><td>${money(x.price)}</td><td>${h ? esc(h.date) : "قیمت اولیه"}</td><td>${h?.changeText || "—"}</td><td><button class="small-button" data-change-price="${x.id}">تغییر قیمت</button></td></tr>`; }).join("") || `<tr><td colspan="6">موردی در این دسته وجود ندارد.</td></tr>`}</tbody></table></div>`;
  }
  function renderUsers() { $("#usersTable").innerHTML = `<div class="table-wrap"><table><thead><tr><th>کاربر</th><th>نقش</th><th>سطح دسترسی</th><th>وضعیت</th></tr></thead><tbody>${state.users.map((u) => `<tr><td><strong>${esc(u[0])}</strong></td><td>${esc(u[1])}</td><td>${esc(u[2])}</td><td><span class="badge good">${esc(u[3])}</span></td></tr>`).join("")}</tbody></table></div>`; }
  function populateOptions() { $("#productionProduct").innerHTML = state.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join(""); $("#priceItem").innerHTML = state.inventory.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join(""); }
  function calculate() {
    const data = new FormData($("#productionForm")); const p = state.products.find((x) => String(x.id) === String(data.get("product"))); if (!p) return;
    const amount = Number(data.get("amount")) || 0, size = Number(data.get("packaging")) || 1, labor = Number(data.get("labor")) || 0, profit = Number(data.get("profit")) || 0, tax = Number(data.get("tax")) || 0;
    let raw = 0; const shortages = []; const lines = (p.formula || []).map(([name, rate]) => { const need = rate * amount, item = state.inventory.find((x) => x.name === name), cost = need * (item?.price || 0); raw += cost; if (!item || item.quantity < need) shortages.push(`${name}: ${fmt(need - (item?.quantity || 0))} کیلوگرم`); return `<div class="calc-line"><span>${esc(name)} (${fmt(need)} کیلوگرم)</span><b>${money(cost)}</b></div>`; }).join("");
    const count = Math.ceil(amount / size), pack = state.inventory.find((x) => x.category === "pack" && x.name.includes(`${size} لیتری`)), packCost = count * (pack?.price || 0), base = raw + packCost, laborCost = base * labor / 100, profitCost = (base + laborCost) * profit / 100, total = (base + laborCost + profitCost) * (1 + tax / 100);
    $("#calculationResult").innerHTML = `<strong>محاسبه برای ${fmt(amount)} کیلوگرم ${esc(p.name)}</strong>${lines}<div class="calc-line"><span>بسته‌بندی (${fmt(count)} عدد)</span><b>${money(packCost)}</b></div><div class="calc-line"><span>بهای مواد و بسته‌بندی</span><b>${money(base)}</b></div><div class="calc-line"><span>اجرت ${labor}% + سود ${profit}%</span><b>${money(laborCost + profitCost)}</b></div><div class="calc-line"><span>مبلغ نهایی با مالیات ${tax}%</span><b>${money(total)}</b></div><div class="notice ${shortages.length ? "danger" : "success"}">${shortages.length ? `⚠ کمبود موجودی: ${shortages.join("، ")}` : "✓ موجودی مواد و بسته‌بندی کافی است."}</div>`;
  }
  function openModal(id, editId = "") {
    $("#modalBackdrop").classList.add("open"); $$(".modal").forEach((x) => x.style.display = "none"); const modal = $(`#${id}`); if (!modal) return; modal.style.display = "block";
    if (id === "productionModal") { populateOptions(); calculate(); }
    if (id === "priceModal") {
      $("#priceForm").reset();
      populateOptions();
      const item = state.inventory.find((x) => String(x.id) === String(editId));
      if (item) {
        $("#priceItem").value = String(item.id);
        $("#priceForm").price.value = item.price;
        $("#priceForm").date.value = "";
      }
    }
    if (id === "inventoryModal") { const f = $("#inventoryForm"), item = state.inventory.find((x) => String(x.id) === String(editId)); f.dataset.editId = editId; f.querySelector("button").textContent = item ? "ذخیره تغییرات" : "ذخیره قلم"; if (item) { f.name.value = item.name; f.category.value = item.category; f.quantity.value = item.quantity; f.unit.value = item.unit; f.price.value = item.price; } else f.reset(); }
    if (id === "productModal") { const f = $("#productForm"), item = state.products.find((x) => String(x.id) === String(editId)); f.dataset.editId = editId; f.querySelector("button").textContent = item ? "ذخیره تغییرات" : "ذخیره محصول"; if (item) { f.name.value = item.name; f.type.value = item.type; f.unit.value = item.unit; f.description.value = item.description || ""; f.formula.value = (item.formula || []).map((x) => x.join(", ")).join("\n"); } else f.reset(); }
  }
  const closeModal = () => $("#modalBackdrop").classList.remove("open");
  const parseFormula = (v) => String(v || "").split("\n").map((line) => line.split(",")).filter((x) => x.length === 2 && x[0].trim() && Number(x[1]) > 0).map((x) => [x[0].trim(), Number(x[1])]);

  document.addEventListener("click", (event) => {
    const b = event.target.closest("button"); if (!b) return;
    if (b.dataset.section) return showSection(b.dataset.section);
    if (b.dataset.sectionTarget) {
      if (b.closest(".quick-grid") && b.dataset.sectionTarget === "inventory") return openModal("inventoryModal");
      if (b.closest(".quick-grid") && b.dataset.sectionTarget === "products") return openModal("productModal");
      return showSection(b.dataset.sectionTarget);
    }
    if (b.dataset.open) return openModal(b.dataset.open);
    if (b.classList.contains("modal-close")) return closeModal();
    if (b.dataset.editInventory) return openModal("inventoryModal", b.dataset.editInventory);
    if (b.dataset.deleteInventory) { if (confirm("این قلم از انبار حذف شود؟")) { state.inventory = state.inventory.filter((x) => String(x.id) !== String(b.dataset.deleteInventory)); save(); renderInventory(); renderPrices(); populateOptions(); toast("قلم حذف شد."); } return; }
    if (b.dataset.editProduct) return openModal("productModal", b.dataset.editProduct);
    if (b.dataset.deleteProduct) { if (confirm("این محصول حذف شود؟")) { state.products = state.products.filter((x) => String(x.id) !== String(b.dataset.deleteProduct)); save(); renderProducts(); populateOptions(); toast("محصول حذف شد."); } return; }
    if (b.dataset.changePrice) return openModal("priceModal", b.dataset.changePrice);
    if (b.dataset.priceFilter) { renderPrices(b.dataset.priceFilter); return; }
    if (b.classList.contains("tab")) { $$(".tab").forEach((x) => x.classList.remove("active")); b.classList.add("active"); renderInventory(b.dataset.filter); }
    if (b.closest(".report-card")) toast("گزارش آماده شد.");
  });
  $("#modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") closeModal(); });
  $("#inventorySearch").addEventListener("input", () => renderInventory());
  $("#productionForm").addEventListener("input", calculate);
  $("#inventoryForm").addEventListener("submit", (e) => { e.preventDefault(); const f = e.currentTarget, d = new FormData(f), id = Number(f.dataset.editId), old = state.inventory.find((x) => x.id === id); const item = { id: id || Date.now(), name: d.get("name").trim(), category: d.get("category"), quantity: Number(d.get("quantity")), unit: d.get("unit").trim(), price: Number(d.get("price")), min: old?.min || 0 }; state.inventory = id ? state.inventory.map((x) => x.id === id ? item : x) : [item, ...state.inventory]; save(); renderInventory(); renderPrices(); populateOptions(); closeModal(); toast(id ? "انبار ویرایش شد." : "قلم به انبار اضافه شد."); });
  $("#productForm").addEventListener("submit", (e) => { e.preventDefault(); const f = e.currentTarget, d = new FormData(f), id = Number(f.dataset.editId); const item = { id: id || Date.now(), name: d.get("name").trim(), type: d.get("type").trim(), unit: d.get("unit").trim(), description: d.get("description").trim(), formula: parseFormula(d.get("formula")) }; state.products = id ? state.products.map((x) => x.id === id ? item : x) : [item, ...state.products]; save(); renderProducts(); populateOptions(); closeModal(); toast(id ? "محصول ویرایش شد." : "محصول ثبت شد."); });
  $("#productionForm").addEventListener("submit", (e) => { e.preventDefault(); const d = new FormData(e.currentTarget), p = state.products.find((x) => String(x.id) === String(d.get("product"))), amount = Number(d.get("amount")), size = Number(d.get("packaging")), count = Math.ceil(amount / size), lacks = (p.formula || []).filter(([n, r]) => { const i = state.inventory.find((x) => x.name === n); return !i || i.quantity < r * amount; }), pack = state.inventory.find((x) => x.category === "pack" && x.name.includes(`${size} لیتری`)); if (lacks.length || (pack && pack.quantity < count)) return toast("به‌دلیل کمبود موجودی، تولید ثبت نشد.", "error"); (p.formula || []).forEach(([n, r]) => { state.inventory.find((x) => x.name === n).quantity -= r * amount; }); if (pack) pack.quantity -= count; const finished = state.inventory.find((x) => x.category === "product" && x.name === p.name); if (finished) finished.quantity += amount; else state.inventory.push({ id: Date.now(), name: p.name, category: "product", quantity: amount, unit: p.unit, price: 0, min: 0 }); save(); renderInventory(); closeModal(); showSection("inventory"); toast("تولید ثبت شد و موجودی کسر شد."); });
  $("#priceForm").addEventListener("submit", (e) => { e.preventDefault(); const d = new FormData(e.currentTarget), item = state.inventory.find((x) => String(x.id) === String(d.get("item"))); if (!item) return; const old = item.price; item.price = Number(d.get("price")); state.prices.push({ itemId: item.id, date: d.get("date"), createdAt: Date.now(), changeText: old ? `${item.price >= old ? "↗" : "↘"} ${fmt(Math.abs((item.price - old) / old * 100))}%` : "جدید" }); save(); renderPrices(); renderInventory(); closeModal(); toast("قیمت ثبت شد."); });
  const userButton = $("#users .page-heading .primary");
  if (userButton) userButton.addEventListener("click", () => {
    const name = prompt("نام و نام خانوادگی کاربر:");
    if (!name?.trim()) return;
    const role = prompt("نقش کاربر:", "کاربر جدید") || "کاربر جدید";
    const access = prompt("سطح دسترسی:", "مشاهده") || "مشاهده";
    state.users.push([name.trim(), role.trim(), access.trim(), "فعال"]);
    save(); renderUsers(); toast("کاربر جدید ثبت شد.");
  });
  if (!$("#productForm").elements.formula) { const label = document.createElement("label"); label.innerHTML = 'فرمول پایه (هر خط: نام ماده، مقدار در یک کیلو)<textarea name="formula" placeholder="گلیسیرین, 0.04&#10;اسانس لیمو, 0.006"></textarea>'; $("#productForm button").before(label); }
  renderInventory(); renderProducts(); renderPrices(); renderUsers();
})();
