// Lettura ad alta voce con righello: usa la sintesi vocale del telefono,
// gratuita e senza rete. La frase letta viene evidenziata da una fascia.

const LEGGIBILI = "h1, h2, h3, p, li, dt, dd, legend, .opzione, .fronte, .retro";
const CHIAVE_VELOCITA = "ripasso.velocita";
const VELOCITA = [0.7, 0.85, 1, 1.2];

let frasi = [];
let posizione = 0;
let attivo = false;
let righelloLibero = false;
let corrente = null;
let area = null;

const sintesi = window.speechSynthesis;
const fascia = document.createElement("div");
fascia.id = "righello";
fascia.hidden = true;
document.body.append(fascia);

function velocita() {
  try {
    const v = parseFloat(localStorage.getItem(CHIAVE_VELOCITA));
    return VELOCITA.includes(v) ? v : 0.85;
  } catch {
    return 0.85;
  }
}

function voceItaliana() {
  const voci = sintesi?.getVoices() || [];
  return voci.find((v) => v.lang === "it-IT" && v.localService) || voci.find((v) => v.lang?.startsWith("it")) || null;
}

function visibile(el) {
  return el.offsetParent !== null && !el.closest("[hidden], .barra, #lettore, .nota, .indietro, .schede-nav");
}

// Divide il testo degli elementi leggibili in frasi, ognuna dentro uno <span class="frase">.
function prepara() {
  for (const el of area.querySelectorAll(LEGGIBILI)) {
    if (el.dataset.frasi || !visibile(el)) continue;
    el.dataset.frasi = "1";
    const nodi = [];
    const giro = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (giro.nextNode()) {
      const n = giro.currentNode;
      if (n.textContent.trim() && !n.parentElement.closest(".frase, button, input, select, textarea")) nodi.push(n);
    }
    for (const n of nodi) {
      const pezzi = [];
      for (const pezzo of n.textContent.match(/[^.!?…]+[.!?…]*\s*|\s+/g) || []) {
        // Numeri come "1." o "3,5." restano attaccati alla frase che segue.
        if (pezzi.length && /^\s*\d+[.,]?\d*\.\s*$/.test(pezzi[pezzi.length - 1])) pezzi[pezzi.length - 1] += pezzo;
        else pezzi.push(pezzo);
      }
      const insieme = document.createDocumentFragment();
      for (const pezzo of pezzi) {
        if (!pezzo.trim()) { insieme.append(pezzo); continue; }
        const s = document.createElement("span");
        s.className = "frase";
        s.textContent = pezzo;
        insieme.append(s);
      }
      n.replaceWith(insieme);
    }
  }
  frasi = [...area.querySelectorAll(".frase")].filter(visibile);
}

function posiziona(el) {
  if (!el) { fascia.hidden = !righelloLibero; return; }
  const r = el.getBoundingClientRect();
  fascia.hidden = false;
  fascia.style.top = `${r.top - 6}px`;
  fascia.style.height = `${r.height + 12}px`;
}

function evidenzia(el) {
  corrente?.classList.remove("letta");
  corrente = el;
  if (!el) { posiziona(null); return; }
  el.classList.add("letta");
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  posiziona(el);
  setTimeout(() => corrente === el && posiziona(el), 350);
}

function leggi() {
  if (!attivo) return;
  if (posizione >= frasi.length) { ferma(); return; }
  const el = frasi[posizione];
  evidenzia(el);
  const u = new SpeechSynthesisUtterance(el.textContent.replace(/\p{Extended_Pictographic}/gu, "").trim());
  u.lang = "it-IT";
  u.rate = velocita();
  const voce = voceItaliana();
  if (voce) u.voice = voce;
  u.onend = () => {
    if (!attivo || frasi[posizione] !== el) return;
    posizione++;
    leggi();
  };
  u.onerror = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled") ferma();
  };
  sintesi.speak(u);
}

