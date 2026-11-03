import { Link } from "react-router-dom";
import { Panel, Badge } from "../components/UI";
export default function Guide() {
  return (
    <div className="methodology">
      <Panel title="Guida rapida · italiano">
        <p>
          AeroTwin è un'applicazione locale per esplorare osservazioni ADS-B,
          analizzare voli, eseguire esperimenti predittivi e confrontare scenari
          ipotetici. Ogni risultato deve essere letto insieme alla sua fonte.
        </p>
        <div className="guide-step">
          <h3>1. Inizia dalla demo offline</h3>
          <p>
            Apri <Link to="/radar">Live radar</Link> e mantieni{" "}
            <b>Synthetic demo</b>. Seleziona un aeromobile sulla mappa o nella
            lista; prova ricerca, quota e velocità. <b>Replay</b> riproduce
            esempi sintetici di Barcellona del 1 gennaio 2025: l'orario è quello
            della registrazione, non quello attuale.
          </p>
        </div>
        <div className="guide-step">
          <h3>2. Attiva osservazioni reali</h3>
          <p>
            Scegli <b>Live ADS-B</b>, una regione e il raggio (1 NM = 1,852 km).
            Servono Internet e disponibilità del provider. Una risposta vuota
            non dimostra assenza di traffico. <b>LIVE UNAVAILABLE</b> significa
            che il feed non è disponibile; la demo si attiva solo con una scelta
            esplicita.
          </p>
        </div>
        <div className="guide-step">
          <h3>Unità in tempo reale</h3>
          <p>
            Apri <b>Units</b> nella barra superiore: scegli <b>Metric units</b>{" "}
            oppure cambia quota (ft/m), velocità (kt/km/h/mph), distanza
            (NM/km/mi) e velocità verticale (ft/min o m/s). Le schede, le mappe,
            i filtri e le distanze del modello si aggiornano subito; la
            selezione rimane salvata su questo browser. I dati originali e i CSV
            mantengono le unità della fonte.
          </p>
        </div>
        <div className="guide-step">
          <h3>3. Carica dati storici e addestra</h3>
          <p>
            In <Link to="/data">Data & experiments</Link>, importa un CSV
            ufficiale BTS; aggiungi i fusi IANA degli aeroporti mancanti. Il
            browser accetta fino a 20 MiB; la CLI serve per file più grandi.
            Ogni importazione riuscita sostituisce lo snapshot attivo. Controlla
            copertura, righe nulle, cancellazioni e duplicati prima di
            selezionare <b>Imported BTS</b> e avviare{" "}
            <b>Train and evaluate model</b>. Non caricare file riservati in un
            repository pubblico.
          </p>
        </div>
        <div className="guide-step">
          <h3>4. Interpreta una previsione</h3>
          <p>
            In <Link to="/forecast">Forecast lab</Link> scegli il modello
            corretto e inserisci campi di programma: aeroporto, vettore, ora
            locale, mese, giorno (lunedì = 0) e distanza in miglia. L'orizzonte
            è <b>120 minuti prima della partenza programmata</b>. Il risultato
            riguarda il ritardo di partenza, non l'arrivo. Valori negativi
            indicano anticipo.
          </p>
          <p>
            Un MAE di 7 minuti significa un errore assoluto medio di 7 minuti
            nel test indicato; non significa accuratezza del 93%. RMSE pesa
            maggiormente gli errori grandi. Confronta il modello con la baseline
            sullo stesso test temporale. L'intervallo nominale al 90% descrive
            residui storici: controlla la copertura misurata e non interpretarlo
            come una garanzia sul prossimo volo.
          </p>
        </div>
        <div className="guide-step">
          <h3>5. Confronta scenari, senza confonderli con previsioni</h3>
          <p>
            Nel <Link to="/network">Disruption simulator</Link>, scegli
            aeroporto, riduzione di capacità, durata, repliche e seed. Esegui
            prima 0%: il ritardo aggiuntivo deve essere zero. Poi aumenta la
            riduzione mantenendo lo stesso seed. La differenza confronta due
            code con gli stessi input casuali; le fasce P10–P90 descrivono
            variabilità delle repliche, non probabilità di impatto reale.
          </p>
        </div>
      </Panel>
      <Panel title="Legenda e limiti">
        <p>
          <Badge tone="amber">SYNTHETIC DEMO</Badge> dati inventati con un
          generatore riproducibile. Le prestazioni del modello demo non misurano
          la qualità delle previsioni nel mondo reale.
        </p>
        <p>
          <Badge>LIVE</Badge> osservazioni della comunità ADS-B, con copertura
          incompleta, possibili ritardi e campi mancanti. Il callsign non
          verifica rotta, destinazione, compagnia o ritardo. Conteggi e
          salite/discese sono osservazioni/proxy, non statistiche ufficiali di
          movimenti aeroportuali.
        </p>
        <p>
          <Badge tone="amber">SIMULATION</Badge> modello ipotetico: 150 voli
          pronti in 6 ore, pista equivalente unica, servizio lognormale e
          margine di connessione assunto. La rete contestualizza gli aeroporti;
          non ricostruisce rotazioni reali di aeromobili, equipaggi, meteo o
          vincoli di settore.
        </p>
        <p>
          Un'importazione reale non rende automaticamente valido un modello:
          servono copertura adeguata, confronti temporali, controlli per
          aeroporto e deriva. AeroTwin blocca modelli non coerenti con lo
          snapshot e categorie fuori addestramento, ma questo non sostituisce la
          validazione scientifica. Non è un sistema certificato per dispatch,
          controllo del traffico aereo o decisioni di sicurezza.
        </p>
      </Panel>
      <Panel title="Dati locali, backup e aggiornamenti">
        <p>
          Arresta con Ctrl-C. Per un backup completo copia la cartella{" "}
          <code>data/processed</code> e <code>models</code> mentre il server è
          fermo. <code>AEROTWIN_HOME</code> permette di conservare dati e
          modelli fuori dal codice, anche durante un aggiornamento. Le
          partizioni precedenti sono conservate: lo spazio su disco cresce con
          gli import; la pulizia resta manuale a server fermo. Le operazioni
          aperte al momento dell'arresto vengono marcate come interrotte al
          riavvio.
        </p>
        <p>
          Distribuzione locale: un solo utente/ambiente fidato, server su
          127.0.0.1, nessuna autenticazione. Per ospitarlo su Internet occorrono
          autenticazione, HTTPS, isolamento e gestione delle risorse, che questa
          versione non include.
        </p>
      </Panel>
    </div>
  );
}
