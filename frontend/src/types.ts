export type Mode = "demo" | "live" | "replay";
export interface Airport {
  iata: string;
  name: string;
  lat: number;
  lon: number;
  tz: string;
}
export interface Aircraft {
  icao24: string;
  callsign: string | null;
  lat: number;
  lon: number;
  altitude_ft: number | null;
  ground_speed_kt: number | null;
  track_deg: number | null;
  vertical_rate_fpm: number | null;
  ground: boolean;
  observed_at_utc: string;
  received_at_utc: string;
  provider: string;
  data_age_seconds: number;
}
export interface Snapshot {
  mode: Mode;
  status: string;
  source: string;
  aircraft: Aircraft[];
  received_at: string | null;
  error?: string;
  attribution: string;
  frame?: number;
  retry_after_seconds?: number;
}
export interface Flight {
  flight_id: string;
  date: string;
  carrier: string;
  origin: string;
  dest: string;
  hour: number;
  month: number;
  dow: number;
  distance: number;
  dep_delay: number | null;
  cancelled: boolean;
  diverted: boolean;
  scheduled_utc: string;
}
export interface History {
  total: number;
  page: number;
  page_size: number;
  data_class: string;
  coverage: string[];
  rows: Flight[];
}
export interface Summary {
  data_class: string;
  rows: number;
  airports: number;
  mean_delay: number | null;
  null_delay: number;
  cancelled: number;
  coverage: string[];
  daily: { date: string; flights: number; delay: number }[];
  routes: { origin: string; dest: string; flights: number; delay: number }[];
  airlines: { carrier: string; flights: number; delay: number }[];
}
export interface Model {
  model_id: string;
  label: string;
  data_class: string;
  selected_model: string;
  trained_at: string;
  target: string;
  horizon_minutes: number;
  features: string[];
  metrics: Record<
    string,
    {
      validation: { mae: number; rmse: number };
      test: { mae: number; rmse: number };
    }
  >;
  n: Record<string, number>;
  windows: Record<string, string[]>;
  interval_test_coverage: number;
  global_permutation_importance: Record<string, number>;
  validation_chart: { actual: number; predicted: number }[];
  rolling_origin: {
    start: string;
    train_n: number;
    test_n: number;
    mae: number;
    rmse: number;
  }[];
  support?: {
    origins: string[];
    destinations: string[];
    carriers: string[];
    numeric_ranges: Record<string, number[]>;
  };
  subgroup_test_metrics?: Record<
    string,
    { n: number; mae: number; rmse: number }
  >;
  caveat: string;
}
export interface Prediction {
  prediction_minutes: number;
  interval_minutes: number[];
  label: string;
  horizon_minutes: number;
  caveat: string;
  warnings: string[];
}
export interface Network {
  data_class: string;
  coverage: string[];
  nodes: {
    iata: string;
    degree: number;
    betweenness: number;
    traffic: number;
    risk_index: number;
    lat: number | null;
    lon: number | null;
  }[];
  edges: { origin: string; dest: string; flights: number }[];
  risk_definition: string;
}
export interface Simulation {
  id: string;
  mode: string;
  airport: string;
  seed: number;
  repetitions: number;
  baseline_mean_minutes: number;
  scenario_mean_minutes: number;
  additional_delay_minutes: number;
  delta_p10_p90: number[];
  downstream_mean_minutes: number;
  peak_queue_aircraft: number;
  chart: { minute: number; baseline: number; scenario: number }[];
  replication_deltas: number[];
  assumptions: string[];
}
export interface Sources {
  sources: {
    name: string;
    class: string;
    license: string;
    url: string | null;
    note?: string;
    rows?: number;
  }[];
  bts_import: Record<string, unknown> | null;
  experiments: Record<string, unknown>[];
  simulation_history: Simulation[];
}

export type RadarProps = {
  mode: Mode;
  setMode: (m: Mode) => void;
  region: Airport;
  setRegion: (r: Airport) => void;
  radius: number;
  setRadius: (r: number) => void;
  snapshot?: Snapshot;
  radarError: string;
  selected?: Aircraft;
  setSelected: (a: Aircraft | undefined) => void;
  frame: number;
  setFrame: (f: number) => void;
  refresh: number;
  setRefresh: (n: number) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  age: number | null;
  refreshNow: () => void;
};

export interface DatasetInfo {
  dataset: string;
  rows: number;
  origins: string[];
  destinations: string[];
  carriers: string[];
  coverage: string[];
  revision: string;
}
