# Handoff: UTI Evolve — Redesign (Beira-leito, Visão Geral, Tabela Clínica, Metas)

## Overview
UX redesign for **UTI Evolve** (`uti-evolve.vercel.app`, repo `viniciuquincas-create/uti-evolve`), a single-file React app (`src/App.jsx`) used at the bedside in an ICU. The redesign targets four areas: faster/less-ambiguous data entry at the bedside (Beira-leito), a decision-oriented overview (Visão Geral / "Geral"), trend-aware clinical tables (Tabela Clínica), and a faster team-goals workflow (Metas & Pendências) — plus a few cross-cutting shell changes (dark theme, header, floating panel).

## About the Design Files
The file `wireframes/UTI Evolve Wireframes.dc.html` contains **low-fidelity wireframes** — sketchy, black-and-white-first layout explorations with placeholder colors, built and refined turn-by-turn against the real `App.jsx` source (component names, field names, and business logic below are taken directly from that file, not invented). They are **not production code** and not pixel-perfect. The task is to **recreate the finalized structure/flow described in this README inside the existing `src/App.jsx` React codebase**, reusing its existing components (`PickField`, `SysB`, `MiniBombas`, `DispCard`, `VisaoGeralPanel`, `PlantaoPanel`, `TabelaClinica`, `GasometriaPanel`, `TroponinaPanel`, `CulturasPanel`, `ConfigPanel`, `UploadAnalyzer`, `ProbFloating`, etc.) wherever they already implement the described behavior, and extending them for the new behavior (empty/filled indicators, mode-first conditional fields, etc). Do not treat wireframe colors/fonts as final visual spec — style using the app's existing dark theme (and new light/dark toggle, see below).

Open `wireframes/UTI Evolve Wireframes.dc.html` in a browser to review all explored options; **turn 20 ("PROPOSTA CONSOLIDADA")** at the top of that file is the agreed-on final direction and is what this README documents in full. Earlier turns (1–19) are the design history/rationale — useful for context on why a decision was made, and contain option ids (e.g. `12a`, `9a-9c`) referenced below.

## Fidelity
**Low-fidelity.** Treat all layout/flow/behavior described below as the spec; treat exact colors, fonts, and spacing in the wireframe file as illustrative only — implement using the app's current dark visual language (see Design Tokens) plus the new light/dark toggle.

---

## 1. Shell & Navigation
**Purpose:** App-wide chrome, unchanged in structure from today, with three additions.

- **Header bar** (new): logo mark + "UTI Evolve" / "ASSISTENTE DE EVOLUÇÃO" wordmark, left-aligned; save status + date, right-aligned.
- **Sidebar** (kept as-is): "LEITOS" list of registered patients (each row: leito number, D-day, patient name, weight/height), a **Geral / Metas** toggle above the list (switches the main panel between the Visão Geral cockpit and the global Metas & Pendências panel), and **"Links & Protocolos"** pinned at the bottom.
- **Sidebar is collapsible**: a «/» toggle button collapses it to an icon rail (leito numbers only, Geral/Metas as icon buttons with alert-count badges), freeing width for the main content. Must animate/persist the collapsed state per session.
- **New: ⚙️ Configurações icon**, top-right of the main content area (next to the theme toggle). Opens the existing `ConfigPanel` — no structural change to its 3 sections (Definição de alarmes, Catálogo de dietas, Diluição de drogas), just make sure it's reachable from this icon in every view, not only buried in a tab.
- **New: light/dark theme toggle** (☀️/🌙), placed next to the ⚙️ icon. The app is dark-themed today; add a light theme as an alternative using the same status-color semantics (green/amber/red), just inverted background/text. Persist user choice (localStorage).
- Clicking a leito in the sidebar opens that patient with the existing 5 tabs: **Paciente · Beira-leito · Tabela Clínica · Importar Print · Metas & Pendências**.

## 2. Beira-leito (bedside entry) — the core rework
**Purpose:** Enter/update a full evolution note in 3–5 minutes without leaving the page.

