(() => {
  "use strict";
  const explorer = document.getElementById("time-explorer");
  const benchmark = window.SITUHOI?.benchmark;
  if (!explorer || !benchmark?.results?.length) return;

  const budget = Math.round(benchmark.maxSeconds * 100);
  const minimum = 5;
  const rows = benchmark.results.map(row => ({ ...row, history: Math.round(row.h * 100), future: Math.round(row.f * 100) }));
  let history = 25;
  let endpoint = budget;
  let announcementTimer;
  const axis = document.getElementById("duration-axis");
  const historyHandle = document.getElementById("history-handle");
  const goalHandle = document.getElementById("goal-handle");
  const historyInput = document.getElementById("history-duration");
  const forecastInput = document.getElementById("forecast-duration");
  const presets = document.getElementById("duration-presets");
  const marks = document.getElementById("reported-marks");
  const message = document.getElementById("result-message");
  const seconds = value => (value / 100).toFixed(2);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, Math.round(value)));

  const presetButtons = rows.map(row => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "duration-preset";
    button.dataset.history = row.history;
    button.dataset.forecast = row.future;
    if (row.heldOut) button.classList.add("held-out");
    button.textContent = `${seconds(row.history)} / ${seconds(row.future)}${row.heldOut ? " †" : ""}`;
    button.setAttribute("aria-label", `History ${row.h} seconds, forecast ${row.f} seconds${row.heldOut ? ", held-out timing" : ""}`);
    button.addEventListener("click", () => {
      history = row.history;
      endpoint = row.history + row.future;
      render();
    });
    presets.append(button);
    return button;
  });

  function render() {
    const future = endpoint - history;
    const row = rows.find(item => item.history === history && item.future === future);
    explorer.style.setProperty("--history", `${history / budget * 100}%`);
    explorer.style.setProperty("--endpoint", `${endpoint / budget * 100}%`);
    explorer.dataset.result = row ? "reported" : "unreported";
    historyInput.value = seconds(history);
    historyInput.max = seconds(endpoint - minimum);
    forecastInput.value = seconds(future);
    forecastInput.max = seconds(budget - history);
    historyHandle.setAttribute("aria-valuenow", seconds(history));
    historyHandle.setAttribute("aria-valuemax", seconds(endpoint - minimum));
    historyHandle.setAttribute("aria-valuetext", `${seconds(history)} seconds of history, ${seconds(future)} seconds of forecast`);
    goalHandle.setAttribute("aria-valuenow", seconds(endpoint));
    goalHandle.setAttribute("aria-valuemin", seconds(history + minimum));
    goalHandle.setAttribute("aria-valuetext", `Goal at ${seconds(endpoint)} seconds, forecast ${seconds(future)} seconds`);
    document.getElementById("active-span").textContent = `${seconds(endpoint)} / ${benchmark.maxSeconds} s`;
    document.getElementById("unused-time").textContent = endpoint === budget ? "Full time budget" : `${seconds(budget - endpoint)} s unused`;
    presetButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(rows[index] === row)));
    marks.replaceChildren();
    rows.filter(item => item.history + item.future === endpoint).forEach(item => {
      const dot = document.createElement("span");
      dot.className = "reported-mark";
      dot.style.left = `${item.history / budget * 100}%`;
      marks.append(dot);
    });
    document.getElementById("result-state").textContent = row ? (row.heldOut ? "Held-out timing" : "Reported setting") : "Not reported";
    document.getElementById("result-root").textContent = row ? row.root.toFixed(2) : "—";
    document.getElementById("result-object").textContent = row ? row.object.toFixed(2) : "—";
    document.getElementById("result-f1").textContent = row ? row.f1.toFixed(2) : "—";
    document.getElementById("result-object-sd").textContent = row ? `± ${row.objectSD.toFixed(2)} mm across seeds` : "No reported measurement";
    const detail = row
      ? `H = ${seconds(history)} s · F = ${seconds(future)} s${row.heldOut ? " · held-out timing" : ""} — root ${row.root.toFixed(2)} mm, object ${row.object.toFixed(2)} mm, F1 ${row.f1.toFixed(2)}%.`
      : `H = ${seconds(history)} s · F = ${seconds(future)} s — no reported result. Choose a paper setting to view measured scores.`;
    clearTimeout(announcementTimer);
    announcementTimer = setTimeout(() => { message.textContent = detail; }, 150);
  }

  function changeHandle(kind, position) {
    if (kind === "history") history = clamp(position, minimum, endpoint - minimum);
    else endpoint = clamp(position, history + minimum, budget);
    render();
  }

  function snapNearby(kind) {
    const candidates = rows.filter(row => kind === "history"
      ? row.history + row.future === endpoint
      : row.history === history);
    const position = kind === "history" ? history : endpoint;
    const coordinate = row => kind === "history" ? row.history : row.history + row.future;
    const closest = candidates.sort((a, b) => Math.abs(coordinate(a) - position) - Math.abs(coordinate(b) - position))[0];
    if (closest && Math.abs(coordinate(closest) - position) <= 6) {
      history = closest.history;
      endpoint = closest.history + closest.future;
      render();
    }
  }

  function bindHandle(handle, kind) {
    let dragging = null;
    const move = event => {
      const bounds = axis.getBoundingClientRect();
      changeHandle(kind, (event.clientX - bounds.left) / bounds.width * budget);
    };
    handle.disabled = false;
    handle.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      dragging = event.pointerId;
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      handle.classList.add("is-dragging");
      move(event);
    });
    handle.addEventListener("pointermove", event => { if (event.pointerId === dragging) move(event); });
    handle.addEventListener("pointerup", event => {
      if (event.pointerId !== dragging) return;
      move(event);
      dragging = null;
      handle.classList.remove("is-dragging");
      handle.releasePointerCapture(event.pointerId);
      snapNearby(kind);
    });
    const cancel = () => { dragging = null; handle.classList.remove("is-dragging"); };
    handle.addEventListener("pointercancel", cancel);
    handle.addEventListener("lostpointercapture", cancel);
    handle.addEventListener("keydown", event => {
      const low = kind === "history" ? minimum : history + minimum;
      const high = kind === "history" ? endpoint - minimum : budget;
      const current = kind === "history" ? history : endpoint;
      const step = event.shiftKey ? 10 : 1;
      let next;
      if (["ArrowRight", "ArrowUp"].includes(event.key)) next = current + step;
      if (["ArrowLeft", "ArrowDown"].includes(event.key)) next = current - step;
      if (event.key === "PageUp") next = current + 25;
      if (event.key === "PageDown") next = current - 25;
      if (event.key === "Home") next = low;
      if (event.key === "End") next = high;
      if (next === undefined) return;
      event.preventDefault();
      changeHandle(kind, next);
    });
  }

  bindHandle(historyHandle, "history");
  bindHandle(goalHandle, "goal");
  [historyInput, forecastInput].forEach(input => {
    input.disabled = false;
    input.addEventListener("change", () => {
      const value = input.valueAsNumber;
      if (Number.isFinite(value)) {
        if (input === historyInput) changeHandle("history", value * 100);
        else changeHandle("goal", history + value * 100);
      } else render();
    });
    input.addEventListener("keydown", event => { if (event.key === "Enter") input.blur(); });
  });
  render();
})();
