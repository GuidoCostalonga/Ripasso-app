// Interfaccia: pagine, navigazione e interazioni.
import * as db from "./store.js";
import { creaLezione, correggiRisposta, MODELLI } from "./ai.js";

const CLASSI = [
  "prima elementare", "seconda elementare", "terza elementare", "quarta elementare", "quinta elementare",
  "prima media", "seconda media", "terza media",
  "prima superiore", "seconda superiore", "terza superiore", "quarta superiore", "quinta superiore",
];

const radice = document.getElementById("pagina");

const AVVISO_IA = "Le schede e le correzioni sono preparate da un'intelligenza artificiale: possono contenere errori. Controllale sempre con il libro.";

function esc(testo) {
  return String(testo ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function dataEstesa(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function avviso(testo, tipo = "errore") {
  return `<div class="avviso ${tipo}" role="status">${esc(testo)}</div>`;
}

function vai(percorso) {
  location.hash = percorso;
}

// ---------- Pagine ----------

function paginaBenvenuto() {
  radice.innerHTML = `
    <section class="carta">
      <h1>Benvenuti in Ripasso</h1>
      <p>Fotografate la lezione del giorno: l'app prepara la scheda riassuntiva, le domande di verifica e le schede da ripetere nei giorni successivi.</p>
      <h2>Chi studia?</h2>
      ${moduloProfilo()}
    </section>`;
  collegaModuloProfilo();
}

function moduloProfilo() {
  return `
    <form id="nuovo-profilo" class="modulo">
      <label>Nome <input name="nome" required maxlength="30" autocomplete="off"></label>
      <label>Classe
        <select name="classe">${CLASSI.map((c) => `<option>${c}</option>`).join("")}</select>
      </label>
      <button class="primario">Aggiungi</button>
    </form>`;
}

function collegaModuloProfilo() {
  document.getElementById("nuovo-profilo").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const p = db.aggiungiProfilo(f.get("nome").trim(), f.get("classe"));
    db.scegliProfilo(p.id);
    mostra();
  });
}

function paginaHome(profilo) {
  const profili = db.tutti().profili;
  const lezioni = db.lezioniDi(profilo.id);
  const daRipassare = db.schedeDaRipassare(profilo.id).length;
  radice.innerHTML = `
    <div class="profili" role="tablist">
      ${profili.map((p) => `<button class="pillola ${p.id === profilo.id ? "attiva" : ""}" data-profilo="${p.id}">${esc(p.nome)}</button>`).join("")}
    </div>
    <section class="carta evidenza">
      <h1>Ciao ${esc(profilo.nome)}!</h1>
      ${daRipassare
        ? `<p>Oggi hai <strong>${daRipassare}</strong> ${daRipassare === 1 ? "scheda" : "schede"} da ripassare.</p>
           <a class="pulsante primario" href="#/ripasso">Inizia il ripasso</a>`
        : `<p>Per oggi il ripasso è finito. Ottimo lavoro!</p>`}
    </section>
    <a class="pulsante grande" href="#/nuova">📷 Nuova lezione</a>
    <h2>Le tue lezioni</h2>
    ${lezioni.length ? `<ul class="elenco">${lezioni.map((l) => `
      <li><a href="#/lezione/${l.id}">
        <span class="materia">${esc(l.materia)}</span>
        <strong>${esc(l.titolo)}</strong>
        <small>${dataEstesa(l.data)}</small>
      </a></li>`).join("")}</ul>`
      : `<p class="vuoto">Ancora nessuna lezione. Fotografa la prima!</p>`}`;
  radice.querySelectorAll("[data-profilo]").forEach((b) =>
    b.addEventListener("click", () => { db.scegliProfilo(b.dataset.profilo); mostra(); })
  );
}

function paginaNuova(profilo) {
  if (!db.chiaveApi()) {
    radice.innerHTML = `<section class="carta">${avviso("Prima di iniziare serve la chiave di accesso a Claude.", "info")}
      <a class="pulsante primario" href="#/impostazioni">Vai alle impostazioni</a></section>`;
    return;
  }
  radice.innerHTML = `
    <section class="carta">
      <h1>Nuova lezione</h1>
      <p>Per <strong>${esc(profilo.nome)}</strong>, ${esc(profilo.classe)}.</p>
      <form id="nuova" class="modulo">
        <label class="carica">
          <span>📷 Scatta o scegli le foto (fino a 6 pagine)</span>
          <input type="file" name="foto" accept="image/*" capture="environment" multiple required>
        </label>
        <div id="anteprime" class="anteprime"></div>
        <label>Materia (facoltativa) <input name="materia" maxlength="40" placeholder="per esempio Storia"></label>
        <button class="primario">Prepara il ripasso</button>
      </form>
      <p class="nota">🤖 ${AVVISO_IA}</p>
      <div id="esito"></div>
    </section>`;
  const modulo = document.getElementById("nuova");
  const input = modulo.foto;
  let immagini = [];
  input.addEventListener("change", async () => {
    const file = [...input.files].slice(0, 6);
    immagini = await Promise.all(file.map(riduci));
    document.getElementById("anteprime").innerHTML = immagini.map((d) => `<img alt="" src="data:image/jpeg;base64,${d}">`).join("");
  });
  modulo.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!immagini.length) return;
    const esito = document.getElementById("esito");
    const pulsante = modulo.querySelector("button");
    pulsante.disabled = true;
    esito.innerHTML = `<div class="attesa"><span class="rotella"></span> Sto leggendo la lezione e preparo il ripasso. Ci vuole circa un minuto.</div>`;
    try {
      const contenuto = await creaLezione(db.chiaveApi(), db.modello(), immagini, profilo.classe, modulo.materia.value.trim());
      if (!contenuto.leggibile) {
        esito.innerHTML = avviso(contenuto.avviso || "Le foto non si leggono bene. Riprova con più luce e la pagina dritta.");
        pulsante.disabled = false;
        return;
      }
      const l = db.aggiungiLezione(profilo.id, contenuto);
      vai(`#/lezione/${l.id}`);
    } catch (errore) {
      esito.innerHTML = avviso(errore.message);
      pulsante.disabled = false;
    }
  });
}

