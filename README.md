# Ripasso

App per il ripasso a casa, pensata per la famiglia. Si apre dal browser del telefono e si può aggiungere alla schermata iniziale come un'app normale.

## Che cosa fa

| Funzione | Come funziona |
|---|---|
| Foto della lezione | Si scattano o si scelgono fino a 6 pagine di libro, quaderno o appunti |
| Scheda di ripasso | Riassunto breve e parole chiave, scritti per la classe del ragazzo |
| Verifica | Domande a scelta multipla con correzione immediata e spiegazione |
| Domande aperte | Il ragazzo risponde con parole sue e riceve una correzione gentile |
| Schede da ripetere | Ripasso a intervalli: una scheda ricordata torna dopo 1, 2, 4, 7, 15 e 30 giorni; una dimenticata torna il giorno dopo |
| Più figli | Un profilo per ciascuno, con nome e classe |
| Spazio genitori | Lezioni caricate, media delle verifiche, schede in attesa, lezioni da riprendere |
| Copia di sicurezza | Si scarica un file con tutti i dati e lo si ripristina su un altro telefono |

Il riassunto, le domande e le correzioni li prepara Claude, il modello di intelligenza artificiale di Anthropic, leggendo direttamente le foto. L'app chiede di usare solo il contenuto della lezione, senza aggiungere nulla.

## Privacy

- Lezioni, risultati e chiave di accesso restano **solo nel browser del telefono** che si usa. Non c'è nessun server dell'app.
- Le foto vengono inviate ad Anthropic solo per preparare il ripasso e non vengono salvate dall'app.
- Il repository è pubblico, ma contiene solo il programma: nessun dato della famiglia.

## Messa in linea con GitHub Pages (una volta sola)

1. Nel repository aprire **Settings**, poi **Pages**.
2. In **Source** scegliere **Deploy from a branch**, ramo `main`, cartella `/ (root)`, e salvare.
3. Dopo un paio di minuti l'app è raggiungibile all'indirizzo `https://guidocostalonga.github.io/ripasso-app/`.

## Prima configurazione sul telefono

1. Un adulto crea una chiave di accesso su [platform.claude.com](https://platform.claude.com/settings/keys) e, nella stessa area, imposta un tetto di spesa mensile.
2. Aprire l'indirizzo dell'app e incollare la chiave in **Impostazioni**.
3. Aggiungere i profili dei figli.
4. Aggiungere l'app alla schermata iniziale: su iPhone con Safari, pulsante Condividi e poi "Aggiungi a Home"; su Android con Chrome, menu e poi "Aggiungi a schermata Home".

## Costi

L'app è gratuita; si paga solo l'uso di Claude, a consumo, con la chiave della famiglia. Il modello usato è Claude Opus 5.5. Il costo di ogni lezione dipende dal numero di pagine e dalla lunghezza del testo: conviene guardare la spesa reale nella pagina di platform.claude.com dopo le prime lezioni.

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
