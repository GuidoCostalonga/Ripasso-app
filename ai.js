// Collegamento con Claude: dalla foto della lezione al materiale di ripasso.
import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm";

const MODELLO = "claude-opus-5-5";

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
Ricevi le foto di una lezione (pagine di libro, quaderno o appunti)${materia ? ` di ${materia}` : ""}.

Regole:
- Usa solo quello che c'è nelle foto. Non aggiungere argomenti, date o dati che non compaiono.
- Se le foto non si leggono o non contengono una lezione, metti "leggibile" a false, spiega il motivo in "avviso" e lascia vuoti gli elenchi.
- Se una parte è poco leggibile, segnalalo in "avviso"; altrimenti lascia "avviso" vuoto.
- Scrivi in italiano semplice, adatto a ${classe}: frasi brevi, parole chiare, tono incoraggiante.
- Niente trattini come segno di pausa: usa virgole o due punti.
- "riassunto": da 3 a 6 paragrafi brevi che spiegano la lezione nell'ordine giusto.
- "concetti": da 4 a 10 parole chiave con una spiegazione di una o due frasi.
- "verifica": da 6 a 10 domande a scelta multipla con 4 opzioni ciascuna; "corretta" è la posizione della risposta giusta, contando da 0; varia la posizione; "spiegazione" dice perché è giusta.
- "aperte": da 3 a 5 domande a cui rispondere con parole proprie; "traccia" è la risposta attesa in breve.
- "schede": da 6 a 15 schede da ripetere, con una domanda o un termine sul fronte e la risposta breve sul retro.
- "materia": la materia scolastica della lezione, con l'iniziale maiuscola.`;
}

function istruzioniCorrezione(classe) {
  return `Sei un insegnante gentile che corregge la risposta di un ragazzo di ${classe}.
Valuta il contenuto, non l'ortografia. "esito": "giusta" se i punti essenziali ci sono, "parziale" se ne manca qualcuno, "da_rivedere" se la risposta è sbagliata o vuota.
"commento": due o tre frasi incoraggianti che dicono cosa va bene e cosa aggiungere, rivolte direttamente al ragazzo.
"risposta_completa": una risposta modello breve.
Basati solo sulla lezione fornita. Niente trattini come segno di pausa.`;
}

async function chiedi(chiave, system, content, schema) {
  const client = new Anthropic({ apiKey: chiave, dangerouslyAllowBrowser: true });
  let risposta;
  try {
    risposta = await client.beta.messages.create({
      model: MODELLO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content }],
    });
  } catch (errore) {
    if (errore instanceof Anthropic.AuthenticationError) throw new Error("La chiave di accesso non è valida. Controllala in Impostazioni.");
    if (errore instanceof Anthropic.RateLimitError) throw new Error("Troppe richieste in poco tempo. Riprova tra un minuto.");
    if (errore instanceof Anthropic.BadRequestError) throw new Error("Richiesta non accettata: " + errore.message);
    if (errore instanceof Anthropic.APIConnectionError) throw new Error("Connessione assente. Controlla la rete e riprova.");
    if (errore instanceof Anthropic.APIError) throw new Error(`Errore del servizio (${errore.status}). Riprova più tardi.`);
    throw errore;
  }
  if (risposta.stop_reason === "refusal") throw new Error("Il contenuto non può essere elaborato. Prova con altre foto.");
  if (risposta.stop_reason === "max_tokens") throw new Error("La lezione è troppo lunga: prova con meno pagine alla volta.");
  const testo = risposta.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(testo);
}

export async function creaLezione(chiave, immagini, classe, materia) {
  const content = immagini.map((data) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data },
  }));
  content.push({ type: "text", text: "Prepara il materiale di ripasso per questa lezione." });
  const lezione = await chiedi(chiave, istruzioniLezione(classe, materia), content, SCHEMA_LEZIONE);
  lezione.verifica = lezione.verifica.filter(
    (d) => d.opzioni.length >= 2 && d.corretta >= 0 && d.corretta < d.opzioni.length
  );
  return lezione;
}

export async function correggiRisposta(chiave, classe, lezione, domanda, risposta) {
  const contesto = [
    `Lezione: ${lezione.titolo}`,
    lezione.riassunto.join("\n"),
    `Domanda: ${domanda.domanda}`,
    `Risposta attesa: ${domanda.traccia}`,
    `Risposta del ragazzo: ${risposta}`,
  ].join("\n\n");
  return chiedi(chiave, istruzioniCorrezione(classe), [{ type: "text", text: contesto }], SCHEMA_CORREZIONE);
}