// Riduce la foto a 1568 pixel sul lato lungo: basta per leggere e costa meno.
function riduci(file) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const scala = Math.min(1, 1568 / Math.max(img.width, img.height));
      const tela = document.createElement("canvas");
      tela.width = Math.round(img.width * scala);
      tela.height = Math.round(img.height * scala);
      tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
      URL.revokeObjectURL(img.src);
      ok(tela.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = ko;
    img.src = URL.createObjectURL(file);
  });
}

function paginaLezione(profilo, lid, scheda = "scheda") {
  const l = db.lezione(lid);
  if (!l) return vai("#/");
  const schede = { scheda: "Scheda", verifica: "Verifica", aperte: "Domande aperte", ripeti: "Da ripetere" };
  radice.innerHTML = `
    <a class="indietro" href="#/">← Lezioni</a>
    <header class="intestazione">
      <span class="materia">${esc(l.materia)}</span>
      <h1>${esc(l.titolo)}</h1>
      <small>${dataEstesa(l.data)}</small>
    </header>
    ${l.avviso ? avviso(l.avviso, "info") : ""}
    <p class="nota">🤖 ${AVVISO_IA}</p>
    <nav class="schede-nav">${Object.entries(schede).map(([k, v]) =>
      `<a class="${k === scheda ? "attiva" : ""}" href="#/lezione/${l.id}/${k}">${v}</a>`).join("")}</nav>
    <div id="contenuto"></div>
    <button class="testo pericolo" id="elimina">Elimina questa lezione</button>`;
  const contenuto = document.getElementById("contenuto");
  ({ scheda: vistaScheda, verifica: vistaVerifica, aperte: vistaAperte, ripeti: vistaRipeti })[scheda](contenuto, l, profilo);
  document.getElementById("elimina").addEventListener("click", () => {
    if (confirm("Eliminare la lezione e tutti i suoi risultati?")) { db.eliminaLezione(l.id); vai("#/"); }
  });
}

function vistaScheda(el, l) {
  el.innerHTML = `
    <section class="carta">
      <h2>In breve</h2>
      ${l.riassunto.map((p) => `<p>${esc(p)}</p>`).join("")}
    </section>
    <section class="carta">
      <h2>Parole chiave</h2>
      <dl class="concetti">${l.concetti.map((c) => `<dt>${esc(c.termine)}</dt><dd>${esc(c.spiegazione)}</dd>`).join("")}</dl>
    </section>`;
}

