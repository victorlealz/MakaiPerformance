/* By Victor Leal Antunes */
"use strict";

(() => {
  const STORAGE_KEYS = {
    phone: "makaiAutoRegistro.phone",
    rememberPhone: "makaiAutoRegistro.rememberPhone",
    activeSession: "makaiAutoRegistro.activeSession",
    draft: "makaiAutoRegistro.draft",
    preferences: "makaiAutoRegistro.preferences"
  };

  const VALID_DRAFT_STAGES = new Set(["completion", "preview", "prepared"]);
  const SCREENS = [
    "homeScreen",
    "activeScreen",
    "completionScreen",
    "previewScreen",
    "phoneScreen",
    "preparedScreen",
    "completeScreen"
  ];

  const state = {
    activeSession: null,
    draft: null,
    selectedModality: "",
    customModality: "",
    timerId: null,
    transientPhone: "",
    lastCompleted: null
  };

  const dom = {};

  function cacheDom() {
    const ids = [
      ...SCREENS,
      "menuButton",
      "menuPanel",
      "privacyButton",
      "clearDataButton",
      "privacyDialog",
      "closePrivacyButton",
      "otherSportDetails",
      "otherSportInput",
      "selectOtherSportButton",
      "startWorkoutButton",
      "activeTitle",
      "activeTimer",
      "activeStartTime",
      "activeSessionId",
      "finishWorkoutButton",
      "cancelWorkoutButton",
      "completionSummary",
      "completionForm",
      "workoutDate",
      "durationMinutes",
      "startTimeInput",
      "endTimeInput",
      "rpeFieldset",
      "sleepFieldset",
      "painFieldset",
      "painLocationWrap",
      "painLocation",
      "strengthFields",
      "strengthSessionNameWrap",
      "strengthSessionName",
      "mainExercise",
      "loadKg",
      "setsReps",
      "combatFields",
      "combatLegend",
      "combatTypeButtons",
      "rounds",
      "roundDuration",
      "technicalFocus",
      "otherFields",
      "otherType",
      "otherRounds",
      "otherRoundDuration",
      "otherFocus",
      "notes",
      "validationMessage",
      "generateRecordButton",
      "recordPreview",
      "openWhatsappButton",
      "copyRecordButton",
      "editRecordButton",
      "phoneForm",
      "phoneInput",
      "rememberPhone",
      "phoneError",
      "continueWhatsappButton",
      "backToPreviewButton",
      "sentConfirmationButton",
      "reopenWhatsappButton",
      "copyPreparedButton",
      "editPreparedButton",
      "completeSummary",
      "newWorkoutButton",
      "liveRegion"
    ];

    ids.forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function safeGetItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("LocalStorage indisponível para leitura.", error);
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("LocalStorage indisponível para gravação.", error);
      return false;
    }
  }

  function safeRemoveItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn("LocalStorage indisponível para remoção.", error);
    }
  }

  function readJson(key) {
    const raw = safeGetItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Dados inválidos em ${key}; o valor será descartado.`, error);
      safeRemoveItem(key);
      return null;
    }
  }

  function writeJson(key, value) {
    return safeSetItem(key, JSON.stringify(value));
  }

  function announce(message) {
    if (!dom.liveRegion) return;
    dom.liveRegion.textContent = "";
    window.setTimeout(() => {
      dom.liveRegion.textContent = message;
    }, 20);
  }

  function debounce(fn, wait = 300) {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), wait);
    };
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateIso(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function formatDateBr(dateIso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso || "")) return "";
    const [year, month, day] = dateIso.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatTime(date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function formatElapsed(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  function formatNumberBr(value) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
  }

  function createSessionId(date) {
    return [
      "MAR-",
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate()),
      "-",
      pad2(date.getHours()),
      pad2(date.getMinutes()),
      pad2(date.getSeconds())
    ].join("");
  }

  function minutesFromTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function durationFromTimes(start, end) {
    const startMinutes = minutesFromTime(start);
    const endMinutes = minutesFromTime(end);
    if (startMinutes === null || endMinutes === null) return null;
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60;
    return Math.max(1, diff);
  }

  function getModalityLabel(session = state.activeSession) {
    if (!session) return "";
    if (session.modality === "Outro") {
      return (session.customModality || "Outro").trim() || "Outro";
    }
    return session.modality;
  }

  function modalityEmoji(modality) {
    if (modality === "Musculação") return "🏋️";
    if (modality === "Jiu-Jitsu" || modality === "Judô") return "🥋";
    if (modality === "Muay Thai") return "🥊";
    return "📝";
  }

  function isValidActiveSession(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.modality === "string" &&
      Number.isFinite(Number(value.startTimestamp)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.dateISO || "") &&
      /^\d{2}:\d{2}$/.test(value.startTime || "")
    );
  }

  function isValidDraft(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      VALID_DRAFT_STAGES.has(value.stage)
    );
  }

  function loadPersistedState() {
    const activeSession = readJson(STORAGE_KEYS.activeSession);
    const draft = readJson(STORAGE_KEYS.draft);

    if (isValidActiveSession(activeSession)) {
      state.activeSession = activeSession;
    } else if (activeSession) {
      safeRemoveItem(STORAGE_KEYS.activeSession);
    }

    if (state.activeSession && isValidDraft(draft)) {
      state.draft = draft;
    } else if (draft) {
      safeRemoveItem(STORAGE_KEYS.draft);
    }

    const remember = safeGetItem(STORAGE_KEYS.rememberPhone) === "true";
    const savedPhone = safeGetItem(STORAGE_KEYS.phone) || "";

    if (!remember && savedPhone) {
      safeRemoveItem(STORAGE_KEYS.phone);
    }
  }

  function saveActiveSession() {
    if (!state.activeSession) return;
    writeJson(STORAGE_KEYS.activeSession, state.activeSession);
  }

  function saveDraft() {
    if (!state.draft) return;
    writeJson(STORAGE_KEYS.draft, state.draft);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function showScreen(screenId) {
    SCREENS.forEach((id) => {
      const element = dom[id];
      if (!element) return;
      element.hidden = id !== screenId;
    });

    if (screenId !== "activeScreen") stopTimer();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeMenu() {
    if (!dom.menuPanel || !dom.menuButton) return;
    dom.menuPanel.hidden = true;
    dom.menuButton.setAttribute("aria-expanded", "false");
  }

  function resetHomeSelection() {
    state.selectedModality = "";
    state.customModality = "";
    document.querySelectorAll("[data-modality]").forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
    if (dom.otherSportInput) dom.otherSportInput.value = "";
    if (dom.startWorkoutButton) dom.startWorkoutButton.disabled = true;
  }

  function renderHome() {
    stopTimer();
    showScreen("homeScreen");
  }

  function updateTimer() {
    if (!state.activeSession || !dom.activeTimer) return;
    dom.activeTimer.textContent = formatElapsed(Date.now() - Number(state.activeSession.startTimestamp));
  }

  function renderActive(restored = false) {
    if (!state.activeSession) {
      renderHome();
      return;
    }

    showScreen("activeScreen");
    dom.activeTitle.textContent = getModalityLabel();
    dom.activeStartTime.textContent = state.activeSession.startTime;
    dom.activeSessionId.textContent = state.activeSession.id;
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 1000);

    if (restored) announce("Sessão restaurada.");
  }

  function setHomeModality(modality, customModality = "") {
    state.selectedModality = modality;
    state.customModality = customModality;

    document.querySelectorAll("[data-modality]").forEach((button) => {
      const selected = button.dataset.modality === modality;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const ready = modality && (modality !== "Outro" || customModality.trim().length > 0);
    dom.startWorkoutButton.disabled = !ready;
  }

  function startWorkout() {
    const modality = state.selectedModality;
    const customModality = state.customModality.trim();

    if (!modality || (modality === "Outro" && !customModality)) {
      announce("Escolha uma modalidade antes de iniciar.");
      return;
    }

    const now = new Date();
    state.activeSession = {
      id: createSessionId(now),
      modality,
      customModality: modality === "Outro" ? customModality : "",
      dateISO: formatDateIso(now),
      startTime: formatTime(now),
      startTimestamp: now.getTime()
    };
    state.draft = null;
    saveActiveSession();
    safeRemoveItem(STORAGE_KEYS.draft);
    renderActive(false);
    announce("Treino iniciado.");
  }

  function createInitialDraft() {
    const now = new Date();
    const duration = Math.max(1, Math.round((now.getTime() - Number(state.activeSession.startTimestamp)) / 60000));

    return {
      stage: "completion",
      endTimestamp: now.getTime(),
      dateISO: state.activeSession.dateISO,
      startTime: state.activeSession.startTime,
      endTime: formatTime(now),
      duration,
      rpe: null,
      sleep: null,
      pain: null,
      painLocation: "",
      notes: "",
      strengthSession: "",
      strengthSessionName: "",
      mainExercise: "",
      loadKg: "",
      setsReps: "",
      combatType: "",
      rounds: "",
      roundDuration: "",
      technicalFocus: "",
      otherType: "",
      otherRounds: "",
      otherRoundDuration: "",
      otherFocus: "",
      message: ""
    };
  }

  function finishWorkout() {
    if (!state.activeSession) return;
    state.draft = createInitialDraft();
    saveDraft();
    renderCompletion();
    announce("Treino finalizado. Preencha o resumo.");
  }

  function cancelWorkout() {
    const confirmed = window.confirm("Cancelar esta sessão? Os dados atuais do treino serão apagados.");
    if (!confirmed) return;

    state.activeSession = null;
    state.draft = null;
    state.transientPhone = "";
    safeRemoveItem(STORAGE_KEYS.activeSession);
    safeRemoveItem(STORAGE_KEYS.draft);
    resetHomeSelection();
    renderHome();
    announce("Sessão cancelada.");
  }

  function setChipSelection(group, value) {
    document.querySelectorAll(`[data-group="${group}"]`).forEach((button) => {
      const selected = String(button.dataset.value) === String(value);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function clearSelectionError(group) {
    if (group === "rpe") dom.rpeFieldset.classList.remove("has-error");
    if (group === "sleep") dom.sleepFieldset.classList.remove("has-error");
    if (group === "pain") dom.painFieldset.classList.remove("has-error");
  }

  function updatePainVisibility() {
    if (!state.draft) return;
    const show = Number(state.draft.pain) > 0;
    dom.painLocationWrap.hidden = !show;
    if (!show) {
      state.draft.painLocation = "";
      dom.painLocation.value = "";
    }
  }

  function updateStrengthSessionVisibility() {
    if (!state.draft) return;
    const show = state.draft.strengthSession === "Livre";
    dom.strengthSessionNameWrap.hidden = !show;
    if (!show) {
      state.draft.strengthSessionName = "";
      dom.strengthSessionName.value = "";
    }
  }

  function clearCombatTypeButtons() {
    while (dom.combatTypeButtons.firstChild) {
      dom.combatTypeButtons.removeChild(dom.combatTypeButtons.firstChild);
    }
  }

  function combatTypesFor(modality) {
    if (modality === "Jiu-Jitsu") return ["Técnica", "Sparring", "Misto"];
    if (modality === "Judô") return ["Técnica", "Randori", "Misto"];
    if (modality === "Muay Thai") return ["Técnica", "Saco / Manopla", "Sparring", "Misto"];
    return [];
  }

  function combatFocusPlaceholder(modality) {
    if (modality === "Jiu-Jitsu") return "Ex.: passagem de guarda";
    if (modality === "Judô") return "Ex.: uchi-komi, nage-komi, ne-waza";
    if (modality === "Muay Thai") return "Ex.: clinch, boxe, chutes";
    return "Ex.: foco técnico";
  }

  function buildCombatTypeButtons(modality) {
    clearCombatTypeButtons();
    combatTypesFor(modality).forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip chip--text";
      button.dataset.group = "combatType";
      button.dataset.value = type;
      button.setAttribute("aria-pressed", "false");
      button.textContent = type;
      dom.combatTypeButtons.appendChild(button);
    });

    if (state.draft?.combatType) {
      setChipSelection("combatType", state.draft.combatType);
    }
  }

  function updateSpecificFields() {
    if (!state.activeSession) return;
    const modality = state.activeSession.modality;

    dom.strengthFields.hidden = modality !== "Musculação";
    dom.combatFields.hidden = !["Jiu-Jitsu", "Judô", "Muay Thai"].includes(modality);
    dom.otherFields.hidden = modality !== "Outro";

    if (!["Jiu-Jitsu", "Judô", "Muay Thai"].includes(modality)) return;

    dom.combatLegend.textContent = modality;
    dom.technicalFocus.placeholder = combatFocusPlaceholder(modality);
    buildCombatTypeButtons(modality);
  }

  function fillCompletionFormFromDraft() {
    if (!state.draft) return;

    dom.workoutDate.value = state.draft.dateISO || "";
    dom.startTimeInput.value = state.draft.startTime || "";
    dom.endTimeInput.value = state.draft.endTime || "";
    dom.durationMinutes.value = state.draft.duration ?? "";
    dom.painLocation.value = state.draft.painLocation || "";
    dom.strengthSessionName.value = state.draft.strengthSessionName || "";
    dom.mainExercise.value = state.draft.mainExercise || "";
    dom.loadKg.value = state.draft.loadKg ?? "";
    dom.setsReps.value = state.draft.setsReps || "";
    dom.rounds.value = state.draft.rounds ?? "";
    dom.roundDuration.value = state.draft.roundDuration ?? "";
    dom.technicalFocus.value = state.draft.technicalFocus || "";
    dom.otherType.value = state.draft.otherType || "";
    dom.otherRounds.value = state.draft.otherRounds ?? "";
    dom.otherRoundDuration.value = state.draft.otherRoundDuration ?? "";
    dom.otherFocus.value = state.draft.otherFocus || "";
    dom.notes.value = state.draft.notes || "";

    setChipSelection("rpe", state.draft.rpe);
    setChipSelection("sleep", state.draft.sleep);
    setChipSelection("pain", state.draft.pain);
    setChipSelection("strengthSession", state.draft.strengthSession);
    setChipSelection("combatType", state.draft.combatType);

    updatePainVisibility();
    updateStrengthSessionVisibility();
  }

  function renderCompletion() {
    if (!state.activeSession || !state.draft) {
      renderHome();
      return;
    }

    showScreen("completionScreen");
    updateSpecificFields();
    fillCompletionFormFromDraft();
    clearValidationState();
    updateCompletionSummary();
  }

  function updateCompletionSummary() {
    if (!state.activeSession || !state.draft) return;
    const label = getModalityLabel();
    const duration = Number(state.draft.duration);
    dom.completionSummary.textContent = `${label} · ${state.draft.startTime || "--:--"} → ${state.draft.endTime || "--:--"} · ${Number.isFinite(duration) ? duration : "—"} min`;
  }

  function syncDraftFromFields() {
    if (!state.draft) return;

    state.draft.dateISO = dom.workoutDate.value;
    state.draft.startTime = dom.startTimeInput.value;
    state.draft.endTime = dom.endTimeInput.value;
    state.draft.duration = dom.durationMinutes.value === "" ? "" : Number(dom.durationMinutes.value);
    state.draft.painLocation = dom.painLocation.value.trim();
    state.draft.strengthSessionName = dom.strengthSessionName.value.trim();
    state.draft.mainExercise = dom.mainExercise.value.trim();
    state.draft.loadKg = dom.loadKg.value;
    state.draft.setsReps = dom.setsReps.value.trim();
    state.draft.rounds = dom.rounds.value;
    state.draft.roundDuration = dom.roundDuration.value;
    state.draft.technicalFocus = dom.technicalFocus.value.trim();
    state.draft.otherType = dom.otherType.value.trim();
    state.draft.otherRounds = dom.otherRounds.value;
    state.draft.otherRoundDuration = dom.otherRoundDuration.value;
    state.draft.otherFocus = dom.otherFocus.value.trim();
    state.draft.notes = dom.notes.value.trim();

    updateCompletionSummary();
    saveDraft();
  }

  const saveDraftDebounced = debounce(syncDraftFromFields, 300);

  function onTimingChanged() {
    if (!state.draft) return;
    const computed = durationFromTimes(dom.startTimeInput.value, dom.endTimeInput.value);
    if (computed !== null) {
      dom.durationMinutes.value = String(computed);
    }
    syncDraftFromFields();
  }

  function clearValidationState() {
    dom.validationMessage.hidden = true;
    dom.validationMessage.textContent = "";
    [dom.workoutDate, dom.startTimeInput, dom.endTimeInput, dom.durationMinutes, dom.loadKg, dom.rounds, dom.roundDuration, dom.otherRounds, dom.otherRoundDuration].forEach((input) => {
      if (input) input.removeAttribute("aria-invalid");
    });
    dom.rpeFieldset.classList.remove("has-error");
    dom.sleepFieldset.classList.remove("has-error");
    dom.painFieldset.classList.remove("has-error");
  }

  function addValidationError(errors, input, message) {
    errors.push(message);
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function validateOptionalNonNegativeNumber(value, input, label, options = {}) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      return `${label} deve ser um número igual ou maior que zero.`;
    }
    if (options.integer && !Number.isInteger(number)) {
      return `${label} deve ser um número inteiro.`;
    }
    if (input) input.removeAttribute("aria-invalid");
    return null;
  }

  function validateCompletion() {
    syncDraftFromFields();
    clearValidationState();

    const errors = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.draft.dateISO || "")) {
      addValidationError(errors, dom.workoutDate, "Informe uma data válida.");
    }

    if (minutesFromTime(state.draft.startTime) === null) {
      addValidationError(errors, dom.startTimeInput, "Informe um horário de início válido.");
    }

    if (minutesFromTime(state.draft.endTime) === null) {
      addValidationError(errors, dom.endTimeInput, "Informe um horário de fim válido.");
    }

    const duration = Number(state.draft.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      addValidationError(errors, dom.durationMinutes, "A duração deve ser maior que zero.");
    }

    const rpe = Number(state.draft.rpe);
    if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
      errors.push("Selecione a intensidade percebida (RPE) de 1 a 10.");
      dom.rpeFieldset.classList.add("has-error");
    }

    const sleep = Number(state.draft.sleep);
    if (!Number.isInteger(sleep) || sleep < 1 || sleep > 5) {
      errors.push("Selecione a qualidade do sono de 1 a 5.");
      dom.sleepFieldset.classList.add("has-error");
    }

    const pain = Number(state.draft.pain);
    if (!Number.isInteger(pain) || pain < 0 || pain > 10) {
      errors.push("Selecione dor/desconforto de 0 a 10.");
      dom.painFieldset.classList.add("has-error");
    }

    if (state.activeSession.modality === "Musculação") {
      const loadError = validateOptionalNonNegativeNumber(state.draft.loadKg, dom.loadKg, "Carga principal");
      if (loadError) {
        errors.push(loadError);
        dom.loadKg.setAttribute("aria-invalid", "true");
      }
    }

    if (["Jiu-Jitsu", "Judô", "Muay Thai"].includes(state.activeSession.modality)) {
      const roundsError = validateOptionalNonNegativeNumber(state.draft.rounds, dom.rounds, "Rounds", { integer: true });
      if (roundsError) {
        errors.push(roundsError);
        dom.rounds.setAttribute("aria-invalid", "true");
      }
      const roundDurationError = validateOptionalNonNegativeNumber(state.draft.roundDuration, dom.roundDuration, "Duração por round");
      if (roundDurationError) {
        errors.push(roundDurationError);
        dom.roundDuration.setAttribute("aria-invalid", "true");
      }
    }

    if (state.activeSession.modality === "Outro") {
      const otherRoundsError = validateOptionalNonNegativeNumber(state.draft.otherRounds, dom.otherRounds, "Rounds/blocos", { integer: true });
      if (otherRoundsError) {
        errors.push(otherRoundsError);
        dom.otherRounds.setAttribute("aria-invalid", "true");
      }
      const otherDurationError = validateOptionalNonNegativeNumber(state.draft.otherRoundDuration, dom.otherRoundDuration, "Duração por bloco");
      if (otherDurationError) {
        errors.push(otherDurationError);
        dom.otherRoundDuration.setAttribute("aria-invalid", "true");
      }
    }

    if (errors.length > 0) {
      dom.validationMessage.textContent = errors[0];
      dom.validationMessage.hidden = false;
      const firstInvalid = dom.completionForm.querySelector('[aria-invalid="true"], .has-error');
      firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      announce(errors[0]);
      return false;
    }

    return true;
  }

  function appendLineIf(lines, label, value) {
    if (value === "" || value === null || value === undefined) return;
    const text = String(value).trim();
    if (!text) return;
    lines.push(`${label}: ${text}`);
  }

  function buildRecordMessage() {
    const session = state.activeSession;
    const draft = state.draft;
    const modalityLabel = getModalityLabel(session);
    const emoji = modalityEmoji(session.modality);
    const lines = [
      "Makai Performance System [BETA]",
      "",
      `ID: ${session.id}`,
      `Data: ${formatDateBr(draft.dateISO)}`,
      `Início: ${draft.startTime}`,
      `Fim: ${draft.endTime}`,
      `Duração: ${Math.round(Number(draft.duration))} min`,
      "",
      `Modalidade: ${emoji} ${modalityLabel}`
    ];

    if (session.modality === "Musculação") {
      let sessionName = draft.strengthSession;
      if (sessionName === "Livre" && draft.strengthSessionName) {
        sessionName = `Livre — ${draft.strengthSessionName}`;
      }
      appendLineIf(lines, "Sessão", sessionName);
      appendLineIf(lines, "Exercícios principais", draft.mainExercise);
      if (draft.loadKg !== "") appendLineIf(lines, "Carga principal", `${formatNumberBr(draft.loadKg)} kg`);
      appendLineIf(lines, "Séries/Reps", draft.setsReps);
    }

    if (["Jiu-Jitsu", "Judô", "Muay Thai"].includes(session.modality)) {
      appendLineIf(lines, "Tipo", draft.combatType);
      appendLineIf(lines, "Rounds", draft.rounds);
      if (draft.roundDuration !== "") appendLineIf(lines, "Duração/round (min)", formatNumberBr(draft.roundDuration));
      appendLineIf(lines, "Foco técnico", draft.technicalFocus);
    }

    if (session.modality === "Outro") {
      appendLineIf(lines, "Tipo", draft.otherType);
      appendLineIf(lines, "Rounds/blocos", draft.otherRounds);
      if (draft.otherRoundDuration !== "") appendLineIf(lines, "Duração/bloco (min)", formatNumberBr(draft.otherRoundDuration));
      appendLineIf(lines, "Foco", draft.otherFocus);
    }

    lines.push(
      "",
      `RPE: ${draft.rpe}/10`,
      `Sono: ${draft.sleep}/5`,
      `Dor: ${draft.pain}/10`
    );

    if (Number(draft.pain) > 0) {
      appendLineIf(lines, "Local da dor", draft.painLocation);
    }

    if (draft.notes) {
      lines.push("", `Observações: ${draft.notes}`);
    }

    return lines.join("\n");
  }

  function generateRecord(event) {
    event.preventDefault();
    if (!validateCompletion()) return;

    state.draft.message = buildRecordMessage();
    state.draft.stage = "preview";
    saveDraft();
    renderPreview();
    announce("Registro pronto para revisão.");
  }

  function renderPreview() {
    if (!state.draft?.message) {
      if (state.draft) {
        state.draft.stage = "completion";
        saveDraft();
        renderCompletion();
      } else {
        renderHome();
      }
      return;
    }

    showScreen("previewScreen");
    dom.recordPreview.textContent = state.draft.message;
  }

  async function copyText(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.warn("Clipboard API indisponível; usando fallback.", error);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      console.warn("Fallback de cópia falhou.", error);
    }

    document.body.removeChild(textarea);
    return copied;
  }

  async function copyCurrentRecord() {
    const copied = await copyText(state.draft?.message || "");
    announce(copied ? "Registro copiado." : "Não foi possível copiar automaticamente.");
  }

  function editRecord() {
    if (!state.draft) return;
    state.draft.stage = "completion";
    saveDraft();
    renderCompletion();
  }

  function normalizeBrazilPhone(rawValue) {
    let digits = String(rawValue || "").replace(/\D/g, "");
    if (!digits) return null;

    if (digits.startsWith("00")) digits = digits.slice(2);

    let national = digits;
    if (digits.startsWith("55")) {
      national = digits.slice(2);
    }

    if (national.length !== 10 && national.length !== 11) return null;
    if (national.startsWith("0")) return null;

    const ddd = national.slice(0, 2);
    const subscriber = national.slice(2);
    if (/^0+$/.test(ddd) || /^0+$/.test(subscriber)) return null;

    return `55${national}`;
  }

  function getSavedPhone() {
    if (safeGetItem(STORAGE_KEYS.rememberPhone) !== "true") return "";
    return normalizeBrazilPhone(safeGetItem(STORAGE_KEYS.phone) || "") || "";
  }

  function phoneForReopen() {
    return state.transientPhone || getSavedPhone();
  }

  function renderPhone() {
    showScreen("phoneScreen");
    const saved = getSavedPhone();
    const initial = saved ? saved.slice(2) : "";
    dom.phoneInput.value = initial;
    dom.rememberPhone.checked = Boolean(saved);
    dom.phoneError.hidden = true;
    dom.phoneError.textContent = "";
    dom.phoneInput.removeAttribute("aria-invalid");
    window.setTimeout(() => dom.phoneInput.focus(), 50);
  }

  function persistPhoneChoice(normalizedPhone, remember) {
    if (remember) {
      safeSetItem(STORAGE_KEYS.phone, normalizedPhone);
      safeSetItem(STORAGE_KEYS.rememberPhone, "true");
    } else {
      safeRemoveItem(STORAGE_KEYS.phone);
      safeRemoveItem(STORAGE_KEYS.rememberPhone);
    }
  }

  function whatsappUrl(phone, message) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsappWithPhone(phone) {
    if (!state.draft?.message) {
      renderPreview();
      return;
    }

    const normalized = normalizeBrazilPhone(phone);
    if (!normalized) {
      renderPhone();
      announce("Informe um número de WhatsApp válido.");
      return;
    }

    state.transientPhone = normalized;
    state.draft.stage = "prepared";
    saveDraft();

    const url = whatsappUrl(normalized, state.draft.message);

    try {
      window.location.href = url;
    } catch (error) {
      console.warn("Não foi possível abrir o WhatsApp.", error);
      renderPrepared();
      announce("Não foi possível abrir o WhatsApp automaticamente. Copie o registro e cole manualmente.");
    }
  }

  function requestWhatsappOpen() {
    const savedPhone = getSavedPhone();
    if (savedPhone) {
      openWhatsappWithPhone(savedPhone);
      return;
    }
    renderPhone();
  }

  function submitPhone(event) {
    event.preventDefault();
    const normalized = normalizeBrazilPhone(dom.phoneInput.value);

    if (!normalized) {
      dom.phoneInput.setAttribute("aria-invalid", "true");
      dom.phoneError.textContent = "Informe DDD + número. Ex.: 83 99999-9999.";
      dom.phoneError.hidden = false;
      announce("Número de WhatsApp inválido.");
      return;
    }

    dom.phoneInput.removeAttribute("aria-invalid");
    dom.phoneError.hidden = true;
    dom.phoneError.textContent = "";

    const remember = dom.rememberPhone.checked;
    persistPhoneChoice(normalized, remember);
    if (!remember) state.transientPhone = normalized;
    openWhatsappWithPhone(normalized);
  }

  function renderPrepared() {
    if (!state.draft?.message) {
      renderHome();
      return;
    }
    showScreen("preparedScreen");
  }

  function reopenWhatsapp() {
    const phone = phoneForReopen();
    if (!phone) {
      renderPhone();
      return;
    }
    openWhatsappWithPhone(phone);
  }

  function completeWorkout() {
    if (!state.activeSession || !state.draft) return;

    state.lastCompleted = {
      modality: getModalityLabel(),
      duration: Math.round(Number(state.draft.duration)),
      rpe: Number(state.draft.rpe)
    };

    state.activeSession = null;
    state.draft = null;
    state.transientPhone = "";
    safeRemoveItem(STORAGE_KEYS.activeSession);
    safeRemoveItem(STORAGE_KEYS.draft);

    if (safeGetItem(STORAGE_KEYS.rememberPhone) !== "true") {
      safeRemoveItem(STORAGE_KEYS.phone);
      safeRemoveItem(STORAGE_KEYS.rememberPhone);
    }

    renderComplete();
    announce("Registro concluído.");
  }

  function renderComplete() {
    showScreen("completeScreen");
    if (!state.lastCompleted) {
      dom.completeSummary.textContent = "Registro concluído.";
      return;
    }

    dom.completeSummary.textContent = `${state.lastCompleted.modality}\n${state.lastCompleted.duration} min\nRPE ${state.lastCompleted.rpe}`;
  }

  function newWorkout() {
    state.lastCompleted = null;
    resetHomeSelection();
    renderHome();
  }

  function clearAllData() {
    const confirmed = window.confirm("Apagar todos os dados do Makai salvos neste aparelho? Sessões e rascunhos serão removidos.");
    if (!confirmed) return;

    Object.values(STORAGE_KEYS).forEach(safeRemoveItem);
    state.activeSession = null;
    state.draft = null;
    state.transientPhone = "";
    state.lastCompleted = null;
    stopTimer();
    closeMenu();
    resetHomeSelection();
    renderHome();
    announce("Dados deste aparelho apagados.");
  }

  function showPrivacy() {
    closeMenu();
    if (typeof dom.privacyDialog.showModal === "function") {
      dom.privacyDialog.showModal();
    } else {
      dom.privacyDialog.setAttribute("open", "");
    }
  }

  function closePrivacy() {
    if (typeof dom.privacyDialog.close === "function") {
      dom.privacyDialog.close();
    } else {
      dom.privacyDialog.removeAttribute("open");
    }
  }

  function handleChipClick(button) {
    if (!state.draft) return;

    const group = button.dataset.group;
    const rawValue = button.dataset.value;
    if (!group) return;

    if (["rpe", "sleep", "pain"].includes(group)) {
      state.draft[group] = Number(rawValue);
      clearSelectionError(group);
    } else if (group === "strengthSession") {
      state.draft.strengthSession = rawValue;
    } else if (group === "combatType") {
      state.draft.combatType = rawValue;
    }

    setChipSelection(group, rawValue);
    if (group === "pain") updatePainVisibility();
    if (group === "strengthSession") updateStrengthSessionVisibility();
    saveDraft();
  }

  function attachEventListeners() {
    document.querySelectorAll("[data-modality]").forEach((button) => {
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => setHomeModality(button.dataset.modality));
    });

    dom.selectOtherSportButton.addEventListener("click", () => {
      const value = dom.otherSportInput.value.trim();
      if (!value) {
        dom.otherSportInput.setAttribute("aria-invalid", "true");
        announce("Informe o nome do esporte.");
        dom.otherSportInput.focus();
        return;
      }
      dom.otherSportInput.removeAttribute("aria-invalid");
      setHomeModality("Outro", value);
      announce(`${value} selecionado.`);
    });

    dom.otherSportInput.addEventListener("input", () => {
      dom.otherSportInput.removeAttribute("aria-invalid");
      if (state.selectedModality === "Outro") {
        state.customModality = dom.otherSportInput.value.trim();
        dom.startWorkoutButton.disabled = state.customModality.length === 0;
      }
    });

    dom.startWorkoutButton.addEventListener("click", startWorkout);
    dom.finishWorkoutButton.addEventListener("click", finishWorkout);
    dom.cancelWorkoutButton.addEventListener("click", cancelWorkout);

    dom.completionForm.addEventListener("click", (event) => {
      const button = event.target.closest("[data-group]");
      if (button && dom.completionForm.contains(button)) handleChipClick(button);
    });

    dom.completionForm.addEventListener("input", (event) => {
      if ([dom.startTimeInput, dom.endTimeInput].includes(event.target)) return;
      saveDraftDebounced();
    });

    dom.completionForm.addEventListener("change", (event) => {
      if ([dom.startTimeInput, dom.endTimeInput].includes(event.target)) {
        onTimingChanged();
        return;
      }
      syncDraftFromFields();
    });

    dom.completionForm.addEventListener("submit", generateRecord);

    dom.openWhatsappButton.addEventListener("click", requestWhatsappOpen);
    dom.copyRecordButton.addEventListener("click", copyCurrentRecord);
    dom.editRecordButton.addEventListener("click", editRecord);

    dom.phoneForm.addEventListener("submit", submitPhone);
    dom.phoneInput.addEventListener("input", () => {
      dom.phoneInput.removeAttribute("aria-invalid");
      dom.phoneError.hidden = true;
      dom.phoneError.textContent = "";
    });
    dom.backToPreviewButton.addEventListener("click", renderPreview);

    dom.sentConfirmationButton.addEventListener("click", completeWorkout);
    dom.reopenWhatsappButton.addEventListener("click", reopenWhatsapp);
    dom.copyPreparedButton.addEventListener("click", copyCurrentRecord);
    dom.editPreparedButton.addEventListener("click", editRecord);
    dom.newWorkoutButton.addEventListener("click", newWorkout);

    dom.menuButton.addEventListener("click", () => {
      const willOpen = dom.menuPanel.hidden;
      dom.menuPanel.hidden = !willOpen;
      dom.menuButton.setAttribute("aria-expanded", String(willOpen));
    });

    dom.privacyButton.addEventListener("click", showPrivacy);
    dom.clearDataButton.addEventListener("click", clearAllData);
    dom.closePrivacyButton.addEventListener("click", closePrivacy);

    dom.privacyDialog.addEventListener("click", (event) => {
      if (event.target === dom.privacyDialog) closePrivacy();
    });

    document.addEventListener("click", (event) => {
      if (!dom.menuPanel.hidden && !event.target.closest(".menu-wrap")) closeMenu();
    });

    window.addEventListener("pageshow", () => {
      if (state.draft?.stage === "prepared") renderPrepared();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.draft?.stage === "prepared") renderPrepared();
    });
  }

  function renderInitialFlow() {
    if (!state.activeSession) {
      renderHome();
      return;
    }

    if (!state.draft) {
      renderActive(true);
      return;
    }

    if (state.draft.stage === "completion") {
      renderCompletion();
      announce("Rascunho restaurado.");
      return;
    }

    if (state.draft.stage === "preview") {
      renderPreview();
      announce("Registro restaurado.");
      return;
    }

    if (state.draft.stage === "prepared") {
      renderPrepared();
      announce("Registro preparado restaurado.");
      return;
    }

    renderActive(true);
  }

  function init() {
    cacheDom();
    loadPersistedState();
    attachEventListeners();
    renderInitialFlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
