// Сэдэв бүрийн дүрслэл (inline SVG / HTML, гадны library-гүй).
// VIZ[topicId] = function (container) { ... }
const VIZ = (function () {
  "use strict";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Алхамт дүрслэлийн нийтлэг удирдлага
  function stepper(root, count, render, extraTop = "") {
    let i = 0;
    root.innerHTML = `
      ${extraTop}
      <div class="viz-stage"></div>
      <div class="viz-caption"></div>
      <div class="row viz-ctrl">
        <button class="btn" data-a="prev">← Өмнөх</button>
        <span class="muted viz-count"></span>
        <button class="btn primary" data-a="next">Дараах →</button>
        <button class="btn" data-a="reset">Эхнээс</button>
      </div>`;
    const stage = root.querySelector(".viz-stage");
    const cap = root.querySelector(".viz-caption");
    const cnt = root.querySelector(".viz-count");
    const prev = root.querySelector('[data-a="prev"]');
    const next = root.querySelector('[data-a="next"]');
    function draw() {
      const n = typeof count === "function" ? count() : count;
      if (i > n - 1) i = n - 1;
      const r = render(i);
      stage.innerHTML = r.html;
      cap.innerHTML = r.caption;
      cnt.textContent = `${i + 1} / ${n}`;
      prev.disabled = i === 0;
      next.disabled = i === n - 1;
      if (r.after) r.after(stage);
    }
    prev.addEventListener("click", () => { i--; draw(); });
    next.addEventListener("click", () => { i++; draw(); });
    root.querySelector('[data-a="reset"]').addEventListener("click", () => { i = 0; draw(); });
    return { draw, reset() { i = 0; draw(); } };
  }

  // ───────────────────────── ERD ─────────────────────────
  function ent(x, y, w, name, attrs, cls = "") {
    const h = 30 + attrs.length * 22 + 8;
    let s = `<g class="ent ${cls}">
      <rect class="ent-b" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>
      <path class="ent-h" d="M${x} ${y + 30} V${y + 7} Q${x} ${y} ${x + 7} ${y} H${x + w - 7} Q${x + w} ${y} ${x + w} ${y + 7} V${y + 30} Z"/>
      <text class="ent-n" x="${x + w / 2}" y="${y + 20}" text-anchor="middle">${esc(name)}</text>`;
    attrs.forEach(([t, k, extra], i) => {
      const ty = y + 30 + 19 + i * 22;
      const tag = k === "pk" ? "PK" : k === "fk" ? "FK" : k === "pkfk" ? "PK, FK" : "";
      s += `<text class="ent-a${extra ? " " + extra : ""}" x="${x + 12}" y="${ty}">${tag ? `<tspan class="key">${tag}</tspan>  ` : ""}${esc(t)}</text>`;
    });
    return s + "</g>";
  }
  // d = +1: entity нь цэгийн БАРУУН талд; d = -1: ЗҮҮН талд
  const one = (x, y, d) =>
    `<line x1="${x - 9 * d}" y1="${y - 9}" x2="${x - 9 * d}" y2="${y + 9}"/><line x1="${x - 16 * d}" y1="${y - 9}" x2="${x - 16 * d}" y2="${y + 9}"/>`;
  const many = (x, y, d) =>
    `<line x1="${x - 18 * d}" y1="${y}" x2="${x}" y2="${y - 10}"/><line x1="${x - 18 * d}" y1="${y}" x2="${x}" y2="${y}"/><line x1="${x - 18 * d}" y1="${y}" x2="${x}" y2="${y + 10}"/><line x1="${x - 24 * d}" y1="${y - 9}" x2="${x - 24 * d}" y2="${y + 9}"/>`;

  function erd(root) {
    const actor = [["ActorID", "pk"], ["FirstName"], ["LastName"]];
    const movie = [["MovieID", "pk"], ["Title"], ["ReleaseYear"]];
    const steps = [
      () => ({
        html: `<svg class="viz-svg" viewBox="0 25 720 140" role="img" aria-label="Actor ба Movie хоёрын M:N холбоос">
          ${ent(30, 40, 190, "ACTOR", actor)}
          ${ent(500, 40, 190, "MOVIE", movie)}
          <g class="rel bad"><line x1="220" y1="105" x2="500" y2="105"/>${many(220, 105, -1)}${many(500, 105, 1)}</g>
          <text class="rel-l bad-t" x="360" y="92" text-anchor="middle">M : N</text>
          <text class="rel-s" x="360" y="128" text-anchor="middle">plays in / features</text>
        </svg>`,
        caption: `<strong>1. Асуудал.</strong> Нэг жүжигчин олон кинонд тоглодог, нэг кинонд олон жүжигчин тоглодог. Энэ нь <b>many-to-many (M:N)</b> холбоос. Хоёр талдаа хэрээний хөл (crow's foot) байна. Relational database M:N-ийг шууд хадгалж чадахгүй: MovieID-г ACTOR хүснэгтэд хийвэл нэг нүдэнд олон утга орох болно (1NF зөрчинө).`,
      }),
      () => ({
        html: `<svg class="viz-svg" viewBox="0 25 720 140" role="img" aria-label="CASTING associative entity-ээр шийдсэн ERD">
          ${ent(10, 40, 170, "ACTOR", actor)}
          ${ent(275, 40, 170, "CASTING", [["ActorID", "pkfk"], ["MovieID", "pkfk"]], "new")}
          ${ent(540, 40, 170, "MOVIE", movie)}
          <g class="rel"><line x1="180" y1="105" x2="275" y2="105"/>${one(180, 105, -1)}${many(275, 105, 1)}</g>
          <g class="rel"><line x1="445" y1="105" x2="540" y2="105"/>${many(445, 105, -1)}${one(540, 105, 1)}</g>
          <text class="rel-l" x="228" y="90" text-anchor="middle">1 : M</text>
          <text class="rel-l" x="492" y="90" text-anchor="middle">M : 1</text>
        </svg>`,
        caption: `<strong>2. Шийдэл.</strong> Дунд нь <b>associative (junction) entity</b> болох CASTING-ийг үүсгэнэ. M:N холбоос хоёр <b>1:M</b> холбоос болж задарна. CASTING нь хоёр хүснэгтийн PK-г <b>foreign key</b> болгон агуулна. Хоёулаа нийлээд <b>composite primary key</b> болно. Хэрээний хөл үргэлж CASTING талд, "олон" тал нь энэ хүснэгт.`,
      }),
      () => ({
        html: `<svg class="viz-svg" viewBox="0 25 720 140" role="img" aria-label="CASTING хүснэгтэд CharacterName нэмсэн ERD">
          ${ent(10, 40, 170, "ACTOR", actor)}
          ${ent(275, 40, 170, "CASTING", [["ActorID", "pkfk"], ["MovieID", "pkfk"], ["CharacterName", "", "added"]], "new")}
          ${ent(540, 40, 170, "MOVIE", movie)}
          <g class="rel"><line x1="180" y1="105" x2="275" y2="105"/>${one(180, 105, -1)}${many(275, 105, 1)}</g>
          <g class="rel"><line x1="445" y1="105" x2="540" y2="105"/>${many(445, 105, -1)}${one(540, 105, 1)}</g>
          <text class="rel-l" x="228" y="90" text-anchor="middle">1 : M</text>
          <text class="rel-l" x="492" y="90" text-anchor="middle">M : 1</text>
        </svg>`,
        caption: `<strong>3. Холбоосын өөрийн мэдээлэл.</strong> "Энэ жүжигчин ЭНЭ кинонд ямар дүр бүтээсэн бэ?" гэдэг нь зөвхөн жүжигчин эсвэл зөвхөн кинонд хамаарахгүй, хоёулаа хамт байж утгатай. Тиймээс <b>CharacterName</b> нь CASTING-д орно. Шалгалтын ERD-д: entity бүрийн нэр, PK/FK, crow's foot cardinality гурвыг заавал зур.`,
      }),
    ];
    stepper(root, steps.length, (i) => steps[i]());
  }

  // ─────────────────────── NORMALISATION ───────────────────────
  function tbl(name, cols, rows, o = {}) {
    const hl = new Set(o.hl || []);
    return `<div class="nt${o.cls ? " " + o.cls : ""}">
      <div class="nt-name">${esc(name)}</div>
      <table><thead><tr>${cols.map((c) => `<th class="${c.bad ? "bad" : ""}${c.good ? "good" : ""}">${c.pk ? '<span class="k">PK</span>' : ""}${c.fk ? '<span class="k fk">FK</span>' : ""}${esc(c.n)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((v, ci) => `<td class="${cols[ci].bad ? "bad" : ""}${hl.has(v) ? " hl" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function normalisation(root) {
    const C = (n, o = {}) => ({ n, ...o });
    const ORDERS = [["1001", "03/11", "C7"], ["1002", "04/11", "C9"], ["1003", "05/11", "C7"]];
    const PRODUCT = tbl("PRODUCT", [C("ProductID", { pk: 1 }), C("Name"), C("Price")], [["P1", "Pen", "2"], ["P5", "Book", "15"], ["P8", "USB", "9"]]);
    const LINE = tbl("ORDER_LINE", [C("OrderID", { pk: 1, fk: 1 }), C("ProductID", { pk: 1, fk: 1 }), C("Qty")], [["1001", "P1", "2"], ["1001", "P5", "1"], ["1002", "P1", "5"], ["1003", "P5", "2"], ["1003", "P8", "1"]]);
    const steps = [
      {
        label: "UNF",
        html: tbl("ORDER (UNF)", [C("OrderID", { pk: 1 }), C("Date"), C("CustID"), C("CustEmail"), C("Products", { bad: 1 })], [
          ["1001", "03/11", "C7", "ana@mail.com", "P1 Pen $2 ×2; P5 Book $15 ×1"],
          ["1002", "04/11", "C9", "bo@mail.com", "P1 Pen $2 ×5"],
          ["1003", "05/11", "C7", "ana@mail.com", "P5 Book $15 ×2; P8 USB $9 ×1"],
        ]),
        caption: `<strong>Unnormalised (UNF).</strong> <b>Products</b> баганын нэг нүдэнд олон бүтээгдэхүүн бичигдсэн байна. Үүнийг <b>repeating group</b> гэдэг. Утгууд <b>atomic</b> биш тул "Pen хэдэн удаа зарагдсан бэ?" гэх мэт асуулга бичих боломжгүй.`,
      },
      {
        label: "1NF",
        html: tbl("ORDER_DATA (1NF)", [C("OrderID", { pk: 1 }), C("ProductID", { pk: 1 }), C("Date", { bad: 1 }), C("CustID", { bad: 1 }), C("CustEmail", { bad: 1 }), C("ProductName", { bad: 1 }), C("Price", { bad: 1 }), C("Qty", { good: 1 })], [
          ["1001", "P1", "03/11", "C7", "ana@mail.com", "Pen", "2", "2"],
          ["1001", "P5", "03/11", "C7", "ana@mail.com", "Book", "15", "1"],
          ["1002", "P1", "04/11", "C9", "bo@mail.com", "Pen", "2", "5"],
          ["1003", "P5", "05/11", "C7", "ana@mail.com", "Book", "15", "2"],
          ["1003", "P8", "05/11", "C7", "ana@mail.com", "USB", "9", "1"],
        ]),
        caption: `<strong>1NF ✓</strong> Нэг мөрөнд нэг бүтээгдэхүүн, нүд бүр нэг утгатай. PK нь <b>(OrderID, ProductID)</b> гэсэн <b>composite key</b>. <span class="bad-t">Улаан</span> баганууд <b>partial dependency</b>-тэй, өөрөөр хэлбэл түлхүүрийн зөвхөн НЭГ хэсгээс хамаарна: Date, CustID, CustEmail нь зөвхөн OrderID-аас, ProductName, Price нь зөвхөн ProductID-аас хамаардаг. Зөвхөн <span class="good-t">Qty</span> бүхэл түлхүүрээс хамаарна. Үр дүнд нь "Pen, 2" давтагдаж байна.`,
      },
      {
        label: "2NF",
        html: tbl("ORDER", [C("OrderID", { pk: 1 }), C("Date"), C("CustID"), C("CustEmail", { bad: 1 })], ORDERS.map((r) => [...r, r[2] === "C7" ? "ana@mail.com" : "bo@mail.com"]), { hl: ["ana@mail.com"] }) + PRODUCT + LINE,
        caption: `<strong>2NF ✓</strong> Partial dependency-г тусдаа хүснэгтүүдэд зөөлөө. ORDER_LINE-д зөвхөн бүхэл түлхүүрээс хамаардаг Qty үлдсэн. Гэвч ORDER-д дахиад нэг асуудал бий: <b>OrderID → CustID → CustEmail</b>. CustEmail нь түлхүүр бус өөр талбараас (CustID) хамаарч байна. Үүнийг <b>transitive dependency</b> гэдэг. <span class="hl-t">ana@mail.com</span> хоёр удаа давтагдсан тул имэйлээ солиход <b>update anomaly</b> үүснэ.`,
      },
      {
        label: "3NF",
        html: tbl("CUSTOMER", [C("CustID", { pk: 1, good: 1 }), C("Email", { good: 1 })], [["C7", "ana@mail.com"], ["C9", "bo@mail.com"]], { cls: "new" }) +
          tbl("ORDER", [C("OrderID", { pk: 1 }), C("Date"), C("CustID", { fk: 1 })], ORDERS) + PRODUCT + LINE,
        caption: `<strong>3NF ✓</strong> Түлхүүр бус талбар бүр зөвхөн өөрийн хүснэгтийн PK-аас хамаардаг боллоо. Мэдээлэл бүр <b>нэг л газар</b> хадгалагдана (redundancy байхгүй). Цээжлэх хэллэг: <i>"The key (1NF), the whole key (2NF), and nothing but the key (3NF)."</i>`,
      },
    ];
    const top = `<div class="nf-track">${steps.map((s, k) => `<span data-k="${k}">${s.label}</span>`).join("<i>→</i>")}</div>`;
    stepper(root, steps.length, (i) => ({
      html: `<div class="nt-wrap">${steps[i].html}</div>`,
      caption: steps[i].caption,
      after() { root.querySelectorAll(".nf-track span").forEach((s) => s.classList.toggle("on", Number(s.dataset.k) <= i)); },
    }), top);
  }

  // ─────────────────────── STRUCTURE CHART ───────────────────────
  function structureChart(root) {
    const desc = {
      main: "<b>main</b> — програмын эхлэл. Өдөр бүрийн давталтыг удирдаж, доорх модулиудыг дуудна. Модуль бүрт өгөгдөл дамжуулж, буцаж ирэх утгыг хүлээн авна.",
      display_stats: "<b>display_stats</b> — stats жагсаалтыг (data couple ↓) хүлээн авч дэлгэцэнд хэвлэнэ. Юу ч буцаадаггүй тул дээш сум байхгүй.",
      simulate_day: "<b>simulate_day</b> — stats ба action-ийг (↓) хүлээн авч өдрийн өөрчлөлтийг хийгээд шинэчилсэн stats-ийг (↑) буцаана. Хоёулаа data couple (хоосон дугуй).",
      can_evolve: "<b>can_evolve</b> — stage, age, skill, stats-ийг (↓) аваад True/False (↑) буцаана. Энэ утга програмын урсгалыг шийддэг тул <b>control flag</b> (дүүрэн дугуй).",
      calc_wellbeing: "<b>calculate_wellbeing</b> — stats-аас (↓) wellbeing оноог тооцож (↑) буцаана. main энэ оноогоор loop-ийг үргэлжлүүлэх эсэхийг шийднэ (while wellbeing > 5).",
    };
    const mods = [
      { id: "display_stats", cx: 85, down: ["stats"] },
      { id: "simulate_day", cx: 275, down: ["stats,", "action"], up: ["stats"] },
      { id: "can_evolve", cx: 465, down: ["stage, age,", "skill, stats"], up: ["evolve?"], flag: true },
      { id: "calc_wellbeing", cx: 655, down: ["stats"], up: ["score"], label: "calculate_wellbeing" },
    ];
    const couple = (x, dir, filled) => {
      const y0 = 140, y1 = 176;
      const tail = dir === "down" ? y0 : y1, head = dir === "down" ? y1 : y0, s = dir === "down" ? -1 : 1;
      return `<circle class="${filled ? "flag" : "dc"}" cx="${x}" cy="${tail}" r="4.5"/>
        <line class="cp" x1="${x}" y1="${tail + (dir === "down" ? 4.5 : -4.5)}" x2="${x}" y2="${head}"/>
        <path class="cp-h" d="M${x - 4.5} ${head + 7 * s} L${x} ${head} L${x + 4.5} ${head + 7 * s} Z"/>`;
    };
    const label = (x, lines, anchor) => `<text class="cp-l" x="${x}" y="${lines.length > 1 ? 152 : 161}" text-anchor="${anchor}">${lines.map((l, k) => `<tspan x="${x}" dy="${k ? 13 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
    let svg = `<svg class="viz-svg sc" viewBox="0 0 760 300" role="img" aria-label="Creature Keeper structure chart">
      <path class="sc-line" d="M380 60 V110 M85 110 H655 ${mods.map((m) => `M${m.cx} 110 V210`).join(" ")}"/>
      <g class="mod" data-m="main" tabindex="0"><rect x="300" y="20" width="160" height="40" rx="6"/><text x="380" y="45" text-anchor="middle">main</text></g>
      <path class="loop" d="M215 126 Q380 84 545 126"/><path class="loop-h" d="M536 118 L546 127 L533 130 Z"/>
      <text class="cp-l" x="470" y="44">↻ while wellbeing &gt; 5</text>`;
    mods.forEach((m) => {
      svg += couple(m.cx - 16, "down", false) + label(m.cx - 26, m.down, "end");
      if (m.up) svg += couple(m.cx + 16, "up", m.flag) + label(m.cx + 26, m.up, "start");
      svg += `<g class="mod" data-m="${m.id}" tabindex="0"><rect x="${m.cx - 78}" y="210" width="156" height="40" rx="6"/><text x="${m.cx}" y="235" text-anchor="middle">${esc(m.label || m.id)}</text></g>`;
    });
    svg += `<g class="legend">
        <circle class="dc" cx="20" cy="282" r="4.5"/><text x="32" y="286">data couple: параметр / буцах утга</text>
        <circle class="flag" cx="290" cy="282" r="4.5"/><text x="302" y="286">control flag: True / False</text>
        <path class="loop" d="M500 288 Q520 272 540 288"/><text x="550" y="286">loop (давталт)</text>
      </g></svg>`;
    root.innerHTML = `<div class="viz-stage">${svg}</div><div class="viz-caption">Модуль дээр дарж юу хийдэг, юу хүлээн авч юу буцаадгийг хараарай. ↓ доош сум нь дуудагдах модуль руу орох өгөгдөл, ↑ дээш сум нь буцаж ирэх утга.</div>`;
    const cap = root.querySelector(".viz-caption");
    root.querySelectorAll(".mod").forEach((g) => {
      const show = () => {
        root.querySelectorAll(".mod").forEach((x) => x.classList.remove("on"));
        g.classList.add("on");
        cap.innerHTML = desc[g.dataset.m];
      };
      g.addEventListener("click", show);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
    });
  }

  // ─────────────────────── TRACE TABLE ───────────────────────
  function traceTable(root) {
    const progs = {
      ok: {
        code: ["total = 0", "for i in range(1, 4):", "    total = total + i * 2", "print(total)"],
        ev: [
          { l: 1, total: 0, n: "<b>total</b>-д 0 оноож эхлүүлнэ (initialise). Loop-оос ӨМНӨ байгааг анхаар." },
          { l: 2, i: 1, n: "Loop эхэлнэ: i = 1." },
          { l: 3, total: 2, n: "total = 0 + 1×2 = <b>2</b>" },
          { l: 2, i: 2, n: "Дараагийн давталт: i = 2." },
          { l: 3, total: 6, n: "total = 2 + 2×2 = <b>6</b>" },
          { l: 2, i: 3, n: "i = 3." },
          { l: 3, total: 12, n: "total = 6 + 3×2 = <b>12</b>" },
          { l: 2, n: "range(1, 4) нь 1, 2, 3 л өгдөг (4 орохгүй) тул loop зогсоно." },
          { l: 4, out: "12", good: true, n: "<b>12</b> хэвлэнэ. Хүлээгдэж буй үр дүнтэй таарлаа ✓" },
        ],
      },
      bug: {
        code: ["for i in range(1, 4):", "    total = 0", "    total = total + i * 2", "print(total)"],
        ev: [
          { l: 1, i: 1, n: "Loop эхэлнэ: i = 1." },
          { l: 2, total: 0, n: "total = 0" },
          { l: 3, total: 2, n: "total = 0 + 1×2 = 2" },
          { l: 1, i: 2, n: "i = 2." },
          { l: 2, total: 0, bad: true, n: "⚠ total дахин <b>0</b> боллоо! Өмнөх нийлбэр устлаа." },
          { l: 3, total: 4, n: "total = 0 + 2×2 = 4 (6 байх ёстой)" },
          { l: 1, i: 3, n: "i = 3." },
          { l: 2, total: 0, bad: true, n: "⚠ Дахиад 0." },
          { l: 3, total: 6, n: "total = 0 + 3×2 = 6" },
          { l: 1, n: "Loop зогсоно." },
          { l: 4, out: "6", bad: true, n: "<b>6</b> хэвлэлээ, хүлээгдэж буй нь <b>12</b>. Trace table алдааг <b>2-р мөрөнд</b> олж харууллаа: total = 0 loop ДОТОР байна → <b>logic error</b>. Засвар: үүнийг loop-ийн өмнө гарга." },
        ],
      },
    };
    let mode = "ok";
    const top = `<div class="chips" role="group" aria-label="Код сонгох">
        <button class="chip on" data-mode="ok">Зөв код</button>
        <button class="chip" data-mode="bug">Алдаатай код</button>
      </div>`;
    const st = stepper(root, () => progs[mode].ev.length, (i) => {
      const p = progs[mode], e = p.ev[i];
      const code = p.code.map((c, k) => `<div class="cl${k + 1 === e.l ? " cur" : ""}"><span class="ln">${k + 1}</span>${esc(c)}</div>`).join("");
      const rows = p.ev.slice(0, i + 1).map((x, k) => {
        const cell = (v, key) => `<td class="${k === i && v !== undefined ? "chg" : ""}${x.bad && key === "total" && v === 0 ? " bad" : ""}${x.bad && key === "out" ? " bad" : ""}${x.good && key === "out" ? " good" : ""}">${v === undefined ? "" : esc(v)}</td>`;
        return `<tr class="${k === i ? "now" : ""}"><td>${k + 1}</td><td>${x.l}</td>${cell(x.i, "i")}${cell(x.total, "total")}${cell(x.out, "out")}</tr>`;
      }).join("");
      return {
        html: `<div class="trace">
            <div class="code-box">${code}</div>
            <div class="tt-wrap"><table class="tt"><thead><tr><th>Алхам</th><th>Мөр</th><th>i</th><th>total</th><th>Output</th></tr></thead><tbody>${rows}</tbody></table></div>
          </div>`,
        caption: e.n,
      };
    }, top);
    root.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      root.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
      st.reset();
    }));
  }

  // ─────────────────────── TCP/IP ───────────────────────
  function tcpip(root) {
    const L = [
      { n: "Application", p: "HTTPS", c: "l1" },
      { n: "Transport", p: "TCP", c: "l2" },
      { n: "Internet", p: "IP", c: "l3" },
      { n: "Network Access", p: "Ethernet / Wi-Fi", c: "l4" },
    ];
    const CH = {
      eth: ["l4", "Frame · MAC"], ip: ["l3", "IP · 192.168.1.5 → 13.54.20.8"], tcp: ["l2", "TCP · port 443 · seq 1"],
      app: ["l1", "HTTPS"], data: ["data", "save data"], fcs: ["l4", "FCS"],
    };
    const S = [
      { s: "s", l: 1, c: ["app", "data"], unit: "data", n: "<b>Application:</b> тоглоом хадгалсан өгөгдлөө <b>HTTPS</b> протоколоор cloud сервер рүү илгээхээр бэлдэнэ." },
      { s: "s", l: 2, c: ["tcp", "app", "data"], unit: "segment", n: "<b>Transport:</b> TCP өгөгдлийг <b>segment</b>-үүдэд хувааж, <b>port</b> дугаар (443) ба <b>sequence number</b> бүхий header нэмнэ. Хүлээн авагч дарааллыг сэргээж, алдагдсаныг дахин хүсэхэд үүнийг ашиглана." },
      { s: "s", l: 3, c: ["ip", "tcp", "app", "data"], unit: "packet", n: "<b>Internet:</b> эх ба очих <b>IP хаяг</b> бүхий header нэмж <b>packet</b> болгоно. Router-ууд энэ хаягаар замыг сонгоно." },
      { s: "s", l: 4, c: ["eth", "ip", "tcp", "app", "data", "fcs"], unit: "frame", n: "<b>Network Access:</b> <b>MAC</b> хаягтай frame header болон алдаа шалгах <b>FCS</b> нэмж <b>frame</b> болгоод бит хэлбэрээр дамжуулна. Ингэж давхарга бүр header нэмэхийг <b>encapsulation</b> гэдэг." },
      { s: "w", l: 0, c: ["eth", "ip", "tcp", "app", "data", "fcs"], unit: "bits", n: "Өгөгдөл кабель эсвэл Wi-Fi-аар <b>бит</b> хэлбэрээр дамжина. Router бүр IP хаягийг хараад дараагийн замыг сонгоно." },
      { s: "r", l: 4, c: ["ip", "tcp", "app", "data"], unit: "packet", n: "<b>Хүлээн авагчийн Network Access:</b> FCS-ээр алдаа шалгаж, frame header-ийг авч хаяна." },
      { s: "r", l: 3, c: ["tcp", "app", "data"], unit: "segment", n: "<b>Internet:</b> IP хаяг өөрт нь хандсан эсэхийг шалгаад IP header-ийг авна." },
      { s: "r", l: 2, c: ["app", "data"], unit: "data", n: "<b>Transport:</b> segment-үүдийг sequence number-аар эрэмбэлж, <b>ACK</b> (хүлээн авснаа баталгаажуулах) илгээнэ. Алдагдсан segment байвал дахин илгээхийг хүснэ (<b>retransmission</b>). Port 443-аар зөв програм руу хүргэнэ." },
      { s: "r", l: 1, c: ["data"], unit: "data", n: "<b>Application:</b> сервер хадгалах өгөгдлийг бүрэн, гэмтэлгүй хүлээн авлаа ✓. Дээш гарах тусам header хасагдах процессыг <b>decapsulation</b> гэдэг." },
    ];
    const stack = (side, st) => `<div class="stack"><div class="stack-t">${side === "s" ? "Илгээгч · тоглоом" : "Хүлээн авагч · cloud сервер"}</div>
      ${L.map((x, k) => `<div class="layer ${x.c}${st.s === side && st.l === k + 1 ? " on" : ""}"><b>${x.n}</b><small>${x.p}</small></div>`).join("")}</div>`;
    stepper(root, S.length, (i) => {
      const st = S[i];
      return {
        html: `<div class="tcp">
            ${stack("s", st)}
            <div class="wire${st.s === "w" ? " on" : ""}"><span>${st.s === "w" ? "0110<br>1011<br>→" : st.s === "s" ? "↓" : "↑"}</span></div>
            ${stack("r", st)}
          </div>
          <div class="pkt"><span class="unit">${st.unit}</span>${st.c.map((k) => `<span class="chip-p ${CH[k][0]}">${esc(CH[k][1])}</span>`).join("")}</div>`,
        caption: st.n,
      };
    });
  }

  return {
    erd,
    normalisation,
    "structure-chart": structureChart,
    "desk-check": traceTable,
    tcpip,
  };
})();
