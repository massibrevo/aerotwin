# AeroTwin 0.5 — installazione, uso e interpretazione

AeroTwin è un'applicazione locale per osservare posizioni ADS-B, esplorare dati di programma dei voli, addestrare modelli temporali e confrontare scenari di coda. Questa distribuzione è pensata per una persona su un computer fidato, per ricerca, portfolio e didattica. La solidità tecnica dell'applicazione non equivale alla validazione aeronautica delle previsioni.

## 1. Installazione dalla distribuzione ZIP

1. Scarica `aerotwin-0.5.0.zip` dalla release GitHub ed estrailo in una cartella scrivibile. Conserva tutti i file e le sottocartelle. Il relativo `.sha256` permette di controllare che il download sia integro; non è una firma digitale.
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

La versione 0.3 ridisegna tutte le pagine: tema chiaro/scuro con il pulsante luna/sole e menu di navigazione con Ctrl/⌘ K. Il radar usa lo schermo per la mappa, con pannello traffico e scheda aeromobile flottanti. Su telefono il pannello è inizialmente chiuso: premi **Traffic** per aprirlo.

La modalità dei dati e quella della mappa sono separate: **Synthetic demo** può apparire su una mappa stradale reale. **Street map** usa OpenFreeMap/OSM e richiede Internet; **Use offline map** seleziona subito la geometria locale. In caso di mancato caricamento dei tile, la mappa locale si attiva con un avviso. **Dark map** è un'altra opzione nel selettore dei livelli.

Seleziona un aeromobile, usa **Follow aircraft** per seguirne la posizione e **Observed trail** per la traccia delle osservazioni raccolte in questa visita al radar (massimo 120 punti). La traccia riparte cambiando area/modalità, riavvolgendo il replay o uscendo dalla pagina; non è una rotta completa. Registrazione e tipo compaiono solo quando forniti dal feed. Le etichette sono ridotte automaticamente quando si sovrappongono; l'aeromobile selezionato resta identificabile.


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

Per formule e dettagli consulta `methodology.md`, `model-card.md`, `datasets-and-licenses.md` e `evaluation-v0.5.md`.


### Foto reali degli aeromobili

Nella scheda di un aereo LIVE viene cercata una foto di riferimento tramite il suo codice ICAO hex su Planespotters.net. La miniatura mostra il credito del fotografo ed è cliccabile per aprire la pagina originale. Non è una foto in diretta: livrea e assegnazione del codice possono cambiare. Se non esiste una corrispondenza o il servizio non risponde, compare “Aircraft photo unavailable”. Demo e replay sintetici non ricevono foto di aerei reali.

Serve Internet. Il servizio riceve il codice pubblico ICAO dell’aereo selezionato e il browser carica la miniatura dal CDN, che riceve il suo indirizzo IP. Nessun file fotografico viene salvato o distribuito con AeroTwin; solo i metadati rimangono in memoria per un’ora. Il copyright resta al fotografo.

### Conversione delle unità

Apri **Units** nella barra superiore. **Metric units** cambia subito quota in metri, velocità in km/h, distanze in km e velocità verticale in m/s. **Aviation units** ripristina ft, kt, NM e ft/min. Puoi scegliere le quattro unità separatamente, incluse mph e miglia terrestri. La scelta è salvata nel browser e vale per schede, lista, mappe, raggio, filtri, grafici delle quote e input della distanza in Forecast lab. La selezione dell’aereo e i filtri rimangono attivi.

Il raggio personalizzato e la distanza del modello accettano la nuova unità e vengono convertiti prima della richiesta. I dati originali, API e CSV mantengono le unità della fonte; i valori mancanti restano mancanti. I numeri mostrati sono arrotondati, senza modificare la precisione conservata nei dati.


Per una conversione immediata basta l’interruttore **Metric** nella barra superiore: attivo = m, km/h, km, m/s; disattivo = ft, kt, NM, ft/min. La scelta viene salvata. **Units** apre le impostazioni separate.


## Novità 0.4: ricerca, preferiti e analisi scientifica

Nel radar puoi cercare callsign, registrazione, codice ICAO e tipo fornito. In modalità **Live ADS-B**, scegli il tipo di ricerca e premi **Find worldwide** per una corrispondenza esatta nel feed globale. **Locate on radar** sposta la regione e seleziona l’aereo solo se compare nella nuova risposta. Nessuna corrispondenza non significa assenza di un volo.

**Save aircraft** salva l’identità in questo browser; **Favourites** mostra i preferiti. Le identità live e sintetiche restano separate. Non vengono salvate posizioni, e un aereo fuori dalla fotografia corrente è indicato esplicitamente. Le etichette salvate non garantiscono callsign o assegnazione attuali.

