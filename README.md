# Ripasso

App per il ripasso a casa, pensata per la famiglia. Si apre dal browser del telefono e si può aggiungere alla schermata iniziale come un'app normale.

## Che cosa fa

| Funzione | Come funziona |
|---|---|
| Foto o PDF della lezione | Si scattano o si scelgono fino a 6 foto di libro, quaderno o appunti, oppure si allega un PDF fino a 20 MB |
| Scheda di ripasso | Riassunto breve e parole chiave, scritti per la classe del ragazzo |
| Verifica | Domande a scelta multipla con correzione immediata e spiegazione |
| Domande aperte | Il ragazzo risponde con parole sue e riceve una correzione gentile |
| Schede da ripetere | Ripasso a intervalli: una scheda ricordata torna dopo 1, 2, 4, 7, 15 e 30 giorni; una dimenticata torna il giorno dopo |
| Più figli | Un profilo per ciascuno, con nome e classe |
| Spazio genitori | Lezioni caricate, media delle verifiche, schede in attesa, lezioni da riprendere |
| Copia di sicurezza | Si scarica un file con tutti i dati e lo si ripristina su un altro telefono |

Il riassunto, le domande e le correzioni li prepara Claude, il modello di intelligenza artificiale di Anthropic, leggendo direttamente le foto o il PDF. L'app chiede di usare solo il contenuto della lezione, senza aggiungere nulla.

## Privacy

- Lezioni, risultati e chiave di accesso restano **solo nel browser del telefono** che si usa. Non c'è nessun server dell'app.
- Le foto e i PDF vengono inviati ad Anthropic solo per preparare il ripasso e non vengono salvati dall'app. Con la chiave a pagamento Anthropic non li usa per addestrare i modelli.
- Il repository è pubblico, ma contiene solo il programma: nessun dato della famiglia.

## Messa in linea con GitHub Pages (una volta sola)

1. Nel repository aprire **Settings**, poi **Pages**.
2. In **Source** scegliere **Deploy from a branch**, ramo `main`, cartella `/ (root)`, e salvare.
3. Dopo un paio di minuti l'app è raggiungibile all'indirizzo `https://guidocostalonga.github.io/Ripasso-app/`.

## Prima configurazione sul telefono

1. Un adulto crea una chiave di accesso su [platform.claude.com](https://platform.claude.com/settings/keys) e, nella stessa area, imposta un tetto di spesa mensile.
2. Aprire l'indirizzo dell'app e incollare la chiave in **Impostazioni**.
3. Aggiungere i profili dei figli.
4. Aggiungere l'app alla schermata iniziale: su iPhone con Safari, pulsante Condividi e poi "Aggiungi a Home"; su Android con Chrome, menu e poi "Aggiungi a schermata Home".

## Costi e qualità

L'app è gratuita; si paga solo l'uso di Claude, a consumo, con la chiave della famiglia. In **Impostazioni** si sceglie il modello:

| Scelta | Modello | Prezzo ufficiale per milione di parti di testo (entrata / uscita) |
|---|---|---|
| Economico (predefinito) | Claude Haiku 5.5 | 0,10 / 0,50 dollari |
| Massima qualità | Claude Opus 5.5 | 4 / 20 dollari |

Il costo reale di ogni lezione dipende dal numero di pagine: conviene controllarlo su platform.claude.com dopo le prime lezioni.

## Uso da parte di minori

L'app segue le [linee guida di Anthropic per i servizi usati da minori](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors):

- dichiara in modo visibile che schede e correzioni sono preparate da un'intelligenza artificiale e vanno controllate con il libro;
- chiede a Claude di restare sugli argomenti scolastici, di non riportare dati personali né contenuti non adatti e, se un ragazzo esprime disagio, di invitarlo a parlarne con un adulto o con il Telefono Azzurro (19696);
- tiene i dati solo sul telefono e spiega nella pagina Impostazioni dove vanno foto e risposte.

I servizi gratuiti di altri fornitori sono stati esclusi perché le loro condizioni vietano le app usate da minori o prevedono l'uso dei dati inviati per addestrare i modelli.

## Struttura dei file

| File | Contenuto |
|---|---|
| `index.html` | Pagina principale e menu in basso |
| `app.js` | Pagine e interazioni |
| `ai.js` | Richieste a Claude: preparazione della lezione e correzione delle risposte aperte |
| `store.js` | Archivio locale e calendario del ripasso |
| `stile.css` | Grafica, con tema chiaro e scuro automatico |
| `sw.js` | Permette di aprire l'app anche senza rete |
| `manifest.webmanifest`, `icona*` | Nome e icona per la schermata iniziale |

Non serve nessuna compilazione: sono file statici. Per provarla sul computer basta avviare `python3 -m http.server` nella cartella e aprire `http://localhost:8000`.
