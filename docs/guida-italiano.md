# AeroTwin 0.2 — installazione, uso e interpretazione

AeroTwin è un'applicazione locale per osservare posizioni ADS-B, esplorare dati di programma dei voli, addestrare modelli temporali e confrontare scenari di coda. Questa distribuzione è pensata per una persona su un computer fidato, per ricerca, portfolio e didattica. La solidità tecnica dell'applicazione non equivale alla validazione aeronautica delle previsioni.

## 1. Installazione dalla distribuzione ZIP

1. Scarica `aerotwin-0.2.0.zip` dalla release GitHub ed estrailo in una cartella scrivibile. Conserva tutti i file e le sottocartelle. Il relativo `.sha256` permette di controllare che il download sia integro; non è una firma digitale.
2. Installa Python **3.12 o 3.13**, con `pip` e `venv`. La prima preparazione scarica le librerie Python: serve Internet. La versione ZIP contiene già l'interfaccia compilata e non richiede Node.js per preparazione/esecuzione.
3. Apri un terminale nella cartella estratta ed esegui:

```bash
python scripts/bootstrap.py
python scripts/serve.py
```

Su macOS/Linux il comando può chiamarsi `python3.12` o `python3`; su Windows puoi usare `py -3.12`. Non installare librerie globalmente: bootstrap crea `.venv` nella cartella del progetto. Usa Python 3.12/3.13 se la versione di sistema è troppo recente per le dipendenze scientifiche.

4. Quando compare **AeroTwin ready**, apri **http://127.0.0.1:5188**. API e interfaccia usano lo stesso server. La porta è accessibile soltanto dal computer locale. Arresta dal terminale con **Ctrl-C**.
5. In un secondo terminale puoi verificare l'installazione:

```bash
python scripts/verify.py --base-url http://127.0.0.1:5188
```

Deve terminare con **10/10 checks passed**. Se una porta è occupata, non chiudere processi sconosciuti: scegli per esempio `python scripts/serve.py --port 5190` e passa lo stesso indirizzo a `verify.py`.

Il programma resta aperto finché il suo terminale rimane attivo. Chiudere la scheda del browser non arresta il server. L'indirizzo 127.0.0.1 non è un sito pubblico: altri dispositivi non lo raggiungono.

## 2. Installazione dal codice GitHub

Richiede anche Node.js 20+ e npm, solo per compilare l'interfaccia:

```bash
git clone https://github.com/massibrevo/aerotwin.git
cd aerotwin
python scripts/bootstrap.py
python scripts/serve.py
```

Per sviluppare: `python scripts/bootstrap.py --dev`, poi `python scripts/dev.py`. Questa modalità usa due server e Vite; non è il normale avvio della distribuzione. `--source-build` ricompila l'interfaccia anche quando esiste già una cartella `dist`.

## 3. Primo giro consigliato

- **Control tower**: guarda sorgente, numero di record, intervallo temporale e qualità. I conteggi degli aeromobili e le statistiche dei voli sono strati diversi.
- **Live radar / Synthetic demo**: seleziona un simbolo o una riga; osserva callsign, coordinate, quota (ft), velocità (kt), track e timestamp. Ricerca e slider filtrano le posizioni mostrate. Le quote mancanti restano sconosciute; non diventano zero.
- **Replay**: riproduce 20 snapshot sintetici di Barcellona, dal 1 gennaio 2025. I timestamp sono della registrazione, non di oggi. Non è una registrazione reale di traffico.
- **Live ADS-B**: attiva una richiesta reale al provider comunitario. Scegli regione e raggio, massimo 250 miglia nautiche. 1 NM = 1,852 km. Il feed richiede Internet; la mappa offline no. La cadenza minima è 30 secondi e il provider ha cache/cooldown condivisi.
- **Historical explorer**: cerca voli e filtra origine/date. La tabella è paginata; esporta fino a 500 righe coerenti con i filtri. I grafici aggregati si riferiscono all'intero dataset selezionato, come indicato in pagina.
- **Guida all’uso**: disponibile anche dentro l'app, con legenda e limiti.

## 4. Dati BTS: dall'importazione alla previsione

