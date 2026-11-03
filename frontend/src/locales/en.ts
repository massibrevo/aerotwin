export const englishGuide: Record<string, string> = {
  "Guida rapida · italiano": "Quick start guide",
  "Guida all’uso": "User guide",
  "Istruzioni e interpretazione in italiano": "Instructions and interpretation",
  "AeroTwin è un'applicazione locale per esplorare osservazioni ADS-B, analizzare voli, eseguire esperimenti predittivi e confrontare scenari ipotetici. Ogni risultato deve essere letto insieme alla sua fonte.":
    "AeroTwin is a local application for exploring ADS-B observations, analysing flights, running prediction experiments and comparing hypothetical scenarios. Interpret every result alongside its source.",
  "1. Inizia dalla demo offline": "1. Start with the offline demo",
  Apri: "Open",
  "e mantieni": "and keep",
  ". Seleziona un aeromobile sulla mappa o nella lista; prova ricerca, quota e velocità.":
    ". Select an aircraft on the map or in the list; try search, altitude and speed filters.",
  "riproduce esempi sintetici di Barcellona del 1 gennaio 2025: l'orario è quello della registrazione, non quello attuale.":
    "plays synthetic Barcelona examples from 1 January 2025: the clock is the recording time, not the current time.",
  "2. Attiva osservazioni reali": "2. Enable real observations",
  Scegli: "Choose",
  ", una regione e il raggio (1 NM = 1,852 km). Servono Internet e disponibilità del provider. Una risposta vuota non dimostra assenza di traffico.":
    ", a region and radius (1 NM = 1.852 km). Internet and provider availability are required. An empty response does not establish an absence of traffic.",
  "significa che il feed non è disponibile; la demo si attiva solo con una scelta esplicita.":
    "means the feed is unavailable; the demo starts only when explicitly selected.",
  "Unità in tempo reale": "Live unit conversion",
  "Usa l’interruttore": "Use the",
  "nella barra superiore per convertire tutto con un clic. Per le singole unità, apri":
    "switch in the top bar to convert all measurements in one click. For individual units, open",
  "e scegli": "and choose",
  "oppure cambia quota (ft/m), velocità (kt/km/h/mph), distanza (NM/km/mi) e velocità verticale (ft/min o m/s). Le schede, le mappe, i filtri e le distanze del modello si aggiornano subito; la selezione rimane salvata su questo browser. I dati originali e i CSV mantengono le unità della fonte.":
    "or change altitude (ft/m), speed (kt/km/h/mph), distance (NM/km/mi) and vertical rate (ft/min or m/s). Cards, maps, filters and model distances update immediately; the selection is saved in this browser. Original data and CSVs retain source units.",
  "Ricerca e preferiti": "Search and favourites",
  "Nel radar cerca callsign, registrazione o ICAO. In Live ADS-B,":
    "Search the radar by callsign, registration or ICAO. In Live ADS-B,",
  "cerca una corrispondenza esatta e": "finds an exact match and",
  "sposta la regione.": "moves the region.",
  e: "and",
  "conservano solo identità nel browser, con live/demo/replay separati. Le schede aggiungono riferimenti HexDB: proprietario registrato e compagnia operativa possono differire; le rotte da callsign sono sempre riferimenti non verificati, con data della fonte.":
    "store only identities in this browser, with live/demo/replay kept separate. Cards add HexDB references: registered owner and operating airline can differ; callsign routes always remain unverified references with source dates.",
  "Analytics studio e diagnostica": "Analytics studio and diagnostics",
  ", scegli il dataset e confronta periodi A e B senza sovrapposizione. Controlla campioni, etichette mancanti, denominatori e composizione dei gruppi; esporta il confronto in JSON. Il cambiamento standardizzato resta descrittivo, non causale.":
    ", select a dataset and compare non-overlapping periods A and B. Check samples, missing labels, denominators and group composition; export the comparison as JSON. The standardised change remains descriptive, not causal.",
  "In Forecast lab i nuovi modelli mostrano residui, bootstrap per data contro la baseline, copertura per gruppo e cambiamenti degli input. La sensibilità ricalcola una variabile alla volta: non è una spiegazione causale né una somma di contributi. Per modelli preesistenti, riaddestra esplicitamente il dataset scelto per generare queste diagnostiche.":
    "In Forecast lab, new models show residuals, date-block bootstrap comparisons with the baseline, subgroup coverage and input shifts. Sensitivity recomputes one variable at a time: it is neither a causal explanation nor an additive contribution. Explicitly retrain the selected dataset to add these diagnostics to older models.",
  "3. Carica dati storici e addestra": "3. Import historical data and train",
  ", importa un CSV ufficiale BTS; aggiungi i fusi IANA degli aeroporti mancanti. Il browser accetta fino a 20 MiB; la CLI serve per file più grandi. Ogni importazione riuscita sostituisce lo snapshot attivo. Controlla copertura, righe nulle, cancellazioni e duplicati prima di selezionare":
    ", import an official BTS CSV; add IANA zones for missing airports. The browser accepts up to 20 MiB; use the CLI for larger files. Every successful import replaces the active snapshot. Check coverage, missing values, cancellations and duplicates before selecting",
  "e avviare": "and running",
  ". Non caricare file riservati in un repository pubblico.":
    ". Do not upload confidential files to a public repository.",
  "4. Interpreta una previsione": "4. Interpret a prediction",
  "scegli il modello corretto e inserisci campi di programma: aeroporto, vettore, ora locale, mese, giorno (lunedì = 0) e distanza in miglia. L'orizzonte è":
    "select the appropriate model and enter schedule fields: airport, carrier, local hour, month, weekday (Monday = 0) and distance in miles. The horizon is",
  "120 minuti prima della partenza programmata":
    "120 minutes before scheduled departure",
  ". Il risultato riguarda il ritardo di partenza, non l'arrivo. Valori negativi indicano anticipo.":
    ". The result concerns departure delay, not arrival. Negative values mean early departure.",
  "Un MAE di 7 minuti significa un errore assoluto medio di 7 minuti nel test indicato; non significa accuratezza del 93%. RMSE pesa maggiormente gli errori grandi. Confronta il modello con la baseline sullo stesso test temporale. L'intervallo nominale al 90% descrive residui storici: controlla la copertura misurata e non interpretarlo come una garanzia sul prossimo volo.":
    "An MAE of 7 minutes means a mean absolute error of 7 minutes on the stated test; it does not mean 93% accuracy. RMSE gives greater weight to large errors. Compare the model with the baseline on the same temporal test. The nominal 90% interval describes historical residuals: check measured coverage and do not interpret it as a guarantee for the next flight.",
  "5. Confronta scenari, senza confonderli con previsioni":
    "5. Compare scenarios and interpret their assumptions",
  Nel: "In the",
  ", scegli aeroporto, riduzione di capacità, durata, repliche e seed. Esegui prima 0%: il ritardo aggiuntivo deve essere zero. Poi aumenta la riduzione mantenendo lo stesso seed. La differenza confronta due code con gli stessi input casuali; le fasce P10–P90 descrivono variabilità delle repliche, non probabilità di impatto reale.":
    ", choose airport, capacity reduction, duration, replications and seed. Run 0% first: additional delay must be zero. Then increase the reduction with the same seed. The difference compares two queues with identical random inputs; P10–P90 bands describe replication variability, not real-impact probabilities.",
  "Legenda e limiti": "Legend and limitations",
  "dati inventati con un generatore riproducibile. Le prestazioni del modello demo non misurano la qualità delle previsioni nel mondo reale.":
    "invented data from a reproducible generator. Demo model performance does not measure real-world forecasting quality.",
  "osservazioni della comunità ADS-B, con copertura incompleta, possibili ritardi e campi mancanti. Il callsign non verifica rotta, destinazione, compagnia o ritardo. Conteggi e salite/discese sono osservazioni/proxy, non statistiche ufficiali di movimenti aeroportuali.":
    "community ADS-B observations with incomplete coverage, possible delays and missing fields. Callsign does not verify route, destination, airline or delay. Counts and climb/descent are observations/proxies, not official airport movement statistics.",
  "modello ipotetico: 150 voli pronti in 6 ore, pista equivalente unica, servizio lognormale e margine di connessione assunto. La rete contestualizza gli aeroporti; non ricostruisce rotazioni reali di aeromobili, equipaggi, meteo o vincoli di settore.":
    "hypothetical model: 150 flights ready over 6 hours, one equivalent runway, lognormal service and assumed connection slack. The network provides airport context; it does not reconstruct actual aircraft rotations, crews, weather or sector constraints.",
  "Un'importazione reale non rende automaticamente valido un modello: servono copertura adeguata, confronti temporali, controlli per aeroporto e deriva. AeroTwin blocca modelli non coerenti con lo snapshot e categorie fuori addestramento, ma questo non sostituisce la validazione scientifica. Non è un sistema certificato per dispatch, controllo del traffico aereo o decisioni di sicurezza.":
    "Real-data import does not automatically validate a model: adequate coverage, temporal comparisons, airport checks and drift checks are needed. AeroTwin blocks models inconsistent with the snapshot and categories outside training support; this does not replace scientific validation. It is not certified for dispatch, air traffic control or safety decisions.",
  "Dati locali, backup e aggiornamenti": "Local data, backups and updates",
  "Arresta con Ctrl-C. Per un backup completo copia la cartella":
    "Stop with Ctrl-C. For a complete backup, copy the folder",
  "mentre il server è fermo.": "while the server is stopped.",
  "permette di conservare dati e modelli fuori dal codice, anche durante un aggiornamento. Le partizioni precedenti sono conservate: lo spazio su disco cresce con gli import; la pulizia resta manuale a server fermo. Le operazioni aperte al momento dell'arresto vengono marcate come interrotte al riavvio.":
    "keeps data and models outside the source code, including during updates. Previous partitions are retained: disk usage grows with imports; cleanup remains manual with the server stopped. Operations open at shutdown are marked interrupted on restart.",
  "Distribuzione locale: un solo utente/ambiente fidato, server su 127.0.0.1, nessuna autenticazione. Per ospitarlo su Internet occorrono autenticazione, HTTPS, isolamento e gestione delle risorse, che questa versione non include.":
    "Local distribution: one user/trusted environment, server on 127.0.0.1, no authentication. Public Internet hosting requires authentication, HTTPS, isolation and resource management, which this version does not provide.",
};
