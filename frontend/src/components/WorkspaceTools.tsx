import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Search,
  ArrowUpRight,
  Gauge,
  Radio,
  Activity,
  Layers,
  FlaskConical,
  GitBranch,
  Database,
  BookOpen,
  Sun,
  Moon,
  Command as CommandIcon,
} from "lucide-react";
export function Tip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="app-tooltip" side="right" sideOffset={10}>
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
export const sections = [
  {
    path: "/",
    label: "Control tower",
    description: "Your airspace and data at a glance",
    icon: Gauge,
    color: "blue",
  },
  {
    path: "/radar",
    label: "Live radar",
    description: "Explore aircraft on the map",
    icon: Radio,
    color: "cyan",
  },
  {
    path: "/pulse",
    label: "Airport pulse",
    description: "Traffic observations and schedules",
    icon: Activity,
    color: "green",
  },
  {
    path: "/history",
    label: "Historical explorer",
    description: "Search and export flight records",
    icon: Layers,
    color: "indigo",
  },
  {
    path: "/forecast",
    label: "Forecast lab",
    description: "Models, inference and uncertainty",
    icon: FlaskConical,
    color: "violet",
  },
  {
    path: "/network",
    label: "Disruption simulator",
    description: "Network science and scenario experiments",
    icon: GitBranch,
    color: "orange",
  },
  {
    path: "/data",
    label: "Data & experiments",
    description: "Import data and train local models",
    icon: Database,
    color: "teal",
  },
  {
    path: "/about",
    label: "Methodology",
    description: "Sources, assumptions and limitations",
    icon: BookOpen,
    color: "slate",
  },
  {
    path: "/guide",
    label: "Guida all’uso",
    description: "Istruzioni e interpretazione in italiano",
    icon: BookOpen,
    color: "slate",
  },
];
export function WorkspaceTools({
  theme,
  onTheme,
}: {
  theme: string;
  onTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((x) => !x);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };
  return (
    <>
      <button
        className="workspace-search"
        onClick={() => setOpen(true)}
        aria-label="Search workspace"
      >
        <Search size={17} />
        <span>Search workspace…</span>
        <kbd>⌘ K</kbd>
      </button>
      <button
        className="theme-toggle"
        onClick={onTheme}
        aria-label={
          theme === "light" ? "Switch to dark theme" : "Switch to light theme"
        }
        title="Change workspace theme"
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Navigate AeroTwin"
        className="command-dialog"
      >
        <div className="command-search">
          <Search size={20} />
          <Command.Input placeholder="Find a page or action…" />
          <kbd>ESC</kbd>
        </div>
        <Command.List>
          <Command.Empty>No matching pages or actions.</Command.Empty>
          <Command.Group heading="Workspace">
            {sections.map((s) => (
              <Command.Item
                key={s.path}
                value={`${s.label} ${s.description}`}
                onSelect={() => go(s.path)}
              >
                <span className={`command-icon accent-${s.color}`}>
                  <s.icon size={18} />
                </span>
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.description}</small>
                </span>
                <ArrowUpRight size={15} />
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Appearance">
            <Command.Item
              onSelect={() => {
                onTheme();
                setOpen(false);
              }}
            >
              <CommandIcon size={18} />
              <span>
                Switch to {theme === "light" ? "dark" : "light"} theme
              </span>
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="command-footer">
          <span>↑ ↓ to navigate</span>
          <span>↵ to open</span>
          <span>Local workspace</span>
        </div>
      </Command.Dialog>
    </>
  );
}
