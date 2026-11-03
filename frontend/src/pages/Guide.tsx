import { tx, useLocale } from "../i18n";
import { Link } from "react-router-dom";
import { Panel, Badge } from "../components/UI";
export default function Guide() {
  useLocale();
  return (
    <div className="methodology">
      <Panel title={tx("Guida rapida · italiano")}>
        <p>
          {tx(
            "AeroTwin è un'applicazione locale per esplorare osservazioni ADS-B, analizzare voli, eseguire esperimenti predittivi e confrontare scenari ipotetici. Ogni risultato deve essere letto insieme alla sua fonte.",
          )}
        </p>
        <div className="guide-step">
          <h3>{tx("1. Inizia dalla demo offline")}</h3>
          <p>
            {tx("Apri ")}
            <Link to="/radar">{tx("Live radar")}</Link> {tx(" e mantieni")}
            {tx(" ")}
            <b>{tx("Synthetic demo")}</b>
            {tx(
              ". Seleziona un aeromobile sulla mappa o nella lista; prova ricerca, quota e velocità. ",
            )}
            <b>{tx("Replay")}</b>{" "}
            {tx(
              " riproduce esempi sintetici di Barcellona del 1 gennaio 2025: l'orario è quello della registrazione, non quello attuale.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("2. Attiva osservazioni reali")}</h3>
          <p>
            {tx("Scegli ")}
            <b>{tx("Live ADS-B")}</b>
            {tx(
              ", una regione e il raggio (1 NM = 1,852 km). Servono Internet e disponibilità del provider. Una risposta vuota non dimostra assenza di traffico. ",
            )}
            <b>{tx("LIVE UNAVAILABLE")}</b>{" "}
            {tx(
              " significa che il feed non è disponibile; la demo si attiva solo con una scelta esplicita.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("Unità in tempo reale")}</h3>
          <p>
            {tx("Usa l’interruttore ")}
            <b>{tx("Metric")}</b>{" "}
            {tx(
              " nella barra superiore per convertire tutto con un clic. Per le singole unità, apri",
            )}
            {tx(" ")}
            <b>{tx("Units")}</b> {tx(" e scegli ")}
            <b>{tx("Metric units")}</b>{" "}
            {tx(
              " oppure cambia quota (ft/m), velocità (kt/km/h/mph), distanza (NM/km/mi) e velocità verticale (ft/min o m/s). Le schede, le mappe, i filtri e le distanze del modello si aggiornano subito; la selezione rimane salvata su questo browser. I dati originali e i CSV mantengono le unità della fonte.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("Ricerca e preferiti")}</h3>
          <p>
            {tx(
              "Nel radar cerca callsign, registrazione o ICAO. In Live ADS-B,",
            )}
            {tx(" ")}
            <b>{tx("Find worldwide")}</b>{" "}
            {tx(" cerca una corrispondenza esatta e")}
            {tx(" ")}
            <b>{tx("Locate on radar")}</b> {tx(" sposta la regione. ")}
            <b>{tx("Save aircraft")}</b> {tx(" e")}
            {tx(" ")}
            <b>{tx("Favourites")}</b>{" "}
            {tx(
              " conservano solo identità nel browser, con live/demo/replay separati. Le schede aggiungono riferimenti HexDB: proprietario registrato e compagnia operativa possono differire; le rotte da callsign sono sempre riferimenti non verificati, con data della fonte.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("Analytics studio e diagnostica")}</h3>
          <p>
            {tx("Apri ")}
            <Link to="/analytics">{tx("Analytics studio")}</Link>
            {tx(
              ", scegli il dataset e confronta periodi A e B senza sovrapposizione. Controlla campioni, etichette mancanti, denominatori e composizione dei gruppi; esporta il confronto in JSON. Il cambiamento standardizzato resta descrittivo, non causale.",
            )}
          </p>
          <p>
            {tx(
              "In Forecast lab i nuovi modelli mostrano residui, bootstrap per data contro la baseline, copertura per gruppo e cambiamenti degli input. La sensibilità ricalcola una variabile alla volta: non è una spiegazione causale né una somma di contributi. Per modelli preesistenti, riaddestra esplicitamente il dataset scelto per generare queste diagnostiche.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("3. Carica dati storici e addestra")}</h3>
          <p>
            {tx("In ")}
            <Link to="/data">{tx("Data & experiments")}</Link>
            {tx(
              ", importa un CSV ufficiale BTS; aggiungi i fusi IANA degli aeroporti mancanti. Il browser accetta fino a 20 MiB; la CLI serve per file più grandi. Ogni importazione riuscita sostituisce lo snapshot attivo. Controlla copertura, righe nulle, cancellazioni e duplicati prima di selezionare ",
            )}
            <b>{tx("Imported BTS")}</b> {tx(" e avviare")}
            {tx(" ")}
            <b>{tx("Train and evaluate model")}</b>
            {tx(". Non caricare file riservati in un repository pubblico.")}
          </p>
        </div>
        <div className="guide-step">
          <h3>{tx("4. Interpreta una previsione")}</h3>
          <p>
            {tx("In ")}
            <Link to="/forecast">{tx("Forecast lab")}</Link>{" "}
            {tx(
              " scegli il modello corretto e inserisci campi di programma: aeroporto, vettore, ora locale, mese, giorno (lunedì = 0) e distanza in miglia. L'orizzonte è ",
            )}
            <b>{tx("120 minuti prima della partenza programmata")}</b>
            {tx(
              ". Il risultato riguarda il ritardo di partenza, non l'arrivo. Valori negativi indicano anticipo.",
            )}
          </p>
          <p>
            {tx(
              "Un MAE di 7 minuti significa un errore assoluto medio di 7 minuti nel test indicato; non significa accuratezza del 93%. RMSE pesa maggiormente gli errori grandi. Confronta il modello con la baseline sullo stesso test temporale. L'intervallo nominale al 90% descrive residui storici: controlla la copertura misurata e non interpretarlo come una garanzia sul prossimo volo.",
            )}
          </p>
        </div>
        <div className="guide-step">
          <h3>
            {tx("5. Confronta scenari, senza confonderli con previsioni")}
          </h3>
          <p>
            {tx("Nel ")}
            <Link to="/network">{tx("Disruption simulator")}</Link>
            {tx(
              ", scegli aeroporto, riduzione di capacità, durata, repliche e seed. Esegui prima 0%: il ritardo aggiuntivo deve essere zero. Poi aumenta la riduzione mantenendo lo stesso seed. La differenza confronta due code con gli stessi input casuali; le fasce P10–P90 descrivono variabilità delle repliche, non probabilità di impatto reale.",
            )}
          </p>
        </div>
      </Panel>
      <Panel title={tx("Legenda e limiti")}>
        <p>
          <Badge tone="amber">{tx("SYNTHETIC DEMO")}</Badge>{" "}
          {tx(
            " dati inventati con un generatore riproducibile. Le prestazioni del modello demo non misurano la qualità delle previsioni nel mondo reale.",
          )}
        </p>
        <p>
          <Badge>{tx("LIVE")}</Badge>{" "}
          {tx(
            " osservazioni della comunità ADS-B, con copertura incompleta, possibili ritardi e campi mancanti. Il callsign non verifica rotta, destinazione, compagnia o ritardo. Conteggi e salite/discese sono osservazioni/proxy, non statistiche ufficiali di movimenti aeroportuali.",
          )}
        </p>
        <p>
          <Badge tone="amber">{tx("SIMULATION")}</Badge>{" "}
          {tx(
            " modello ipotetico: 150 voli pronti in 6 ore, pista equivalente unica, servizio lognormale e margine di connessione assunto. La rete contestualizza gli aeroporti; non ricostruisce rotazioni reali di aeromobili, equipaggi, meteo o vincoli di settore.",
          )}
        </p>
        <p>
          {tx(
            "Un'importazione reale non rende automaticamente valido un modello: servono copertura adeguata, confronti temporali, controlli per aeroporto e deriva. AeroTwin blocca modelli non coerenti con lo snapshot e categorie fuori addestramento, ma questo non sostituisce la validazione scientifica. Non è un sistema certificato per dispatch, controllo del traffico aereo o decisioni di sicurezza.",
          )}
        </p>
      </Panel>
      <Panel title={tx("Dati locali, backup e aggiornamenti")}>
        <p>
          {tx("Arresta con Ctrl-C. Per un backup completo copia la cartella")}
          {tx(" ")}
          <code>{tx("data/processed")}</code> {tx(" e ")}
          <code>{tx("models")}</code> {tx(" mentre il server è fermo. ")}
          <code>{tx("AEROTWIN_HOME")}</code>{" "}
          {tx(
            " permette di conservare dati e modelli fuori dal codice, anche durante un aggiornamento. Le partizioni precedenti sono conservate: lo spazio su disco cresce con gli import; la pulizia resta manuale a server fermo. Le operazioni aperte al momento dell'arresto vengono marcate come interrotte al riavvio.",
          )}
        </p>
        <p>
          {tx(
            "Distribuzione locale: un solo utente/ambiente fidato, server su 127.0.0.1, nessuna autenticazione. Per ospitarlo su Internet occorrono autenticazione, HTTPS, isolamento e gestione delle risorse, che questa versione non include.",
          )}
        </p>
      </Panel>
    </div>
  );
}
