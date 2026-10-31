// Archivio locale: tutto resta sul dispositivo, nel browser.
const CHIAVE_DATI = "ripasso.dati.v1";
const CHIAVE_API = "ripasso.chiave";
const CHIAVE_PROFILO = "ripasso.profilo";
const CHIAVE_MODELLO = "ripasso.modello";

// Giorni di attesa per ogni scatola del ripasso a intervalli.
export const INTERVALLI = [0, 1, 2, 4, 7, 15, 30];

function leggi(chiave, predefinito) {
  try {
    const valore = localStorage.getItem(chiave);
    return valore === null ? predefinito : JSON.parse(valore);
  } catch {
    return predefinito;
  }
}

function scrivi(chiave, valore) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
    return true;
  } catch {
    return false;
  }
}

let dati = leggi(CHIAVE_DATI, null) || { profili: [], lezioni: [] };

export const salva = () => scrivi(CHIAVE_DATI, dati);
export const tutti = () => dati;

export const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const oggi = () => new Date().toISOString().slice(0, 10);

export function aggiungiGiorni(giorni) {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

export const chiaveApi = () => leggi(CHIAVE_API, "");
export const salvaChiaveApi = (valore) => scrivi(CHIAVE_API, valore);

export const modello = () => leggi(CHIAVE_MODELLO, "economico");
export const salvaModello = (valore) => scrivi(CHIAVE_MODELLO, valore);

export function profiloAttivo() {
  const scelto = leggi(CHIAVE_PROFILO, "");
  return dati.profili.find((p) => p.id === scelto) || dati.profili[0] || null;
}
export const scegliProfilo = (pid) => scrivi(CHIAVE_PROFILO, pid);

export function aggiungiProfilo(nome, classe) {
  const profilo = { id: id(), nome, classe };
  dati.profili.push(profilo);
  salva();
  return profilo;
}

export function eliminaProfilo(pid) {
  dati.profili = dati.profili.filter((p) => p.id !== pid);
  dati.lezioni = dati.lezioni.filter((l) => l.profiloId !== pid);
  salva();
}

export function aggiungiLezione(profiloId, contenuto) {
  const lezione = {
    ...contenuto,
    id: id(),
    profiloId,
    data: oggi(),
    schede: contenuto.schede.map((s) => ({ ...s, scatola: 0, prossima: oggi() })),
    esiti: [],
  };
  dati.lezioni.unshift(lezione);
  salva();
  return lezione;
}

export const lezione = (lid) => dati.lezioni.find((l) => l.id === lid);
export const lezioniDi = (pid) => dati.lezioni.filter((l) => l.profiloId === pid);

export function eliminaLezione(lid) {
  dati.lezioni = dati.lezioni.filter((l) => l.id !== lid);
  salva();
}

export function schedeDaRipassare(pid) {
  const elenco = [];
  for (const l of lezioniDi(pid)) {
    l.schede.forEach((s, i) => {
      if (s.prossima <= oggi()) elenco.push({ lezione: l, indice: i });
    });
  }
  return elenco;
}

export function registraScheda(lid, indice, ricordata) {
  const s = lezione(lid).schede[indice];
  s.scatola = ricordata ? Math.min(s.scatola + 1, INTERVALLI.length - 1) : 0;
  s.prossima = aggiungiGiorni(ricordata ? INTERVALLI[s.scatola] : 1);
  salva();
}

export function registraVerifica(lid, punti, totale, sbagliate) {
  lezione(lid).esiti.push({ data: oggi(), punti, totale, sbagliate });
  salva();
}

export function esporta() {
  return JSON.stringify(dati, null, 2);
}

export function importa(testo) {
  const nuovi = JSON.parse(testo);
  if (!Array.isArray(nuovi.profili) || !Array.isArray(nuovi.lezioni)) throw new Error("File non valido");
  dati = nuovi;
  salva();
}