function avvia(da = posizione) {
  prepara();
  if (!frasi.length) return;
  attivo = true;
  posizione = Math.max(0, Math.min(da, frasi.length - 1));
  sintesi.cancel();
  leggi();
  aggiornaBarra();
}

function pausa() {
  attivo = false;
  sintesi.cancel();
  aggiornaBarra();
}

function ferma() {
  attivo = false;
  sintesi?.cancel();
  posizione = 0;
  evidenzia(null);
  aggiornaBarra();
}

function aggiornaBarra() {
  const barra = document.getElementById("lettore");
  if (!barra) return;
  barra.querySelector("[data-azione=leggi]").innerHTML = attivo ? "⏸ Pausa" : posizione ? "▶ Riprendi" : "🔊 Ascolta";
  barra.querySelector("[data-azione=velocita]").textContent = `${String(velocita()).replace(".", ",")}×`;
  barra.querySelector("[data-azione=righello]").classList.toggle("attiva", righelloLibero);
}

// Mostra la barra di lettura sopra il menu, per leggere il contenuto di "contenitore".
export function mostraLettore(contenitore) {
  ferma();
  area = contenitore;
  document.getElementById("lettore")?.remove();
  const barra = document.createElement("div");
  barra.id = "lettore";
  barra.setAttribute("role", "toolbar");
  barra.setAttribute("aria-label", "Lettura ad alta voce");
  barra.innerHTML = `
    <button type="button" data-azione="leggi"></button>
    <button type="button" data-azione="ferma" aria-label="Ferma">⏹</button>
    <button type="button" data-azione="velocita" aria-label="Velocità della voce"></button>
    <button type="button" data-azione="righello">📏 Righello</button>`;
  document.body.append(barra);
  document.body.classList.add("con-lettore");
  if (!sintesi) barra.querySelector("[data-azione=leggi]").disabled = true;
  barra.addEventListener("click", (e) => {
    const azione = e.target.closest("button")?.dataset.azione;
    if (azione === "leggi") attivo ? pausa() : avvia();
    if (azione === "ferma") ferma();
    if (azione === "velocita") {
      const prossima = VELOCITA[(VELOCITA.indexOf(velocita()) + 1) % VELOCITA.length];
      try { localStorage.setItem(CHIAVE_VELOCITA, prossima); } catch {}
      aggiornaBarra();
      if (attivo) avvia(posizione);
    }
    if (azione === "righello") {
      righelloLibero = !righelloLibero;
      if (!righelloLibero && !corrente) fascia.hidden = true;
      aggiornaBarra();
    }
  });
  aggiornaBarra();
}

export function nascondiLettore() {
  ferma();
  area = null;
  document.getElementById("lettore")?.remove();
  document.body.classList.remove("con-lettore");
  fascia.hidden = true;
}

// Durante la lettura, toccare una frase fa ripartire la voce da lì.
document.addEventListener("click", (e) => {
  const frase = e.target.closest?.(".frase");
  if (!frase || !area?.contains(frase) || (!attivo && !posizione)) return;
  if (frase.closest("label, button, a")) return;
  prepara();
  const i = frasi.indexOf(frase);
  if (i >= 0) avvia(i);
});

// Righello libero: la fascia segue il dito o il mouse.
const segui = (y) => {
  if (!righelloLibero || attivo) return;
  fascia.hidden = false;
  fascia.style.top = `${y - 26}px`;
  fascia.style.height = "52px";
};
addEventListener("pointermove", (e) => segui(e.clientY), { passive: true });
addEventListener("pointerdown", (e) => segui(e.clientY), { passive: true });
addEventListener("touchmove", (e) => segui(e.touches[0].clientY), { passive: true });
addEventListener("scroll", () => corrente && posiziona(corrente), { passive: true });
addEventListener("resize", () => corrente && posiziona(corrente));
sintesi?.addEventListener?.("voiceschanged", () => {});
