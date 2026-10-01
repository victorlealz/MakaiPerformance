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
      "registerWorkoutButton",
      "cancelRegistrationButton",
      "completionSummary",
      "completionForm",
      "workoutDate",
      "durationMinutes",
      "startTimeInput",
      "endTimeInput",
      "rpeFieldset",
      "fatigueFieldset",
      "painFieldset",
      "painLocationWrap",
      "painLocation",
      "strengthFields",
      "strengthSessionNameWrap",
      "strengthSessionName",
      "exerciseList",
      "addExerciseButton",
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
      /^\d{4}-\d{2}-\d{2}$/.test(value.dateISO || "")
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


  function showScreen(screenId) {
    SCREENS.forEach((id) => {
      const element = dom[id];
      if (!element) return;
      element.hidden = id !== screenId;
    });

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
    if (dom.registerWorkoutButton) dom.registerWorkoutButton.disabled = true;
  }

  function renderHome() {
    showScreen("homeScreen");
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
    dom.registerWorkoutButton.disabled = !ready;
  }

  function createEmptyExercise(index = 1) {
    return {
      id: `exercise-${Date.now()}-${index}`,
      name: "",
      loadKg: "",
      setsReps: ""
    };
  }

  function createInitialDraft() {
    const now = new Date();

    return {
      stage: "completion",
      dateISO: state.activeSession?.dateISO || formatDateIso(now),
      startTime: "",
      endTime: formatTime(now),
      duration: "",
      rpe: null,
      fatigue: null,
      pain: null,
      painLocation: "",
      notes: "",
      strengthSession: "",
      strengthSessionName: "",
      exercises: [createEmptyExercise(1)],
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

  function registerWorkout() {
    const modality = state.selectedModality;
    const customModality = state.customModality.trim();

    if (!modality || (modality === "Outro" && !customModality)) {
      announce("Escolha uma modalidade antes de registrar.");
      return;
    }

    const now = new Date();
    state.activeSession = {
      id: createSessionId(now),
      modality,
      customModality: modality === "Outro" ? customModality : "",
      dateISO: formatDateIso(now),
      createdTimestamp: now.getTime()
    };
    state.draft = createInitialDraft();
    saveActiveSession();
    saveDraft();
    renderCompletion();
    announce("Preencha os dados do treino.");
  }

  function cancelRegistration() {
    const confirmed = window.confirm("Cancelar este registro? Os dados preenchidos serão apagados.");
    if (!confirmed) return;

    state.activeSession = null;
    state.draft = null;
    state.transientPhone = "";
    safeRemoveItem(STORAGE_KEYS.activeSession);
    safeRemoveItem(STORAGE_KEYS.draft);
    resetHomeSelection();
    renderHome();
    announce("Registro cancelado.");
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
    if (group === "fatigue") dom.fatigueFieldset.classList.remove("has-error");
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

  function ensureExerciseArray() {
    if (!state.draft) return;

    if (!Array.isArray(state.draft.exercises)) {
      const legacyHasExercise = Boolean(
        state.draft.mainExercise ||
        (state.draft.loadKg !== "" && state.draft.loadKg !== undefined && state.draft.loadKg !== null) ||
        state.draft.setsReps
      );
      state.draft.exercises = legacyHasExercise
        ? [{
            id: `exercise-${Date.now()}-legacy`,
            name: state.draft.mainExercise || "",
            loadKg: state.draft.loadKg ?? "",
            setsReps: state.draft.setsReps || ""
          }]
        : [createEmptyExercise(1)];
    }

    if (state.draft.exercises.length === 0) {
      state.draft.exercises.push(createEmptyExercise(1));
    }
  }

  function makeExerciseField(labelText, field, exercise, options = {}) {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    const inputId = `${exercise.id}-${field}`;
    label.htmlFor = inputId;
    label.textContent = labelText;

    const input = document.createElement("input");
    input.id = inputId;
    input.dataset.exerciseId = exercise.id;
    input.dataset.exerciseField = field;
    input.value = exercise[field] ?? "";
    input.autocomplete = "off";
    input.placeholder = options.placeholder || "";
    if (options.type) input.type = options.type;
    if (options.inputmode) input.inputMode = options.inputmode;
    if (options.min !== undefined) input.min = String(options.min);
    if (options.step !== undefined) input.step = String(options.step);
    if (options.maxLength) input.maxLength = options.maxLength;

    wrap.append(label, input);
    return wrap;
  }

  function renderExerciseList() {
    if (!dom.exerciseList || !state.draft) return;
    ensureExerciseArray();
    dom.exerciseList.replaceChildren();

    state.draft.exercises.forEach((exercise, index) => {
      const card = document.createElement("div");
      card.className = "exercise-row";
      card.dataset.exerciseId = exercise.id;

      const header = document.createElement("div");
      header.className = "exercise-row__header";

      const title = document.createElement("strong");
      title.textContent = `Exercício ${index + 1}`;
      header.appendChild(title);

      if (state.draft.exercises.length > 1) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button-link button-link--danger remove-exercise-button";
        remove.dataset.removeExercise = exercise.id;
        remove.textContent = "Remover";
        remove.setAttribute("aria-label", `Remover exercício ${index + 1}`);
        header.appendChild(remove);
      }

      const nameField = makeExerciseField("Exercício", "name", exercise, {
        placeholder: "Ex.: Front Squat",
        maxLength: 140
      });

      const grid = document.createElement("div");
      grid.className = "field-grid field-grid--two";
      grid.append(
        makeExerciseField("Carga (kg)", "loadKg", exercise, {
          type: "number", inputmode: "decimal", min: 0, step: 0.5, placeholder: "90"
        }),
        makeExerciseField("Séries × repetições", "setsReps", exercise, {
          placeholder: "Ex.: 5x4", maxLength: 40
        })
      );

      card.append(header, nameField, grid);
      dom.exerciseList.appendChild(card);
    });
  }

  function addExercise() {
    if (!state.draft) return;
    ensureExerciseArray();
    state.draft.exercises.push(createEmptyExercise(state.draft.exercises.length + 1));
    renderExerciseList();
    saveDraft();
    dom.exerciseList.querySelector(".exercise-row:last-child input")?.focus();
    announce("Exercício adicionado.");
  }

  function removeExercise(exerciseId) {
    if (!state.draft) return;
    ensureExerciseArray();
    if (state.draft.exercises.length <= 1) return;
    state.draft.exercises = state.draft.exercises.filter((exercise) => exercise.id !== exerciseId);
    renderExerciseList();
    saveDraft();
    announce("Exercício removido.");
  }

  function updateExerciseFromInput(input) {
    if (!state.draft) return;
    ensureExerciseArray();
    const exercise = state.draft.exercises.find((item) => item.id === input.dataset.exerciseId);
    if (!exercise) return;
    exercise[input.dataset.exerciseField] = input.value;
    saveDraftDebounced();
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
    renderExerciseList();
    dom.rounds.value = state.draft.rounds ?? "";
    dom.roundDuration.value = state.draft.roundDuration ?? "";
    dom.technicalFocus.value = state.draft.technicalFocus || "";
    dom.otherType.value = state.draft.otherType || "";
    dom.otherRounds.value = state.draft.otherRounds ?? "";
    dom.otherRoundDuration.value = state.draft.otherRoundDuration ?? "";
    dom.otherFocus.value = state.draft.otherFocus || "";
    dom.notes.value = state.draft.notes || "";

    setChipSelection("rpe", state.draft.rpe);
    setChipSelection("fatigue", state.draft.fatigue);
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

  function timeMinusMinutes(timeValue, minutesToSubtract) {
    const endMinutes = minutesFromTime(timeValue);
    const duration = Number(minutesToSubtract);
    if (endMinutes === null || !Number.isFinite(duration) || duration <= 0) return "";
    const dayMinutes = 24 * 60;
    const result = ((endMinutes - Math.round(duration)) % dayMinutes + dayMinutes) % dayMinutes;
    return `${pad2(Math.floor(result / 60))}:${pad2(result % 60)}`;
  }

  function updateCompletionSummary() {
    if (!state.activeSession || !state.draft) return;
    const label = getModalityLabel();
    const duration = Number(state.draft.duration);
    const durationText = Number.isFinite(duration) && duration > 0 ? `${duration} min` : "duração a informar";
    const timeText = state.draft.startTime && state.draft.endTime
      ? ` · ${state.draft.startTime} → ${state.draft.endTime}`
      : "";
    dom.completionSummary.textContent = `${label}${timeText} · ${durationText}`;
  }

  function syncDraftFromFields() {
    if (!state.draft) return;

    state.draft.dateISO = dom.workoutDate.value;
    state.draft.startTime = dom.startTimeInput.value;
    state.draft.endTime = dom.endTimeInput.value;
    state.draft.duration = dom.durationMinutes.value === "" ? "" : Number(dom.durationMinutes.value);
    state.draft.painLocation = dom.painLocation.value.trim();
    state.draft.strengthSessionName = dom.strengthSessionName.value.trim();
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

  function onDurationChanged() {
    if (!state.draft) return;
    const duration = Number(dom.durationMinutes.value);
    if (Number.isFinite(duration) && duration > 0 && minutesFromTime(dom.endTimeInput.value) !== null) {
      dom.startTimeInput.value = timeMinusMinutes(dom.endTimeInput.value, duration);
    }
    syncDraftFromFields();
  }

  function onTimingChanged() {
    if (!state.draft) return;
    const start = dom.startTimeInput.value;
    const end = dom.endTimeInput.value;
    if (minutesFromTime(start) !== null && minutesFromTime(end) !== null) {
      const computed = durationFromTimes(start, end);
      if (computed !== null) dom.durationMinutes.value = String(computed);
    } else if (minutesFromTime(end) !== null && Number(dom.durationMinutes.value) > 0) {
      dom.startTimeInput.value = timeMinusMinutes(end, dom.durationMinutes.value);
    }
    syncDraftFromFields();
  }

  function clearValidationState() {
    dom.validationMessage.hidden = true;
    dom.validationMessage.textContent = "";
    [dom.workoutDate, dom.startTimeInput, dom.endTimeInput, dom.durationMinutes, dom.rounds, dom.roundDuration, dom.otherRounds, dom.otherRoundDuration].forEach((input) => {
      if (input) input.removeAttribute("aria-invalid");
    });
    dom.rpeFieldset.classList.remove("has-error");
    dom.fatigueFieldset.classList.remove("has-error");
    dom.painFieldset.classList.remove("has-error");
    dom.exerciseList?.querySelectorAll('[aria-invalid="true"]').forEach((input) => input.removeAttribute("aria-invalid"));
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

    const fatigue = Number(state.draft.fatigue);
    if (state.draft.fatigue === null || state.draft.fatigue === "" || !Number.isInteger(fatigue) || fatigue < 0 || fatigue > 10) {
      errors.push("Selecione o Cansaço Pós Treino de 0 a 10.");
      dom.fatigueFieldset.classList.add("has-error");
    }

    const pain = Number(state.draft.pain);
    if (state.draft.pain === null || state.draft.pain === "" || !Number.isInteger(pain) || pain < 0 || pain > 10) {
      errors.push("Selecione Dor / Desconforto de 0 a 10.");
      dom.painFieldset.classList.add("has-error");
    }

    if (state.activeSession.modality === "Musculação") {
      ensureExerciseArray();
      state.draft.exercises.forEach((exercise, index) => {
        if (exercise.loadKg === "" || exercise.loadKg === null || exercise.loadKg === undefined) return;
        const number = Number(exercise.loadKg);
        if (!Number.isFinite(number) || number < 0) {
          errors.push(`Carga do exercício ${index + 1} deve ser um número igual ou maior que zero.`);
          const input = dom.exerciseList.querySelector(`[data-exercise-id="${exercise.id}"][data-exercise-field="loadKg"]`);
          input?.setAttribute("aria-invalid", "true");
        }
      });
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
      ensureExerciseArray();
      const filledExercises = draft.exercises.filter((exercise) =>
        String(exercise.name || "").trim() ||
        (exercise.loadKg !== "" && exercise.loadKg !== null && exercise.loadKg !== undefined) ||
        String(exercise.setsReps || "").trim()
      );
      if (filledExercises.length > 0) {
        lines.push("Exercícios:");
        filledExercises.forEach((exercise, index) => {
          const parts = [String(exercise.name || "").trim() || `Exercício ${index + 1}`];
          if (exercise.loadKg !== "" && exercise.loadKg !== null && exercise.loadKg !== undefined) {
            parts.push(`${formatNumberBr(exercise.loadKg)} kg`);
          }
          if (String(exercise.setsReps || "").trim()) parts.push(String(exercise.setsReps).trim());
          lines.push(`${index + 1}. ${parts.join(" · ")}`);
        });
      }
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
      `Cansaço Pós Treino: ${draft.fatigue}/10`,
      `Dor / Desconforto: ${draft.pain}/10`
    );

    if (Number(draft.pain) > 0) {
      appendLineIf(lines, "Local da Dor/Desconforto", draft.painLocation);
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
    dom.recordPreview.value = state.draft.message;
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

  function editRecordText() {
    if (!state.draft?.message) return;
    state.draft.stage = "preview";
    saveDraft();
    renderPreview();
    window.setTimeout(() => dom.recordPreview.focus(), 50);
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
    if (state.draft && dom.recordPreview && !dom.previewScreen.hidden) {
      state.draft.message = dom.recordPreview.value;
      saveDraft();
    }
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

    if (["rpe", "fatigue", "pain"].includes(group)) {
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
        dom.registerWorkoutButton.disabled = state.customModality.length === 0;
      }
    });

    dom.registerWorkoutButton.addEventListener("click", registerWorkout);
    dom.cancelRegistrationButton.addEventListener("click", cancelRegistration);
    dom.addExerciseButton.addEventListener("click", addExercise);
    dom.exerciseList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-exercise]");
      if (button) removeExercise(button.dataset.removeExercise);
    });
    dom.exerciseList.addEventListener("input", (event) => {
      const input = event.target.closest("[data-exercise-field]");
      if (input) updateExerciseFromInput(input);
    });

    dom.completionForm.addEventListener("click", (event) => {
      const button = event.target.closest("[data-group]");
      if (button && dom.completionForm.contains(button)) handleChipClick(button);
    });

    dom.completionForm.addEventListener("input", (event) => {
      if (event.target === dom.durationMinutes) {
        onDurationChanged();
        return;
      }
      if ([dom.startTimeInput, dom.endTimeInput].includes(event.target)) return;
      if (event.target.closest("[data-exercise-field]")) return;
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
    dom.recordPreview.addEventListener("input", () => {
      if (!state.draft) return;
      state.draft.message = dom.recordPreview.value;
      saveDraft();
    });

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
    dom.editPreparedButton.addEventListener("click", editRecordText);
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
      state.draft = createInitialDraft();
      saveDraft();
      renderCompletion();
      announce("Registro restaurado.");
      return;
    }

    if (state.draft.fatigue === undefined) state.draft.fatigue = null;
    ensureExerciseArray();

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

    state.draft.stage = "completion";
    saveDraft();
    renderCompletion();
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