function vistaVerifica(el, l) {
  const risposte = new Array(l.verifica.length).fill(null);
  el.innerHTML = `
    <form id="verifica" class="carta">
      ${l.verifica.map((d, i) => `
        <fieldset class="domanda" data-i="${i}">
          <legend>${i + 1}. ${esc(d.domanda)}</legend>
          ${d.opzioni.map((o, j) => `<label class="opzione"><input type="radio" name="d${i}" value="${j}"> ${esc(o)}</label>`).join("")}
          <p class="spiegazione" hidden></p>
        </fieldset>`).join("")}
      <button class="primario">Correggi</button>
      <div id="punteggio"></div>
    </form>`;
  const modulo = document.getElementById("verifica");
  modulo.addEventListener("change", (e) => { risposte[+e.target.name.slice(1)] = +e.target.value; });
  modulo.addEventListener("submit", (e) => {
    e.preventDefault();
    if (risposte.includes(null)) {
      document.getElementById("punteggio").innerHTML = avviso("Rispondi a tutte le domande prima di correggere.", "info");
      return;
    }
    const sbagliate = [];
    l.verifica.forEach((d, i) => {
      const box = modulo.querySelector(`[data-i="${i}"]`);
      const giusta = risposte[i] === d.corretta;
      if (!giusta) sbagliate.push(i);
      box.classList.add(giusta ? "giusta" : "sbagliata");
      box.querySelectorAll(".opzione")[d.corretta].classList.add("corretta");
      const sp = box.querySelector(".spiegazione");
      sp.textContent = (giusta ? "✓ Giusto! " : "✗ La risposta giusta è evidenziata. ") + d.spiegazione;
      sp.hidden = false;
      box.querySelectorAll("input").forEach((x) => (x.disabled = true));
    });
    const punti = l.verifica.length - sbagliate.length;
    db.registraVerifica(l.id, punti, l.verifica.length, sbagliate);
    const frase = punti === l.verifica.length ? "Perfetto, tutto giusto!" : punti / l.verifica.length >= 0.6 ? "Bene! Rileggi le spiegazioni delle risposte sbagliate." : "Ripassa la scheda e riprova: ce la fai.";
    modulo.querySelector("button").remove();
    document.getElementById("punteggio").innerHTML = `
      <p class="risultato"><strong>${punti} su ${l.verifica.length}</strong>. ${frase}</p>
      <button type="button" class="pulsante" id="rifai">Rifai la verifica</button>`;
    document.getElementById("rifai").addEventListener("click", () => vistaVerifica(el, l));
    modulo.scrollIntoView({ behavior: "smooth" });
  });
}

function vistaAperte(el, l, profilo) {
  el.innerHTML = l.aperte.map((d, i) => `
    <form class="carta aperta" data-i="${i}">
      <h3>${i + 1}. ${esc(d.domanda)}</h3>
      <textarea name="risposta" rows="4" placeholder="Scrivi la risposta con parole tue" required></textarea>
      <div class="azioni">
        <button class="primario">Correggi</button>
        <button type="button" class="testo" data-mostra>Mostra la traccia</button>
      </div>
      <div class="esito"></div>
    </form>`).join("");
  el.querySelectorAll("form").forEach((f) => {
    const d = l.aperte[+f.dataset.i];
    const esito = f.querySelector(".esito");
    f.querySelector("[data-mostra]").addEventListener("click", () => {
      esito.innerHTML = `<p class="traccia"><strong>Traccia:</strong> ${esc(d.traccia)}</p>`;
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!db.chiaveApi()) { esito.innerHTML = avviso("Serve la chiave di accesso: vai in Impostazioni."); return; }
      const b = f.querySelector(".primario");
      b.disabled = true;
      esito.innerHTML = `<div class="attesa"><span class="rotella"></span> Leggo la tua risposta…</div>`;
      try {
        const c = await correggiRisposta(db.chiaveApi(), db.modello(), profilo.classe, l, d, f.risposta.value.trim());
        const etichetta = { giusta: "✓ Giusta", parziale: "◐ Quasi", da_rivedere: "✗ Da rivedere" }[c.esito];
        esito.innerHTML = `<div class="correzione ${c.esito}"><strong>${etichetta}</strong><p>${esc(c.commento)}</p>
          <p class="traccia"><strong>Una risposta completa:</strong> ${esc(c.risposta_completa)}</p></div>`;
      } catch (errore) {
        esito.innerHTML = avviso(errore.message);
      }
      b.disabled = false;
    });
  });
}