**Block order** (single vertical scroll, matches today's `SysB` order in `App.jsx`): **Dispositivos → Neurológico → Cardiovascular → Respiratório → Renal/Metabólico → TGI/Dieta → Hematológico → Infeccioso.**

### Cross-cutting rules for every system block
- **Empty/filled indicator** (new — does not exist today): a small status dot (green = complete, red = has empty required fields) plus a count like "2 de 5 vazios" in the block header. This is the #1 requested fix — today there's no way to see what's unfilled at a glance.
- Each block keeps its existing **"👁 Texto"** toggle (preview/edit the per-block text before copying) and **"📋 Copiar"** — this per-system text generation (matching Tasy's per-system paste targets) is *kept exactly as today*, only the empty-state indicator is new.
- Blocks that already have a "campos" add-on row (Interconsulta, Exames Compl., POCUS, PiCCO, Swan-Ganz for Neuro/CV; EF livre, DTC, Exames Compl., Psicoativos for Neuro's own "+ campo") keep that exact list — see `adicionaveis` prop usage in `App.jsx` around the Neuro/CV `SysB` blocks.

### Dispositivos (moved from the Paciente tab to the top of Beira-leito)
- Card grid, one card per active device (`DispCard`), same per-device alert thresholds already in `App.jsx`: SVD 14d, PAI 7d, CVC 7d, Diálise 14d, Dreno 21d, TOT/TQT no threshold. Red border + "trocar" label when the threshold is exceeded.

### Neurológico
- RASS, Glasgow, Pupilas as today (`PickField`).
- **New:** dedicated **Motricidade** box and **Dor** box (currently folded into the general EF field — split them out).
- **New:** "+ campo" opens a small chip row to add: **EF livre (exame físico)**, **DTC**, **Exames Compl.**, **Psicoativos** — these become their own fields once added.
- Sedação/Analgesia textareas + bombas (drugs) unchanged.

### Cardiovascular
- **CAMPOS: toggle row** exactly like today's screenshot: `Medicações · Troponina · ΔCO2/ΔPP · Obs · +Interconsulta · +Exames Compl. · +POCUS · +PiCCO · +Swan-Ganz` (toggle chips, first four already exist as fields that can be shown/hidden, last five are the "adicionáveis").
- **Hemodinâmica** field (`PickField`, options from the real app: *Estável sem DVA / Compensado com DVA em queda / Compensado com DVA mantida / Instável com DVA em ascensão* + free text) sits next to **Ausculta cardíaca** (`PickField`: *BNF RCR 2T sem sopros / BHNF RCR 2T / Sopro sistólico / Sopro diastólico / HS audíveis* + free text).
- **Ritmo / Cardioscopia** (`PickField`: *Ritmo sinusal / FA com RVR / FA controlada / Flutter atrial / BAV 1° grau / BAV 2° grau / BCRD / BCRE* + free text) below.
- **EF Cardiovascular (outros)** free-text textarea, unchanged.
- DVA/bombas: see "Drug entry" rule below.

### Respiratório
- **Mode-first conditional fields** (new interaction pattern): a "Modo de suporte" selector is answered FIRST — *Ar ambiente / Cateter nasal / Máscara simples ou MNR / IOT–VM / TQT–VM* — and only the relevant fields appear below it:
  - Ar ambiente → SatO2
  - Cateter nasal, Máscara simples/MNR → O2 (L/min), SatO2
  - IOT–VM → Modo, VC ou Pins, FiO2, PEEP, DP, Pplatô, Crs, SatO2
  - TQT–VM → same as IOT–VM + dias de TQT, cuff
  - (Note: `App.jsx` actually defines a richer mode list under `MODOS_VM`/similar — Ar ambiente, Cateter Nasal, Máscara Simples, Máscara Não Reinalante, Máscara Venturi, CNAF, VNI, VM-PSV, VM-PCV, VM-VCV, VM-APRV. Use the real list from the code, mapped to the field sets above by category (O2-only vs VM-full), not the abbreviated 5-option list used in the wireframe.)
- "+ campo" quick-add: **DP / Pplatô / Crs**, **POCUS**, **Exames Complementares**, "+ outro".
- EF Respiratório free-text field, unchanged.

### Renal/Metabólico
- Calculated read-only stats row: **Diurese 24h (mL/kg/h)**, **Balanço hídrico**, **TFG** — computed from Controles 24h data already entered, never typed here.
- **Método** field: *sem TRS* vs a dialysis modality. **When método ≠ "sem TRS"**, reveal TRS-specific fields: **última sessão** (datetime), **modalidade** (e.g. CVVHDF), **UF** (mL/h), **tolerância** (chip: bem tolerada / hipotensão / etc).
- **New: "Em uso de ATB?" indicator**, read-only, pulled from the Infeccioso block (e.g. "sim — Piperacilina D5") — surfaces the cross-system dependency relevant to renal dosing.
- EF Renal free-text field.

### TGI + Dieta (merged into one block — today TGI and Dieta are separate; combine them)
- **Via** field (`DietaPanel.tipo`): VO / Enteral / NPT / Mista / Jejum.
- Fields conditional on Via, same logic as today's `DietaPanel`: Enteral/NPT show **Fórmula** (the app's catalog of ~7 preset formulas, `DROGAS_PROTOCOLO`-style catalog under Config), **Vazão (mL/h)**; VO/Jejum skip straight to Observações.
- **Live calculated** `kcal/kg/d` and `ptn/kg/d` (already computed elsewhere in the app via `nutriHoje.kcal/peso` etc — surface it directly in this block instead of only in the meta comparison).
- **Abdome** field (`PickField`), and **Última evacuação** as a **date field** (not a present/absent toggle — this was an explicit correction mid-design).
- **New: Profilaxia de lesão de mucosa gástrica** field: *Sem profilaxia / Omeprazol 40mg/d / Omeprazol 80mg/d / Esomeprazol*.
- Obs/EF TGI free text.
- "+ campo": POCUS, Exames Compl.

### Hematológico
- Labs summary (Hb, Plaquetas, etc, pulled from Tabela Clínica).
- **Temperatura is read-only here**, pulled from the Controles 24h table (do not duplicate manual entry).
- "+ Interconsulta" quick-add (existing `adicionaveis` pattern).

### Infeccioso
- ATB entries: **D-day is fully automatic** — computed from `dataInicio` + `horaInicio`, incrementing every 24h (existing `diasAtb24h` function) — never typed/selected.
- **New: dose-adjustment suggestion** inline per ATB, using the existing `atbAjusteRenal`/`ATB_RENAL` clearance-based logic (e.g. "⚠ ClCr 42 → sugestão: espaçar para q8h") with quick actions "Aplicar sugestão" / "Manter dose atual".
- **Culturas shown inline** (germe + resistência/sensível summary), with a small "editar na Tabela Clínica" link to the full Culturas tab — don't just link out with no data, and don't duplicate full editing here.
- Profilaxia field, unchanged.

### Drug/pump entry rule (applies to CV, Neuro sedation/analgesia, any vasoactive/sedative drug)
- The clinician only ever types the **vazão (mL/h)**. Dilution/concentration are the protocol's **standard preset per drug** (`DROGAS_PROTOCOLO`, already in `App.jsx` with `diluicaoDesc`/`concMcgML` per drug) — not re-entered. Dose (mcg/kg/min, UI/min, mg/kg/h, etc, per drug's `modoCalc`) is the **calculated output**, shown next to the vazão field, along with the existing `doseInfo` reference range/alert text.
- Multiple drugs can be active per block; each renders as a compact inline chip (drug name, vazão, calculated dose) — not a full form per drug.

### Impressão (redesigned)
- **This field is purely manual free text** — remove the "⚡ Gerar" auto-summary behavior (it doesn't reflect what the doctor actually wants here, which is their own clinical impression, not a recap of entered fields). Keep the textarea, keep it always the last line of the generated Tasy text, keep "📋 Copiar".

### Floating panel — Problemas Ativos + Metas
- Keep the existing `ProbFloating` component and its numbered free-text "🔴 Problemas Ativos" field.
- **New:** the panel (and its Metas checklist) must be visible across **all 5 patient tabs**, not just Beira-leito.
- **New:** add a minimize control — collapses to a small pill (icon + pending count) that re-expands on click.
- **New:** each meta row in the floating panel gets a "✕" to delete it directly, in addition to the existing checkbox-to-complete.
- Existing mobile behavior (becomes a static, non-floating block at the top of the page below 700px) is unchanged.

---

## 3. Visão Geral ("Geral" in the sidebar)
**Purpose:** identify critical patients and required actions within seconds.

- **Alerts banner**, top of panel: computed alerts only (ATB needing dose adjustment by ClCr, rising lactate over ≥3 measurements, overdue team goals, D-day thresholds exceeded per `config.alerta*` settings) — reuses the existing `getAutoAlerts`-style logic already in `App.jsx`. Each alert is a link.
- **Rows in bed order** (physical leito order, per explicit user decision — NOT sorted by severity; color already communicates severity).
- **Columns = the 6 systems** (Neuro, CV, Resp, Renal, Hema, Infec) plus a **Metas** column. A column only renders content when that system actually **has data** (reuse existing `hasNeuro`/`hasCardio`/`hasResp`/`hasRenal`/`hasHema`/`hasInf`/`hasTgi` flags) — otherwise show a plain "—", not styled as an alert. Each populated cell shows **2–3 lines** of real summary (not just one value) — screen only needs to support ~5 concurrent patients, so this density is fine.
- Cell **left-border color** = status (green ok / amber attention / red alert-calculated).
- **Metas column**: small "🎯 N ▸" affordance per row, opens that leito's goals list for direct editing without leaving Visão Geral.
- **Clicking an alert** opens a side drawer scoped to that leito + block, with the specific field already focused/highlighted and quick actions (e.g. "Aplicar sugestão" / "Manter dose atual").

## 4. Tabela Clínica
**Purpose:** same data entry as today, with trend legibility added — **structure and all header controls (Adicionar dia, Novo exame, Manual, Aplicar na evolução, and the Exames Laboratoriais/Controles 24h + Laboratório/Gasometrias/Troponina/Culturas tabs) are unchanged.**

- **Laboratório tab**: keep the existing date-columns × parameter-rows matrix. **Only the font color of the number changes** when a value is altered (amber = mild, red+bold = important or fast-worsening trend) — do **not** tint cell backgrounds; keep the background neutral so the view doesn't look "hot" everywhere.
- **Gasometrias tab**: keep the existing row-per-entry structure (date+hora, `pH/HCO3/pCO2/pO2/BE/SatO2` inline, "▲ mais" expands `Na/K/Ca/Cl/Glic/Lact/Hb`, "+ Gaso" adds a new entry). Same font-color-only rule for altered values; the row border goes red only when there's a clinically important alteration (e.g. lactate spike).
- **Troponina tab**: keep the existing row-per-measurement structure ("+ Troponina" adds one). Font-color-only for altered values; highlight the peak value distinctly (e.g. "1200 ↑↑ (pico)").
- **Culturas tab**: keep the existing status set (**Aguardando / Negativa / Parcial / Resistente / Sensível**) and the existing "Resultado / germe / resistência" field plus per-germe rows (nome, UFC/mL, resistência, sensível a).
- **Reference ranges do not exist in the codebase today** — defining per-exam normal ranges/thresholds (for the font-color logic above) is new work required for this feature, not a port of existing logic.
- **Fixed cross-system links (do not remove)**: Gasometria feeds the Respiratório block's summary; Troponina feeds Cardiovascular's; Culturas feed Infeccioso's — same as Controles 24h feeding Renal (diurese/BH/TFG) etc. These already exist in `App.jsx`'s `txtResFull`/`txtCvFull`/`txtInFull`-style aggregation functions; the redesign must not break them.

## 5. Página do Paciente
- Fields: **Diagnóstico**, **Data Internação**, **Idade (anos)** — **entered directly as a number, replacing the Data Nascimento field** (this was an explicit change: no more birthdate, just age).
- Peso (kg), Altura (cm), Sexo — unchanged.
- Calculated pills (read-only): **dias de internação**, **peso predito (ARDSNet)**. (Note: since idade is now direct-entry instead of derived from birthdate, the age pill is removed — age is the input, not a calculation.)
- Balanço Hídrico Prévio, unchanged.
- Procedimentos panel, unchanged.
- **Dispositivos removed from this tab** — moved to the top of Beira-leito (see above).

## 6. Metas & Pendências (global panel, opened via sidebar "Metas" toggle)
- **Leitos rendered as a grid of blocks** (2 columns), not a vertical list — each block = one leito's goals.
- Team filter chips, using the app's real team list/colors: **Enfermagem** (🩺 blue `#38bdf8`), **Nutrição** (🥗 lime `#a3e635`), **Fisioterapia** (🫁 amber `#f59e0b`), **Fonoaudiologia** (🗣️ purple `#a78bfa`), **Médica** (⚕️ red `#f87171`) — plus a status filter (Pendentes / Todas).
- **Each leito block can add ("+ meta") and delete ("✕") goals independently** — this must work for any patient's block directly from this screen, not require opening that patient.
- Auto-suggested goals surfaced inline (e.g. "Meta de diurese ≥0,5 mL/kg/h" suggested from the Renal block's TFG) — flagged distinctly from manually-added goals (e.g. a ⚡ prefix).
- **New: 🖨️ Imprimir button** — generates a **printable A4, landscape, black-and-white** sheet: one bordered block per leito (name, empty checkboxes, goal text) so the goals can be checked off by hand by nursing during the shift. No color in the print output. This is a genuinely new capability (today's `PlantaoPanel` only supports "Copiar [equipe] para Tasy" as text, no print view) — the "copy to Tasy" text button from today should be removed/replaced per this redesign; the print button is the new primary output for this screen.

## 7. Importar Print
- Keep the existing **image upload/paste flow** (`UploadAnalyzer` — drag/drop, Ctrl+V paste, file picker; posts to `/api/analyze.js`), with the existing description copy ("Faça upload do print do Tasy. A IA extrai os dados e você revisa antes de aplicar na evolução.").
- After extraction, show results **grouped by system** (Respiratório, Renal/Metabólico, Hematológico/Infeccioso, etc, matching the existing `extrair()` categorization) as editable chips for review before applying; fields the AI didn't recognize render as empty/dashed placeholders for manual entry rather than being silently dropped.
- **Keep the existing "Manual" quick-paste rows** exactly as implemented today: a single-line "Labs aqui..." input with a "→" submit (parses via `parsearLabsTexto`, feeds the Tabela Clínica) and a single-line "Controles aqui..." input with a "→" submit (parses via `parsearControlesTexto`, feeds Controles 24h) — do not replace these with the image-upload flow; they should coexist as a faster manual alternative.

---

## Interactions & Behavior summary
- Mode/via-first fields (Respiratório, TGI/Dieta, Renal TRS): selecting the mode swaps the field set below it immediately, no page reload.
- Drug vazão entry recalculates dose live as the clinician types.
- Empty/filled indicators recompute live as fields are edited.
- Visão Geral alert click → opens a drawer/panel (not full navigation), pre-scrolled/focused to the relevant field.
- Floating panel: minimize/expand is a simple toggle, state does not need to persist across reloads (nice-to-have if trivial).
- Print button: triggers the browser print dialog scoped to a print-only stylesheet/view (A4 landscape, forced grayscale/black-and-white).
- Theme toggle: persists to localStorage; applies globally, does not require reload.

## State Management
- Empty/filled status per block: derive from existing field state (no new source of truth — a field is "empty" if its bound value is falsy/blank), computed per render.
- Mode-first fields: one new state key per block (e.g. `respModo`, `dietaVia`, `renalMetodo`) gating which sub-fields render; existing field state for the sub-fields themselves is unchanged.
- Dose-from-vazão calculation: pure function of (vazão, drug's fixed dilution/concentration, peso, modoCalc) — same shape as the existing `calcDoseFromMLH` already in `App.jsx`, just make sure UI never shows/edits concentration directly.
- Theme (light/dark) and sidebar collapsed/expanded: local UI state, persisted to localStorage.
- Floating panel minimized/expanded: local UI state (per session is fine).

## Design Tokens
The app's current visual language is a **dark theme** (near-black backgrounds, light gray/blue text, accent blues/purples per section — see `T.bg*`/`T.text*`/`T.accent` theme object already in `App.jsx`). Reuse those tokens for the dark theme; introduce a parallel light theme using the same relative structure (surfaces get a warm off-white instead of near-black, text goes dark, accents keep the same hues at adjusted lightness) so the same components work in both themes via the existing theme-object pattern.

Status colors (used consistently across Beira-leito indicators, Visão Geral, Tabela Clínica trend coloring): green (stable/normal), amber (attention/mild alteration), red (alert/important alteration) — these three semantic colors should map to a single shared token set used everywhere, not be redefined per screen.

Team colors (Metas & Pendências, must match exactly): Enfermagem `#38bdf8`, Nutrição `#a3e635`, Fisioterapia `#f59e0b`, Fonoaudiologia `#a78bfa`, Médica `#f87171`.

## Assets
No new icon/image assets — all iconography in the designs is emoji, matching the app's existing convention (🫁 🩺 🎯 ⚙️ etc). No externally sourced assets used.

## Files
- `wireframes/UTI Evolve Wireframes.dc.html` — full wireframe history + consolidated proposal (turn 20, top of file). Open in a browser; each option has a stable id (e.g. `12a`, `9a`) referenced throughout this README.
- Source app to modify: `src/App.jsx` in `viniciuquincas-create/uti-evolve` (see component names referenced throughout this doc — `PickField`, `SysB`, `DispCard`, `DietaPanel`, `AntibioticosPanel`, `VisaoGeralPanel`, `PlantaoPanel`, `TabelaClinica`, `GasometriaPanel`, `TroponinaPanel`, `CulturasPanel`, `ConfigPanel`, `UploadAnalyzer`, `ProbFloating`, `MiniBombas`).