Scarica manualmente un CSV ufficiale di **Reporting Carrier On-Time Performance** da BTS/TranStats. Non è incluso alcun download automatico di dati storici reali. L'app verifica schema e coerenza, ma non può autenticare la provenienza di un file: un CSV inventato nel formato BTS resta un dato inventato. I test automatici usano fixture generate, separate dai dati dell'utente.

1. Apri **Data & experiments**, seleziona il CSV e inserisci eventuali fusi aggiuntivi in JSON:

```json
{"SFO":"America/Los_Angeles","BOS":"America/New_York"}
```

Sono già noti BCN, LHR, AMS, JFK, ATL, ORD, LAX e DFW. Il fuso riguarda l'aeroporto di origine. Orari ambigui o inesistenti al cambio dell'ora vengono rifiutati. Il limite nel browser è **20 MiB**; per file più grandi usa la CLI:

```bash
# macOS/Linux
.venv/bin/python -m aerotwin.cli ingest-bts --input /percorso/bts.csv --timezone-map /percorso/fusi.json
# Windows
.venv\Scripts\python -m aerotwin.cli ingest-bts --input C:\dati\bts.csv --timezone-map C:\dati\fusi.json
```

2. Controlla il rapporto: righe, duplicati, date, target mancanti, cancellazioni/diversioni e checksum. L'importazione valida pubblica insieme tutte le partizioni mensili; una non valida conserva lo snapshot precedente.
3. **Ogni importazione sostituisce il dataset BTS attivo**: non aggiunge automaticamente il mese al precedente. Per analizzare più mesi, prepara un unico CSV con schema coerente. Le snapshot precedenti restano su disco, ma non c'è ancora un selettore di ripristino nell'interfaccia.
4. Scegli **Imported BTS** nel selettore dello storico. Per addestrare scegli lo stesso dataset sotto **Training dataset**, poi **Train and evaluate model**. Attendi `succeeded`. Almeno 100 righe valide e sufficiente estensione temporale dopo gli embarghi sono necessarie; un file concentrato in un giorno può essere insufficiente.
5. In **Forecast lab** scegli **BTS IMPORT MODEL**. L'app usa un vero artefatto Python salvato. Importare altri dati rende il vecchio modello obsoleto: sarà necessario riaddestrarlo. Aeroporti e vettori mai osservati nell'addestramento sono rifiutati; altre estrapolazioni generano avvisi.

Il target riguarda voli non cancellati e non dirottati; il modello non stima la probabilità di cancellazione. Non usare record riservati in un repository pubblico.

## 5. Interpretazione del Forecast lab

La previsione è il **ritardo di partenza, in minuti**, a **120 minuti prima dell'orario programmato**. I campi di input sono dati di programma, non osservazioni di ritardo in corso. Il giorno usa lunedì=0, domenica=6; l'ora è locale all'origine e la distanza è in miglia. Un valore negativo indica anticipo, non un errore di segno.

- **MAE**: errore assoluto medio nel test. MAE=7 significa 7 minuti di errore medio, non accuratezza del 93% e non un limite massimo d'errore.
- **RMSE**: penalizza maggiormente gli errori grandi. Un RMSE molto maggiore del MAE suggerisce errori estremi rilevanti.
- **Baseline**: riferimento semplice, addestrato sullo stesso passato. Un modello complesso è utile soltanto se migliora il riferimento in modo stabile su dati adeguati.
- **Train / validation / test**: periodi ordinati nel tempo, con embargo sulla disponibilità delle etichette. La selezione del modello usa validation; il test resta separato.
- **Intervallo nominale 90%**: stima empirica basata sui residui di validation. Guarda anche la copertura effettiva sul test. Dipendenza temporale e cambiamenti del traffico possono invalidarla; non è una garanzia sul singolo volo.
- **Permutation importance**: sensibilità predittiva globale. Non prova che una variabile causi un ritardo, né spiega causalmente il singolo volo.
- **Metriche per aeroporto**: nel rapporto completo sono riportati MAE/RMSE e numerosità del test per origine. Gruppi piccoli sono instabili.

I circa 7,17 minuti di MAE della demo appartengono a un processo sintetico costruito per l'esempio. Non dimostrano capacità di previsione del traffico reale. Anche con dati reali servono controlli indipendenti su qualità, copertura, deriva, sottogruppi e disponibilità delle informazioni al momento della previsione.

