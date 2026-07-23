(function () {
  const $ = (id) => document.getElementById(id);

  const msgEl = $("msg");
  const digestOut = $("digest-out");
  const padGrid = $("pad-grid");
  const scrub = $("scrub");
  const speedEl = $("speed");
  const consoleStep = $("console-step");
  const roundFlagVal = $("round-flag-val");
  const roundMap = $("round-map");
  const opTerms = $("op-terms");
  const liveDot = $("live-dot");
  const engineStatus = $("engine-status");

  const regEls = { A: $("reg-A"), B: $("reg-B"), C: $("reg-C"), D: $("reg-D") };
  const regBox = {};
  document.querySelectorAll(".reg").forEach((el) => (regBox[el.dataset.reg] = el));

  const roundCells = [...roundMap.querySelectorAll(".round-cell")];

  let result = null;   // current MD5 result + trace
  let idx = 0;         // current step index into trace
  let playing = false;
  let timer = null;

  const hx = (n) => (n >>> 0).toString(16).padStart(8, "0");

  function recompute() {
    const text = msgEl.value;
    result = MD5.digest(text);

    // meta
    $("byte-count").textContent = result.bytes.length + " bytes";
    $("bit-count").textContent = result.origBits + " bits";
    $("block-count").textContent = result.blocks + (result.blocks === 1 ? " block" : " blocks");

    digestOut.textContent = result.hex;
    renderPadding();

    // scrub range spans full trace (across all blocks)
    scrub.max = result.trace.length - 1;
    idx = 0;
    scrub.value = 0;
    render();
  }

  function renderPadding() {
    padGrid.innerHTML = "";
    const p = result.padded;
    const msgLen = result.bytes.length;
    // length tail is the final 8 bytes
    const lenStart = p.length - 8;
    p.forEach((b, i) => {
      const cell = document.createElement("div");
      cell.className = "byte";
      let cls = "zero";
      if (i < msgLen) cls = "msg";
      else if (i === msgLen) cls = "one";
      else if (i >= lenStart) cls = "len";
      cell.classList.add(cls);
      cell.textContent = b.toString(16).padStart(2, "0");
      padGrid.appendChild(cell);
    });
  }

  function fnFor(round) {
    return ["F", "G", "H", "I"][round] || "seed";
  }
  function fnBody(round) {
    return [
      "(B AND C) OR (NOT B AND D)",
      "(D AND B) OR (NOT D AND C)",
      "B XOR C XOR D",
      "C XOR (B OR NOT D)",
    ][round];
  }

  function render() {
    const t = result.trace[idx];
    const prev = idx > 0 ? result.trace[idx - 1] : null;

    // registers
    ["A", "B", "C", "D"].forEach((r) => {
      const nv = hx(t[r]);
      if (!prev || hx(prev[r]) !== nv) {
        regEls[r].classList.remove("changed");
        void regEls[r].offsetWidth; // reflow to restart animation
        regEls[r].classList.add("changed");
      }
      regEls[r].textContent = nv;
      regBox[r].classList.remove("live");
    });

    // highlight the freshly-written register (B on every real step)
    if (t.written) regBox[t.written].classList.add("live");

    // step counter (show local step within its block for clarity)
    if (t.round === -1) {
      consoleStep.textContent = "seed · step 0 / 64";
      roundFlagVal.textContent = "— seed —";
    } else {
      const blkTag = result.blocks > 1 ? `blk ${t.block + 1} · ` : "";
      consoleStep.textContent = `${blkTag}step ${t.localStep} / 64`;
      roundFlagVal.textContent = `Round ${t.round + 1} · ${t.fn}`;
    }

    // round map highlight
    roundCells.forEach((c, i) => c.classList.toggle("active", i === t.round));

    // formula + terms
    updateFormula(t);
    updateStatus(t);
  }

  function updateFormula(t) {
    if (t.round === -1) {
      $("fn-tag").textContent = "F(B,C,D)";
      $("mg-idx").textContent = "0";
      $("k-idx").textContent = "0";
      $("s-amt").textContent = "7";
      opTerms.innerHTML = term("state", "seeded from constants");
      return;
    }
    $("fn-tag").textContent = `${t.fn}(B,C,D)`;
    $("mg-idx").textContent = t.mg;
    $("k-idx").textContent = t.step - t.block * 64 - 1; // i within block
    $("s-amt").textContent = t.s;

    opTerms.innerHTML =
      term("function " + t.fn, fnBody(t.round)) +
      term("F(B,C,D)", hx(t.fval)) +
      term("M[" + t.mg + "]", hx(t.m)) +
      term("K constant", hx(t.k)) +
      term("rotate ⟲", t.s + " bits") +
      term("→ new B", hx(t.writtenVal));
  }

  function term(label, val) {
    return `<div class="term"><span class="term-label">${label}</span><span class="term-val">${val}</span></div>`;
  }

  function updateStatus(t) {
    if (idx === 0) { engineStatus.textContent = "idle · seeded"; liveDot.classList.remove("on"); }
    else if (idx === result.trace.length - 1) { engineStatus.textContent = "settled · digest ready"; liveDot.classList.add("on"); }
    else { engineStatus.textContent = "mixing…"; liveDot.classList.add("on"); }
  }

  function goTo(n) {
    idx = Math.max(0, Math.min(result.trace.length - 1, n));
    scrub.value = idx;
    render();
  }

  function play() {
    if (idx >= result.trace.length - 1) idx = 0;
    playing = true;
    $("btn-play").textContent = "⏸";
    $("btn-play").classList.add("playing");
    tick();
  }
  function pause() {
    playing = false;
    $("btn-play").textContent = "▶";
    $("btn-play").classList.remove("playing");
    clearTimeout(timer);
  }
  function tick() {
    if (!playing) return;
    if (idx >= result.trace.length - 1) { pause(); return; }
    goTo(idx + 1);
    const speed = +speedEl.value; // 1..20
    const delay = 520 - speed * 24; // faster as speed increases
    timer = setTimeout(tick, Math.max(30, delay));
  }

  // wiring
  msgEl.addEventListener("input", () => { pause(); recompute(); });
  scrub.addEventListener("input", () => { pause(); goTo(+scrub.value); });
  $("btn-next").addEventListener("click", () => { pause(); goTo(idx + 1); });
  $("btn-prev").addEventListener("click", () => { pause(); goTo(idx - 1); });
  $("btn-reset").addEventListener("click", () => { pause(); goTo(0); });
  $("btn-end").addEventListener("click", () => { pause(); goTo(result.trace.length - 1); });
  $("btn-play").addEventListener("click", () => (playing ? pause() : play()));

  $("btn-empty").addEventListener("click", () => { msgEl.value = ""; pause(); recompute(); });
  $("btn-abc").addEventListener("click", () => { msgEl.value = "abc"; pause(); recompute(); });
  $("btn-fox").addEventListener("click", () => {
    msgEl.value = "The quick brown fox jumps over the lazy dog";
    pause(); recompute();
  });

  $("btn-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(result.hex);
      const b = $("btn-copy"); const old = b.textContent;
      b.textContent = "copied"; setTimeout(() => (b.textContent = old), 1200);
    } catch (e) {}
  });

  // keyboard: arrows step, space plays
  document.addEventListener("keydown", (e) => {
    if (e.target === msgEl) return;
    if (e.key === "ArrowRight") { pause(); goTo(idx + 1); }
    else if (e.key === "ArrowLeft") { pause(); goTo(idx - 1); }
    else if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); }
  });

  recompute();
})();
