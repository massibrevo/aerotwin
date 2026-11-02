import { useEffect, useState } from "react";
import { NavLink, Link, Route, Routes, useLocation } from "react-router-dom";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Compass,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Plane,
  Radio,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { request, useApi } from "./api";
import { Badge } from "./components/UI";
import { presets } from "./presets";
import type { Mode, Airport, Aircraft, Snapshot, Summary } from "./types";
import Overview from "./pages/Overview";
import Radar from "./pages/Radar";
import Pulse from "./pages/Pulse";
import Historical from "./pages/Historical";
import Forecast from "./pages/Forecast";
import Simulator from "./pages/Simulator";
import DataPage from "./pages/DataPage";
import About from "./pages/About";
const nav = [
  ["/", "Control tower", Gauge],
  ["/radar", "Live radar", Radio],
  ["/pulse", "Airport pulse", Activity],
  ["/history", "Historical explorer", Layers],
  ["/forecast", "Forecast lab", FlaskConical],
  ["/network", "Disruption simulator", GitBranch],
  ["/data", "Data & experiments", Database],
  ["/about", "Methodology", BookOpen],
] as const;
export default function App() {
  const [mode, setMode] = useState<Mode>("demo");
  const [region, setRegion] = useState<Airport>(presets[0]);
  const [radius, setRadius] = useState(100);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [radarError, setRadarError] = useState("");
  const [selected, setSelected] = useState<Aircraft>();
  const [frame, setFrame] = useState(0);
  const [refresh, setRefresh] = useState(30);
  const [paused, setPaused] = useState(false);
  const [reload, setReload] = useState(0);
  const [dataset, setDataset] = useState("synthetic");
  const [tick, setTick] = useState(Date.now());
  const summary = useApi<Summary>("/historical/summary?dataset=" + dataset);
  const location = useLocation();
  useEffect(() => {
    setSnapshot(undefined);
    setRadarError("");
    setSelected(undefined);
    const abort = new AbortController();
    request<Snapshot>(
      `/aircraft?mode=${mode}&lat=${region.lat}&lon=${region.lon}&radius_nm=${radius}&frame=${frame}`,
      { signal: abort.signal },
    )
      .then(setSnapshot)
      .catch((e) => {
        if (e.name !== "AbortError") setRadarError(e.message);
      });
    return () => abort.abort();
  }, [mode, region, radius, frame, reload]);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(
      () => {
        if (!document.hidden) {
          if (mode === "live") setReload((v) => v + 1);
          else setFrame((f) => (f + 1) % 100000);
        }
      },
      Math.max(30, refresh) * 1000,
    );
    return () => clearInterval(id);
  }, [mode, refresh, paused]);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const age =
    mode === "live" && snapshot?.received_at
      ? Math.max(0, (tick - Date.parse(snapshot.received_at)) / 1000)
      : null;
  const title = nav.find((n) => n[0] === location.pathname)?.[1] ?? "AeroTwin";
  const props = {
    mode,
    setMode,
    region,
    setRegion,
    radius,
    setRadius,
    snapshot,
    radarError,
    selected,
    setSelected,
    frame,
    setFrame,
    refresh,
    setRefresh,
    paused,
    setPaused,
    age,
    refreshNow: () => setReload((v) => v + 1),
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <div className="brand-symbol">
            <Plane size={25} />
          </div>
          <span>
            AeroTwin<small>AVIATION INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace-label">
          WORKSPACE <span>LOCAL</span>
        </div>
        <nav>
          {nav.map(([path, label, Icon], i) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={18} />
              <span>{label}</span>
              {i === 1 && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <ShieldCheck size={17} />
            <div>
              Local-first workspace<small>No keys. No telemetry.</small>
            </div>
          </div>
          <div className="version">
            AEROTWIN / v0.1.0 <span>RESEARCH</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>{title}</span>
          </div>
          <div className="topbar-right">
            <span className="utc-clock">
              {new Date(tick).toISOString().slice(11, 19)} UTC
            </span>
            <Badge tone={mode === "live" ? "cyan" : "amber"}>
              {mode === "demo"
                ? "SYNTHETIC DEMO"
                : mode === "replay"
                  ? "REPLAY · SYNTHETIC"
                  : snapshot?.status === "live"
                    ? "LIVE"
                    : "LIVE UNAVAILABLE"}
            </Badge>
            <div className="avatar">AT</div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                AEROTWIN /{" "}
                {location.pathname === "/"
                  ? "OPERATIONS OVERVIEW"
                  : title.toUpperCase()}
              </div>
              <h1>
                {location.pathname === "/"
                  ? "Your airspace. In perspective."
                  : title}
              </h1>
              <p>
                {location.pathname === "/"
                  ? "Observe the skies. Explore the data. Understand the network."
                  : "A transparent workspace for aviation research and reproducible experiments."}
              </p>
            </div>
            <div className="heading-actions">
              <label className="compact">
                Historical dataset
                <select
                  aria-label="Historical dataset"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                >
                  <option value="synthetic">Synthetic examples</option>
                  <option value="bts">Imported BTS</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mode-banner">
            <Compass size={16} />
            <span>
              {mode === "demo"
                ? `Offline workspace · Aircraft are synthetic examples. Historical dataset: ${dataset === "synthetic" ? "synthetic examples" : "imported BTS"}.`
                : mode === "replay"
                  ? "Replay · Bundled synthetic BCN snapshots recorded at a fixed example epoch."
                  : "Live ADS-B · Community observations in queried coverage; no verified routes or delay information."}
            </span>
            <Link to="/about">
              Read methodology <ArrowRight size={13} />
            </Link>
          </div>
          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  summary={summary.data}
                  error={summary.error}
                  {...props}
                />
              }
            />
            <Route path="/radar" element={<Radar {...props} />} />
            <Route
              path="/pulse"
              element={<Pulse {...props} dataset={dataset} />}
            />
            <Route
              path="/history"
              element={<Historical dataset={dataset} setMode={setMode} />}
            />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/network" element={<Simulator dataset={dataset} />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/about" element={<About />} />
            <Route
              path="*"
              element={
                <div className="notice">
                  Page not found. <Link to="/">Return to control tower</Link>
                </div>
              }
            />
          </Routes>
          <footer>
            <span>
              <i className="dot" /> LOCAL COMPUTE · OPEN SOURCE
            </span>
            <span>
              Research & education only · Not for operational aviation decisions
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