## 6. Interpretazione del simulatore

1. Scegli un aeroporto presente nel dataset.
2. Imposta prima **0%** di riduzione; con lo stesso seed, baseline e scenario devono coincidere.
3. Aumenta la riduzione, mantenendo seed e repliche per un confronto controllato. Poi varia seed/repliche per esplorare la variabilità.
4. Leggi ritardo di coda baseline/scenario, differenza e P10–P90 tra repliche. Questi percentili descrivono simulazioni sotto le assunzioni, non probabilità di impatto reale.

Le ipotesi sono volutamente esplicite: 150 voli pronti uniformemente in 6 ore, una pista equivalente FCFS, tempi di servizio lognormali medi di 1,8 minuti, shock dal minuto 60 e margine di connessione ipotetico di 20–60 minuti. Il ritardo downstream è stilizzato. La rete viene dai record importati, ma capacità e domanda non vengono calibrate da quei dati. Non sono ricostruite rotazioni reali, equipaggi, meteo, settori o politiche di recupero. Non è una stima causale.

## 7. Backup, aggiornamenti e manutenzione

Per separare il codice dai dati puoi impostare **AEROTWIN_HOME** prima di bootstrap e serve. Deve essere lo stesso percorso in entrambi i comandi. Se non lo imposti, i dati sono nella cartella del progetto. Impostarlo dopo la prima installazione seleziona uno spazio vuoto: non migra automaticamente quello vecchio.

```bash
# macOS/Linux, esempio
export AEROTWIN_HOME="$PWD/../aerotwin-data"
python scripts/bootstrap.py
python scripts/serve.py
```

PowerShell: `$env:AEROTWIN_HOME="C:\AeroTwinData"`. Usa una cartella privata scrivibile. Con il server fermo, copia l'intero `AEROTWIN_HOME` (oppure `data/processed` e `models` nel caso predefinito) per un backup consistente, inclusi eventuali file SQLite associati. Conserva anche il CSV originale. Gli esperimenti persistono in SQLite; i modelli hanno manifest e checksum; i dati sono in snapshot mensili immutabili.

Per aggiornare il sorgente, arresta il server, fai backup, esegui `git pull --ff-only`, poi `python scripts/bootstrap.py --source-build`. Con la ZIP estrai la nuova versione e usa lo stesso AEROTWIN_HOME. Dopo un cambio di librerie scientifiche può essere necessario riaddestrare. I job di addestramento interrotti dal riavvio vengono segnalati come falliti, mai come completati.

Le snapshot e gli artefatti precedenti restano conservati: l'occupazione su disco cresce con import/addestramenti. La versione attuale non elimina automaticamente vecchi dati. Evita di cancellare manualmente file attivi o cambiare i manifest; pianifica pulizia e backup a server fermo.

## 8. Limiti e perimetro di distribuzione

- ADS-B è un feed comunitario incompleto e non certificato. Non ricavare destinazione o ritardo dal callsign; salite/discese non sono statistiche ufficiali di arrivi/partenze.
- `LIVE UNAVAILABLE` e `stale` sono stati reali, non sostituiti silenziosamente da posizioni sintetiche. Un conteggio zero può dipendere da copertura o disponibilità.
- Un solo server/processo, uso locale su computer fidato. Nessun account, database remoto, chiave API o telemetria. Primo setup richiede Internet per le dipendenze; LIVE/tile online lo richiedono durante l'uso.
- Non c'è autenticazione multiutente, hosting pubblico, HTTPS, un'app nativa firmata o un installer che includa Python. La ZIP è una distribuzione locale del progetto con interfaccia compilata.
- Mappe Natural Earth a bassa risoluzione e MapLibre non sono carte aeronautiche. Non usare l'app per navigazione.
- Nessuna validazione/certificazione per dispatch, ATC o decisioni di sicurezza. Una CI verde dimostra i controlli software eseguiti, non l'accuratezza operativa dei modelli.

Per formule e dettagli consulta `methodology.md`, `model-card.md`, `datasets-and-licenses.md` e `evaluation-v0.2.md`.
