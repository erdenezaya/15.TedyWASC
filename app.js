(function () {
  "use strict";

  const app = document.getElementById("app");

  // ── storage (per-viewer convenience only) ──
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("csprep:" + key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("csprep:" + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const topicById = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ── learned / self-marking state ──
  const learned = new Set(store.get("learned", []));
  const saveLearned = () => store.set("learned", [...learned]);
  const results = store.get("results", {}); // topicId -> {got, total}
  const saveResults = () => store.set("results", results);

  // ── question pool (sample-exam style + variants) ──
  const POOL = [];
  TOPICS.forEach((t) => {
    (t.practice || []).forEach((q, i) => POOL.push({ ...q, topic: t.id, kind: "core", key: t.id + ":p" + i }));
    ((typeof VARIANTS !== "undefined" && VARIANTS[t.id]) || []).forEach((q, i) => POOL.push({ ...q, topic: t.id, kind: "variant", key: t.id + ":v" + i }));
  });

  // ── renderers ──
  function questionCard(q, opts = {}) {
    const el = document.createElement("div");
    el.className = "card q";
    const t = topicById[q.topic];
    el.innerHTML = `
      <div class="q-head">
        ${q.verb ? `<span class="pill verb">${esc(q.verb)}</span>` : ""}
        <span class="pill marks">${q.marks} оноо</span>
        ${q.kind === "variant" ? `<span class="pill">Өөр хэлбэр</span>` : ""}
        ${opts.showTopic && t ? `<a class="pill" href="#/t/${t.id}">${esc(t.title)}</a>` : ""}
      </div>
      <div class="q-text">${esc(q.q)}</div>
      <textarea class="attempt${q.code ? " code" : ""}" placeholder="Эхлээд өөрөө англиар бичиж үзээрэй…" aria-label="Таны хариулт"></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" data-act="reveal">Загвар хариулт харах</button>
      </div>
      <div class="answer" hidden>
        ${q.code ? `<pre><code>${esc(q.code)}</code></pre>` : ""}
        <ol>${q.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
        ${q.alt ? `<div class="alt"><strong>Өөр хүлээн зөвшөөрөгдөх хариулт:</strong><br>${q.alt.map(esc).join("<br>")}</div>` : ""}
        ${opts.selfMark ? `
          <div class="row" style="margin-top:14px">
            <span class="muted" style="font-size:.88rem">Өөрийгөө дүгнэ: хэдэн оноо авах байсан бэ?</span>
          </div>
          <div class="row" style="margin-top:6px">
            ${Array.from({ length: q.marks + 1 }, (_, i) => `<button class="btn" data-mark="${i}">${i}/${q.marks}</button>`).join("")}
          </div>` : ""}
      </div>`;
    const ans = el.querySelector(".answer");
    el.querySelector('[data-act="reveal"]').addEventListener("click", (e) => {
      ans.hidden = !ans.hidden;
      e.target.textContent = ans.hidden ? "Загвар хариулт харах" : "Хариултыг нуух";
    });
    el.querySelectorAll("[data-mark]").forEach((b) => b.addEventListener("click", () => {
      const got = Number(b.dataset.mark);
      const r = results[q.topic] || { got: 0, total: 0 };
      r.got += got; r.total += q.marks; results[q.topic] = r; saveResults();
      if (opts.onMarked) opts.onMarked(got);
    }));
    return el;
  }

  function setActiveNav(name) {
    document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === name));
  }

  // ── views ──
  let topicFilter = store.get("filter", "all");

  function viewTopics() {
    setActiveNav("topics");
    const done = TOPICS.filter((t) => learned.has(t.id)).length;
    app.innerHTML = `
      <h1>Computer Science шалгалтын бэлтгэл</h1>
      <p class="lead">Сэдэв бүрт монгол тайлбар, marker-ийн хайдаг англи keyword, онооны дагуу загвар хариулт, мөн жишээ шалгалтаас өөр хэлбэрээр асуух боломжтой асуултууд бий.</p>
      <div class="progress">
        <div class="bar"><span style="width:${(done / TOPICS.length) * 100}%"></span></div>
        <span class="muted">${done} / ${TOPICS.length} сэдэв сурсан</span>
      </div>
      <div class="chips" role="group" aria-label="Ангилал"></div>
      <div class="grid"></div>`;
    const chips = app.querySelector(".chips");
    [{ id: "all", mn: "Бүгд" }, ...CATEGORIES].forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip" + (topicFilter === c.id ? " on" : "");
      b.textContent = c.mn;
      b.addEventListener("click", () => { topicFilter = c.id; store.set("filter", c.id); viewTopics(); });
      chips.appendChild(b);
    });
    const grid = app.querySelector(".grid");
    TOPICS.filter((t) => topicFilter === "all" || t.cat === topicFilter).forEach((t) => {
      const n = POOL.filter((q) => q.topic === t.id).length;
      const a = document.createElement("a");
      a.className = "tcard";
      a.href = "#/t/" + t.id;
      a.innerHTML = `
        <span class="pill">${esc(catById[t.cat].mn)}</span>
        <h3>${esc(t.title)}</h3>
        <div class="mn">${esc(t.titleMn)}</div>
        <div class="meta">
          <span class="pill">${n} асуулт</span>
          ${learned.has(t.id) ? `<span class="pill done">✓ Сурсан</span>` : ""}
        </div>`;
      grid.appendChild(a);
    });
  }

  function viewTopic(id) {
    const t = topicById[id];
    if (!t) return viewTopics();
    setActiveNav("topics");
    const variants = (typeof VARIANTS !== "undefined" && VARIANTS[id]) || [];
    app.innerHTML = `
      <div class="crumb"><a class="btn ghost" href="#/">← Бүх сэдэв</a></div>
      <span class="pill">${esc(catById[t.cat].mn)}</span>
      <h1 style="margin-top:8px">${esc(t.title)}</h1>
      <p class="muted">${esc(t.titleMn)}</p>

      <div class="section-label">1 · Монгол тайлбар</div>
      <div class="explain">${t.explain.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      ${t.analogy ? `<div class="analogy"><strong>Зүйрлэл</strong>${esc(t.analogy)}</div>` : ""}

      <div class="section-label">2 · Key terms: marker-ийн хайдаг үгс</div>
      <table class="kw"><thead><tr><th>English keyword</th><th>Монгол утга</th></tr></thead>
        <tbody>${t.keywords.map(([en, mn]) => `<tr><td>${esc(en)}</td><td>${esc(mn)}</td></tr>`).join("")}</tbody></table>

      <div class="section-label">3 · Шалгалтын хэв маягийн асуулт</div>
      <div id="core"></div>

      ${variants.length ? `
        <div class="section-label">4 · Өөр хэлбэрээр асуувал</div>
        <p class="variant-note">Бодит шалгалтад ижил ойлголтыг өөр хувилбар, өөр command word-оор асууж болно.</p>
        <div id="variants"></div>` : ""}

      ${t.mistakes && t.mistakes.length ? `
        <div class="section-label">${variants.length ? 5 : 4} · Түгээмэл алдаа</div>
        <ul class="mistakes">${t.mistakes.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}

      <div class="row" style="margin-top:28px">
        <button class="btn ${learned.has(id) ? "" : "primary"}" id="learnBtn">${learned.has(id) ? "✓ Сурсан гэж тэмдэглэсэн" : "Сурсан гэж тэмдэглэх"}</button>
        <a class="btn" href="#/drill?t=${id}">Энэ сэдвээр санамсаргүй дадлага</a>
      </div>`;
    const core = app.querySelector("#core");
    POOL.filter((q) => q.topic === id && q.kind === "core").forEach((q) => core.appendChild(questionCard(q)));
    const vbox = app.querySelector("#variants");
    if (vbox) POOL.filter((q) => q.topic === id && q.kind === "variant").forEach((q) => vbox.appendChild(questionCard(q)));
    app.querySelector("#learnBtn").addEventListener("click", () => {
      learned.has(id) ? learned.delete(id) : learned.add(id);
      saveLearned(); viewTopic(id);
    });
    window.scrollTo(0, 0);
  }

  function viewDrill(params) {
    setActiveNav("drill");
    const onlyTopic = params.get("t");
    let cat = onlyTopic ? "all" : store.get("drillCat", "all");
    let current = null;
    let lastKey = null;

    function pick() {
      let pool = POOL.filter((q) => (onlyTopic ? q.topic === onlyTopic : cat === "all" || topicById[q.topic].cat === cat));
      if (pool.length > 1) pool = pool.filter((q) => q.key !== lastKey);
      current = pool[Math.floor(Math.random() * pool.length)];
      lastKey = current && current.key;
    }

    function weakList() {
      const rows = Object.entries(results)
        .filter(([, r]) => r.total > 0)
        .map(([id, r]) => ({ id, pct: Math.round((r.got / r.total) * 100), r }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 5);
      if (!rows.length) return `<p class="muted">Асуулт бүрийн дараа өөрийгөө дүгнэвэл сул сэдвүүд энд гарна.</p>`;
      return `<table class="kw"><thead><tr><th>Сэдэв</th><th>Авсан оноо</th></tr></thead><tbody>${rows.map((x) =>
        `<tr><td><a href="#/t/${x.id}">${esc(topicById[x.id] ? topicById[x.id].title : x.id)}</a></td><td>${x.pct}% (${x.r.got}/${x.r.total})</td></tr>`).join("")}</tbody></table>`;
    }

    function render() {
      pick();
      app.innerHTML = `
        <h1>Санамсаргүй дадлага</h1>
        <p class="lead">${onlyTopic ? `Сэдэв: <strong>${esc(topicById[onlyTopic].title)}</strong>. ` : ""}Нийт ${POOL.length} асуултаас санамсаргүй сонгоно. Жишээ шалгалтынх болон өөр хэлбэрийн асуултууд холилдсон. Эхлээд хариултаа бичиж, дараа нь загвартай харьцуулж өөрийгөө дүгнэ.</p>
        ${onlyTopic ? `<p><a class="btn ghost" href="#/drill">← Бүх сэдвээр</a></p>` : `<div class="chips" role="group" aria-label="Ангилал"></div>`}
        <div id="qbox"></div>
        <div class="row" style="margin:6px 0 30px"><button class="btn" id="next">Дараагийн асуулт →</button></div>
        <div class="section-label">Сул сэдвүүд (таны дүгнэлтээр)</div>
        ${weakList()}`;
      const chips = app.querySelector(".chips");
      if (chips) [{ id: "all", mn: "Бүгд" }, ...CATEGORIES].forEach((c) => {
        const b = document.createElement("button");
        b.className = "chip" + (cat === c.id ? " on" : "");
        b.textContent = c.mn;
        b.addEventListener("click", () => { cat = c.id; store.set("drillCat", c.id); render(); });
        chips.appendChild(b);
      });
      app.querySelector("#qbox").appendChild(questionCard(current, { showTopic: true, selfMark: true, onMarked: render }));
      app.querySelector("#next").addEventListener("click", render);
    }
    render();
  }

  function viewCodeList() {
    setActiveNav("code");
    app.innerHTML = `
      <h1>Код дадлага</h1>
      <p class="lead">Section Two-ийн ихэнх оноо кодоос ирдэг. Эхлээд өөрөө бич, гацвал hint ав, хамгийн сүүлд шийдлийг онооны шалгууртай нь харьцуул.</p>
      <div class="grid"></div>`;
    const grid = app.querySelector(".grid");
    CODE_TASKS.forEach((c) => {
      const a = document.createElement("a");
      a.className = "tcard";
      a.href = "#/code/" + c.id;
      a.innerHTML = `<span class="pill marks">${c.marks} оноо</span><h3>${esc(c.title)}</h3><div class="mn">${esc(c.task.split("\n")[0].slice(0, 110))}${c.task.length > 110 ? "…" : ""}</div>`;
      grid.appendChild(a);
    });
  }

  function viewCode(id) {
    const c = CODE_TASKS.find((x) => x.id === id);
    if (!c) return viewCodeList();
    setActiveNav("code");
    let hintIdx = 0;
    app.innerHTML = `
      <div class="crumb"><a class="btn ghost" href="#/code">← Бүх даалгавар</a></div>
      <span class="pill marks">${c.marks} оноо</span>
      <h1 style="margin-top:8px">${esc(c.title)}</h1>
      <div class="card">
        ${c.task.split("\n").map((p) => `<p>${esc(p)}</p>`).join("")}
        <textarea class="attempt code" placeholder="# Кодоо энд бич…" aria-label="Таны код"></textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn" id="hintBtn">Hint (${c.hints.length})</button>
          <button class="btn primary" id="solBtn">Шийдэл ба онооны шалгуур</button>
        </div>
        <div id="hints"></div>
        <div class="answer" id="sol" hidden>
          <pre><code>${esc(c.solution)}</code></pre>
          <h3>Онооны шалгуур</h3>
          <ol>${c.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
        </div>
      </div>`;
    const hb = app.querySelector("#hintBtn");
    hb.addEventListener("click", () => {
      if (hintIdx >= c.hints.length) return;
      const d = document.createElement("div");
      d.className = "hint";
      d.textContent = `💡 ${hintIdx + 1}. ${c.hints[hintIdx]}`;
      app.querySelector("#hints").appendChild(d);
      hintIdx++;
      hb.textContent = hintIdx >= c.hints.length ? "Hint дууссан" : `Дараагийн hint (${c.hints.length - hintIdx})`;
      hb.disabled = hintIdx >= c.hints.length;
    });
    app.querySelector("#solBtn").addEventListener("click", (e) => {
      const s = app.querySelector("#sol");
      s.hidden = !s.hidden;
      e.target.textContent = s.hidden ? "Шийдэл ба онооны шалгуур" : "Шийдлийг нуух";
    });
    window.scrollTo(0, 0);
  }

  function viewQuiz() {
    setActiveNav("quiz");
    const qs = shuffle(QUIZ).slice(0, 10);
    let i = 0, score = 0;
    function render() {
      if (i >= qs.length) {
        const best = Math.max(store.get("quizBest", 0), score);
        store.set("quizBest", best);
        app.innerHTML = `
          <h1>Quiz дууслаа</h1>
          <div class="card" style="text-align:center">
            <div class="score">${score} / ${qs.length}</div>
            <p class="muted">Хамгийн өндөр оноо: ${best} / 10</p>
            <button class="btn primary" id="again">Дахин эхлэх (шинэ асуултууд)</button>
          </div>`;
        app.querySelector("#again").addEventListener("click", viewQuiz);
        return;
      }
      const q = qs[i];
      app.innerHTML = `
        <h1>Quiz</h1>
        <p class="muted">Асуулт ${i + 1} / ${qs.length} · Оноо: ${score}</p>
        <div class="card">
          <div class="q-text">${esc(q.q)}</div>
          <div class="opts">${q.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}</div>
          <div id="fb"></div>
        </div>`;
      app.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
        const k = Number(b.dataset.k);
        const ok = k === q.a;
        if (ok) score++;
        app.querySelectorAll(".opt").forEach((x, xi) => {
          x.disabled = true;
          if (xi === q.a) x.classList.add("right");
          else if (xi === k) x.classList.add("wrong");
        });
        app.querySelector("#fb").innerHTML = `
          <div class="feedback ${ok ? "ok" : "no"}"><strong>${ok ? "Зөв!" : "Буруу."}</strong> ${esc(q.why)}</div>
          <button class="btn primary" id="nx">${i + 1 < qs.length ? "Дараагийн →" : "Дүнгээ харах"}</button>`;
        app.querySelector("#nx").addEventListener("click", () => { i++; render(); });
      }));
    }
    render();
  }

  function viewCards() {
    setActiveNav("cards");
    let cat = store.get("cardCat", "all");
    let deck = [], idx = 0, flipped = false;
    function build() {
      deck = shuffle(TOPICS.filter((t) => cat === "all" || t.cat === cat)
        .flatMap((t) => t.keywords.map(([en, mn]) => ({ en, mn, topic: t.title }))));
      idx = 0; flipped = false;
    }
    function render() {
      const c = deck[idx];
      app.innerHTML = `
        <h1>Flashcards</h1>
        <p class="lead">Нүүр талд англи keyword. Карт дээр дарж монгол утгыг нь хар. Шалгалтад англи нэр томьёог зөв ашиглах нь оноо авах түлхүүр.</p>
        <div class="chips" role="group" aria-label="Ангилал"></div>
        <div class="flash-wrap">
          <div class="flash${flipped ? " flipped" : ""}" tabindex="0" role="button" aria-label="Картыг эргүүлэх">
            <div class="side">${flipped ? "Монгол утга" : "English keyword"}</div>
            <div class="${flipped ? "back" : "front"}">${esc(flipped ? c.mn : c.en)}</div>
            ${flipped ? `<div class="topic">${esc(c.en)} · ${esc(c.topic)}</div>` : ""}
          </div>
          <div class="row">
            <button class="btn" id="prev">←</button>
            <span class="muted">${idx + 1} / ${deck.length}</span>
            <button class="btn" id="next">→</button>
            <button class="btn" id="shuf">Холих</button>
          </div>
        </div>`;
      const chips = app.querySelector(".chips");
      [{ id: "all", mn: "Бүгд" }, ...CATEGORIES].forEach((cc) => {
        const b = document.createElement("button");
        b.className = "chip" + (cat === cc.id ? " on" : "");
        b.textContent = cc.mn;
        b.addEventListener("click", () => { cat = cc.id; store.set("cardCat", cc.id); build(); render(); });
        chips.appendChild(b);
      });
      const card = app.querySelector(".flash");
      const flip = () => { flipped = !flipped; render(); };
      card.addEventListener("click", flip);
      card.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
      app.querySelector("#prev").addEventListener("click", () => { idx = (idx - 1 + deck.length) % deck.length; flipped = false; render(); });
      app.querySelector("#next").addEventListener("click", () => { idx = (idx + 1) % deck.length; flipped = false; render(); });
      app.querySelector("#shuf").addEventListener("click", () => { build(); render(); });
    }
    build(); render();
  }

  function viewWords() {
    setActiveNav("words");
    app.innerHTML = `
      <h1>Command words</h1>
      <p class="lead">Асуултын эхний үйл үг ямар төрлийн, хэр урт хариулт хүлээж байгааг заадаг. Ерөнхий дүрэм: 1 оноо ≈ 1 тодорхой цэг.</p>
      <div class="words">${COMMAND_WORDS.map(([w, d, ex]) => `
        <div class="card word">
          <h3>${esc(w)}</h3>
          <div>${esc(d)}<div class="ex">Жишээ: ${esc(ex)}</div></div>
        </div>`).join("")}
      </div>
      <div class="section-label">Explain асуултад хэрэглэх холбоос үгс</div>
      <div class="card">because… · which means… · this results in… · therefore… · as a result… · so that… · whereas… (compare) · for example, in the scenario…</div>`;
  }

  // ── router ──
  function route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, query] = hash.split("?");
    const params = new URLSearchParams(query || "");
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "t" && parts[1]) viewTopic(parts[1]);
    else if (parts[0] === "drill") viewDrill(params);
    else if (parts[0] === "code" && parts[1]) viewCode(parts[1]);
    else if (parts[0] === "code") viewCodeList();
    else if (parts[0] === "quiz") viewQuiz();
    else if (parts[0] === "cards") viewCards();
    else if (parts[0] === "words") viewWords();
    else viewTopics();
  }
  window.addEventListener("hashchange", route);
  route();
})();
