// Collegamento con Claude: dalle foto o dal PDF della lezione al materiale di ripasso.
import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm";

export const MODELLI = {
  economico: { id: "claude-haiku-5-5", nome: "Economico" },
  qualita: { id: "claude-opus-5-5", nome: "Massima qualità" },
};

// Indicazioni comuni per un'app usata da bambini e ragazzi.
const SICUREZZA = `
Sicurezza: stai parlando con un minorenne attraverso un'app per lo studio.
- Resta sempre sull'argomento scolastico. Se il materiale o la risposta contengono contenuti non adatti a un minore, dati personali (indirizzi, numeri di telefono, nomi completi di altre persone) o richieste estranee allo studio, non riportarli e invita gentilmente a parlarne con un genitore o un insegnante.
- Se il ragazzo esprime disagio, paura o pensieri di farsi del male, rispondi con calore e invitalo a parlarne subito con un adulto di fiducia; in Italia può chiamare il Telefono Azzurro al 19696.
- Non chiedere mai informazioni personali.`;

const SCHEMA_LEZIONE = {
  type: "object",
  additionalProperties: false,
  required: ["leggibile", "avviso", "titolo", "materia", "riassunto", "concetti", "verifica", "aperte", "schede"],
  properties: {
    leggibile: { type: "boolean" },
    avviso: { type: "string" },
    titolo: { type: "string" },
    materia: { type: "string" },
    riassunto: { type: "array", items: { type: "string" } },
    concetti: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["termine", "spiegazione"],
        properties: { termine: { type: "string" }, spiegazione: { type: "string" } },
      },
    },
    verifica: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["domanda", "opzioni", "corretta", "spiegazione"],
        properties: {
          domanda: { type: "string" },
          opzioni: { type: "array", items: { type: "string" } },
          corretta: { type: "integer" },
          spiegazione: { type: "string" },
        },
      },
    },
    aperte: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["domanda", "traccia"],
        properties: { domanda: { type: "string" }, traccia: { type: "string" } },
      },
    },
    schede: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fronte", "retro"],
        properties: { fronte: { type: "string" }, retro: { type: "string" } },
      },
    },
  },
};

const SCHEMA_CORREZIONE = {
  type: "object",
  additionalProperties: false,
  required: ["esito", "commento", "risposta_completa"],
  properties: {
    esito: { type: "string", enum: ["giusta", "parziale", "da_rivedere"] },
    commento: { type: "string" },
    risposta_completa: { type: "string" },
  },
};

function istruzioniLezione(classe, materia) {
  return `Sei un insegnante paziente che aiuta un ragazzo di ${classe} a ripassare.
Ricevi le foto o il PDF di una lezione (pagine di libro, quaderno, appunti o schede)${materia ? ` di ${materia}` : ""}.

Regole:
- Usa solo quello che c'è nel materiale ricevuto. Non aggiungere argomenti, date o dati che non compaiono.
- Se il materiale non si legge o non contiene una lezione, metti "leggibile" a false, spiega il motivo in "avviso" e lascia vuoti gli elenchi.
- Se il PDF è lungo, concentrati sull'argomento principale e dillo in "avviso".
- Se una parte è poco leggibile, segnalalo in "avviso"; altrimenti lascia "avviso" vuoto.
- Scrivi in italiano semplice, adatto a ${classe}: frasi brevi, parole chiare, tono incoraggiante.
- Niente trattini come segno di pausa: usa virgole o due punti.
- "riassunto": da 3 a 6 paragrafi brevi che spiegano la lezione nell'ordine giusto.
- "concetti": da 4 a 10 parole chiave con una spiegazione di una o due frasi.
- "verifica": da 6 a 10 domande a scelta multipla con 4 opzioni ciascuna; "corretta" è la posizione della risposta giusta, contando da 0; varia la posizione; "spiegazione" dice perché è giusta.
- "aperte": da 3 a 5 domande a cui rispondere con parole proprie; "traccia" è la risposta attesa in breve.
- "schede": da 6 a 15 schede da ripetere, con una domanda o un termine sul fronte e la risposta breve sul retro.
- "materia": la materia scolastica della lezione, con l'iniziale maiuscola.
${SICUREZZA}`;
}

function istruzioniCorrezione(classe) {
  return `Sei un insegnante gentile che corregge la risposta di un ragazzo di ${classe}.
Valuta il contenuto, non l'ortografia. "esito": "giusta" se i punti essenziali ci sono, "parziale" se ne manca qualcuno, "da_rivedere" se la risposta è sbagliata o vuota.
"commento": due o tre frasi incoraggianti che dicono cosa va bene e cosa aggiungere, rivolte direttamente al ragazzo.
"risposta_completa": una risposta modello breve.
Basati solo sulla lezione fornita. Niente trattini come segno di pausa.
${SICUREZZA}`;
}

async function chiedi(chiave, modello, system, content, schema) {
  const client = new Anthropic({ apiKey: chiave, dangerouslyAllowBrowser: true });
  const richiesta = {
    model: (MODELLI[modello] || MODELLI.economico).id,
    max_tokens: 16000,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  };
  // Il modello di massima qualità può passare a un altro modello se rifiuta la richiesta.
  if (modello === "qualita") Object.assign(richiesta, { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  let risposta;
  try {
    risposta = await client.beta.messages.create(richiesta);
  } catch (errore) {
    if (errore instanceof Anthropic.AuthenticationError) throw new Error("La chiave di accesso non è valida. Controllala in Impostazioni.");
    if (errore instanceof Anthropic.RateLimitError) throw new Error("Troppe richieste in poco tempo. Riprova tra un minuto.");
    if (errore instanceof Anthropic.BadRequestError) throw new Error("Richiesta non accettata: " + errore.message);
    if (errore instanceof Anthropic.APIConnectionError) throw new Error("Connessione assente. Controlla la rete e riprova.");
    if (errore instanceof Anthropic.APIError) throw new Error(`Errore del servizio (${errore.status}). Riprova più tardi.`);
    throw errore;
  }
  if (risposta.stop_reason === "refusal") throw new Error("Il contenuto non può essere elaborato. Prova con altro materiale.");
  if (risposta.stop_reason === "max_tokens") throw new Error("La lezione è troppo lunga: prova con meno pagine alla volta, o con un PDF più breve.");
  const testo = risposta.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(testo);
}

export async function creaLezione(chiave, modello, allegati, classe, materia) {
  const content = allegati.map((a) =>
    a.tipo === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: a.dati } }
      : { type: "image", source: { type: "base64", media_type: "image/jpeg", data: a.dati } }
  );
  content.push({ type: "text", text: "Prepara il materiale di ripasso per questa lezione." });
  const lezione = await chiedi(chiave, modello, istruzioniLezione(classe, materia), content, SCHEMA_LEZIONE);
  lezione.verifica = lezione.verifica.filter(
    (d) => d.opzioni.length >= 2 && d.corretta >= 0 && d.corretta < d.opzioni.length
  );
  return lezione;
}

export async function correggiRisposta(chiave, modello, classe, lezione, domanda, risposta) {
  const contesto = [
    `Lezione: ${lezione.titolo}`,
    lezione.riassunto.join("\n"),
    `Domanda: ${domanda.domanda}`,
    `Risposta attesa: ${domanda.traccia}`,
    `Risposta del ragazzo: ${risposta}`,
  ].join("\n\n");
  return chiedi(chiave, modello, istruzioniCorrezione(classe), [{ type: "text", text: contesto }], SCHEMA_CORREZIONE);
}