function vistaRipeti(el, l) {
  const elenco = l.schede.map((_, i) => ({ lezione: l, indice: i }));
  giraSchede(el, elenco, false);
}

function paginaRipasso(profilo) {
  const elenco = db.schedeDaRipassare(profilo.id);
  radice.innerHTML = `<a class="indietro" href="#/">← Lezioni</a><h1>Ripasso di oggi</h1><div id="contenuto"></div>`;
  giraSchede(document.getElementById("contenuto"), elenco, true);
}

// Mostra le schede una alla volta. Con "registra" aggiorna il calendario del ripasso.
function giraSchede(el, elenco, registra) {
  let pos = 0;
  let ricordate = 0;
  const disegna = () => {
    if (pos >= elenco.length) {
      el.innerHTML = `<section class="carta evidenza"><h2>Finito!</h2>
        <p>Hai ricordato <strong>${ricordate} su ${elenco.length}</strong>. ${registra ? "Le schede sbagliate tornano domani, le altre più avanti." : ""}</p>
        <a class="pulsante primario" href="#/">Torna alle lezioni</a></section>`;
      return;
    }
    const { lezione, indice } = elenco[pos];
    const s = lezione.schede[indice];
    el.innerHTML = `
      <p class="contatore">${pos + 1} di ${elenco.length} · ${esc(lezione.materia)}</p>
      <button class="carta-girevole" aria-live="polite">
        <span class="fronte">${esc(s.fronte)}</span>
        <span class="retro" hidden>${esc(s.retro)}</span>
        <small>Tocca per girare</small>
      </button>
      <div class="azioni due" hidden>
        <button class="pulsante no">Non me la ricordavo</button>
        <button class="pulsante si">Me la ricordavo</button>
      </div>`;
    const carta = el.querySelector(".carta-girevole");
    carta.addEventListener("click", () => {
      carta.querySelector(".retro").hidden = false;
      carta.querySelector("small").hidden = true;
      el.querySelector(".azioni").hidden = false;
    });
    const rispondi = (ok) => {
      if (ok) ricordate++;
      if (registra) db.registraScheda(lezione.id, indice, ok);
      pos++;
      disegna();
    };
    el.querySelector(".si").addEventListener("click", () => rispondi(true));
    el.querySelector(".no").addEventListener("click", () => rispondi(false));
  };
  if (!elenco.length) {
    el.innerHTML = `<p class="vuoto">Nessuna scheda da ripassare oggi.</p>`;
    return;
  }
  disegna();
}

function paginaGenitori() {
  const { profili } = db.tutti();
  radice.innerHTML = `<h1>Spazio genitori</h1>${profili.map((p) => {
    const lezioni = db.lezioniDi(p.id);
    const esiti = lezioni.flatMap((l) => l.esiti);
    const media = esiti.length ? Math.round((esiti.reduce((a, e) => a + e.punti / e.totale, 0) / esiti.length) * 100) : null;
    const daRipassare = db.schedeDaRipassare(p.id).length;
    const ultimaSettimana = esiti.filter((e) => e.data >= db.aggiungiGiorni(-7)).length;
    const deboli = lezioni.map((l) => {
      const ultimo = l.esiti[l.esiti.length - 1];
      return ultimo && ultimo.punti / ultimo.totale < 0.6 ? l : null;
    }).filter(Boolean);
    const materie = [...new Set(lezioni.map((l) => l.materia))];
    return `<section class="carta">
      <h2>${esc(p.nome)} <small>${esc(p.classe)}</small></h2>
      <div class="numeri">
        <div><strong>${lezioni.length}</strong><span>lezioni</span></div>
        <div><strong>${media === null ? "nessuna" : media + "%"}</strong><span>media verifiche</span></div>
        <div><strong>${ultimaSettimana}</strong><span>verifiche in 7 giorni</span></div>
        <div><strong>${daRipassare}</strong><span>schede da ripassare</span></div>
      </div>
      ${materie.length ? `<p><strong>Materie:</strong> ${materie.map(esc).join(", ")}</p>` : ""}
      ${deboli.length ? `<p><strong>Da riprendere:</strong></p><ul>${deboli.map((l) => `<li><a href="#/lezione/${l.id}">${esc(l.titolo)}</a></li>`).join("")}</ul>` : ""}
      <button class="testo pericolo" data-elimina="${p.id}">Elimina il profilo</button>
    </section>`;
  }).join("")}
  <section class="carta"><h2>Aggiungi un figlio</h2>${moduloProfilo()}</section>`;
  collegaModuloProfilo();
  radice.querySelectorAll("[data-elimina]").forEach((b) => b.addEventListener("click", () => {
    if (confirm("Eliminare il profilo con tutte le sue lezioni?")) { db.eliminaProfilo(b.dataset.elimina); mostra(); }
  }));
}