La scheda mostra riferimenti HexDB su costruttore, modello, proprietario registrato e codice operatore. Proprietario e compagnia operativa possono essere diversi. **Unverified route reference** è un’associazione di database al callsign, con data della fonte: non conferma la rotta del volo attuale e può essere vecchia. Dati mancanti rimangono sconosciuti.

Apri **Analytics studio** e scegli il dataset storico. I periodi A e B devono essere ordinati e non sovrapposti. Il confronto mostra media, mediana, P90, quota di ritardi ≥15 minuti e cancellazioni, con denominatori e campioni. I ritardi escludono cancellazioni/deviazioni ed etichette mancanti. Il confronto standardizzato mantiene i pesi dei gruppi del periodo A (almeno 30 etichette per gruppo e periodo); la copertura indica quali dati restano rappresentati. Non è una stima causale. Puoi esportare statistiche e provenienza in JSON.

In **Forecast lab**, i modelli nuovamente addestrati mostrano errori residui, confronto con la mediana storica, bootstrap per intere date, copertura per aeroporto/compagnia e cambiamenti nella distribuzione degli input. La sensibilità del singolo caso ricalcola la previsione sostituendo una variabile alla volta con un riferimento del training: non spiega cause e i contributi non si sommano. Il bootstrap presuppone date scambiabili; Wilson presuppone indipendenza dei voli, spesso approssimativa. Intervalli e copertura non sono garanzie.

I vecchi modelli funzionano ancora: usa **Data & experiments → Train and evaluate model** sul dataset scelto per ottenere le nuove diagnostiche. Il modello sintetico non misura abilità previsionale sul traffico reale. Per questa valutazione importa dati BTS autentici e controlla separatamente qualità, copertura temporale e baseline. Dettagli: [metodologia 0.4](intelligence-v0.4.md).


## Novità 0.5: radar, registrazioni, aeroporti e formule

Il radar online usa simboli GPU oltre 250 aerei; la lista mostra 200 righe per volta con un pulsante per le successive. La mappa offline disegna al massimo 500 posizioni con avviso, senza troncare i dati della lista. **Animate updates**, disattivo inizialmente, interpola solo la visualizzazione tra coordinate ricevute per piccoli gruppi online: non prevede posizioni e non modifica dati registrati o analitici.

In **Live ADS-B → Record / sessions**, scegli nome e conservazione (1/7/30 giorni) e premi **Start local LIVE recording**. Limiti: 20 sessioni, 1.000 fotografie di osservazioni per sessione, 50 MiB di payload compressi totali; SQLite aggiunge un overhead. La raccolta richiede app aperta e visibile: non esiste un servizio in background. La testata mostra **LIVE · REC**. Cambio modalità/regione e riavvio del server chiudono la raccolta; un browser abbandonato non continua a scaricare dati. Nessun dato sintetico viene accettato come registrazione reale.

Ferma la sessione e scegli **Replay observations**. I dati hanno badge **RECORDED · NOT LIVE**, tempi originali e velocità espressa in fotogrammi al secondo, non tempo reale. Il replay si arresta sull’ultimo fotogramma. Le foto e i metadati live non vengono richiesti durante il replay. **Delete recording** richiede la conferma esplicita della cancellazione definitiva. Le sessioni scadute vengono eliminate al successivo accesso ai dati, non tramite un demone quando il server è spento. I record restano sul computer e sono esclusi da Git/release.

In **Airport explorer**, cerca codice, aeroporto o città. I 6.146 riferimenti comprendono aeroporti grandi/medi e piccoli con servizio di linea: non ogni aviosuperficie privata. Piste e flag provengono da OurAirports e non indicano disponibilità attuale/NOTAM. L’orario locale usa il fuso IANA disponibile (riferimento OpenFlights/ODbL); senza fuso resta sconosciuto. I METAR NOAA/NWS mostrano istante UTC, età e testo originale; oltre due ore sono marcati vecchi. Mancanza del dato non genera meteo sintetico. Il meteo non entra nel modello storico T−120.

Le formule sono nella pagina **Mathematical methods**, raggiungibile da Analytics studio, Forecast lab e Methodology, e nell’[appendice matematica completa](mathematical-methods.md): medie, quantili, denominatori, standardizzazione dei gruppi, embargo temporale, MAE/RMSE/bias, intervalli residui, Wilson, bootstrap per data, shift degli input, sensibilità, centralità di rete e simulazione di coda. Le ipotesi e i limiti sono espliciti. [Dettagli 0.5](radar-airports-v0.5.md).