function paginaImpostazioni() {
  const chiave = db.chiaveApi();
  radice.innerHTML = `
    <h1>Impostazioni</h1>
    <section class="carta">
      <h2>Chiave di accesso a Claude</h2>
      <p>La crea un adulto su <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a>. Resta salvata solo su questo dispositivo. Consigliamo di impostare un tetto di spesa mensile nella stessa pagina.</p>
      <form id="chiave" class="modulo">
        <label>Chiave <input name="chiave" type="password" autocomplete="off" value="${esc(chiave)}" placeholder="sk-ant-…"></label>
        <button class="primario">Salva</button>
      </form>
      <div id="esito-chiave"></div>
    </section>
    <section class="carta">
      <h2>Qualità delle risposte</h2>
      <form id="modello" class="modulo">
        ${Object.entries({ economico: "costa pochissimo, adatto all'uso quotidiano", qualita: "legge meglio le foto difficili, costa circa 40 volte di più" }).map(([k, d]) => `
          <label class="opzione"><input type="radio" name="modello" value="${k}" ${db.modello() === k ? "checked" : ""}>
            <span><strong>${MODELLI[k].nome}</strong><br><small>${d}</small></span></label>`).join("")}
      </form>
    </section>
    <section class="carta">
      <h2>Privacy</h2>
      <p>Lezioni, risultati e chiave restano solo in questo browser: l'app non ha un proprio server.</p>
      <p>Le foto e le risposte aperte vengono inviate ad Anthropic, che fornisce Claude, solo per preparare il ripasso. Con la chiave a pagamento Anthropic non le usa per addestrare i suoi modelli.</p>
      <p>${AVVISO_IA}</p>
    </section>
    <section class="carta">
      <h2>Copia di sicurezza</h2>
      <p>Lezioni e risultati stanno solo in questo browser. Salvate ogni tanto una copia, anche per passarla su un altro telefono.</p>
      <div class="azioni">
        <button class="pulsante" id="esporta">Scarica la copia</button>
        <label class="pulsante">Ripristina una copia<input type="file" id="importa" accept="application/json" hidden></label>
      </div>
      <div id="esito-copia"></div>
    </section>`;
  document.getElementById("chiave").addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = db.salvaChiaveApi(e.target.chiave.value.trim());
    document.getElementById("esito-chiave").innerHTML = ok ? avviso("Chiave salvata.", "ok") : avviso("Impossibile salvare: il browser blocca l'archivio locale.");
  });
  document.getElementById("modello").addEventListener("change", (e) => db.salvaModello(e.target.value));
  document.getElementById("esporta").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([db.esporta()], { type: "application/json" }));
    a.download = `ripasso-copia-${db.oggi()}.json`;
    a.click();
  });
  document.getElementById("importa").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !confirm("Il ripristino sostituisce tutti i dati attuali. Continuare?")) return;
    try {
      db.importa(await file.text());
      document.getElementById("esito-copia").innerHTML = avviso("Copia ripristinata.", "ok");
    } catch {
      document.getElementById("esito-copia").innerHTML = avviso("Il file scelto non è una copia valida.");
    }
  });
}

// ---------- Navigazione ----------

function mostra() {
  const [, pagina, a, b] = location.hash.split("/");
  document.querySelectorAll(".barra a").forEach((x) => x.classList.toggle("attiva", x.getAttribute("href") === `#/${pagina || ""}`));
  const profilo = db.profiloAttivo();
  if (pagina === "impostazioni") paginaImpostazioni();
  else if (!profilo) paginaBenvenuto();
  else if (pagina === "nuova") paginaNuova(profilo);
  else if (pagina === "lezione") paginaLezione(profilo, a, b);
  else if (pagina === "ripasso") paginaRipasso(profilo);
  else if (pagina === "genitori") paginaGenitori();
  else paginaHome(profilo);
  window.scrollTo(0, 0);
}

addEventListener("hashchange", mostra);
mostra();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
