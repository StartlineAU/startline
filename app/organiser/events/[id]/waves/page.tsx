"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ChevronRight, Plus, Pencil, Trash2, Download,
  ListOrdered, Users, CheckCircle, Zap, AlertCircle,
} from "lucide-react";
import OrganiserTopBar from "@/components/organiser/TopBar";
import EventPageTabs from "@/components/organiser/EventPageTabs";

interface Wave {
  id: string;
  label: string;
  criteria: string;
  capacity: number;
  startTime: string;
  assigned: number;
}

interface EventInfo {
  id: string;
  title: string;
}

const DEFAULTS: Wave[] = [
  { id: "w1", label: "Elite", criteria: "Invited athletes",  capacity: 50,  startTime: "07:00", assigned: 48  },
  { id: "w2", label: "A",     criteria: "Under 40 min 10K", capacity: 500, startTime: "07:15", assigned: 312 },
  { id: "w3", label: "B",     criteria: "40–50 min",        capacity: 600, startTime: "07:30", assigned: 287 },
  { id: "w4", label: "C",     criteria: "50–60 min",        capacity: 800, startTime: "07:50", assigned: 198 },
  { id: "w5", label: "D",     criteria: "Over 60 min",      capacity: 700, startTime: "08:15", assigned: 203 },
];

const inputCls =
  "w-full bg-dark-light border border-dark-lighter rounded-[10px] px-[13px] py-[10px] text-[13.5px] font-body text-light placeholder:text-muted-dark focus:border-primary focus:outline-none transition-colors box-border";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-headline font-bold text-[10.5px] uppercase tracking-[0.15em] text-muted mb-[7px]">
      {children}
    </label>
  );
}

export default function WaveAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event,  setEvent]  = useState<EventInfo | null>(null);
  const [waves,  setWaves]  = useState<Wave[]>(DEFAULTS.map(w => ({ ...w })));
  const [editing, setEditing] = useState<Wave | null>(null);
  const [adding,  setAdding]  = useState(false);
  const [draft,   setDraft]   = useState({ label: "", criteria: "", capacity: "", startTime: "" });
  const [exportFmt, setExportFmt] = useState<"CSV" | "JSON" | "XML">("CSV");

  useEffect(() => {
    fetch(`/api/organiser/events/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setEvent({ id: d.id, title: d.title }))
      .catch(() => null);
  }, [id]);

  const totalCap      = waves.reduce((s, w) => s + w.capacity, 0);
  const totalAssigned = waves.reduce((s, w) => s + w.assigned, 0);

  const doExport = () => {
    const eventId = event?.id ?? id;
    let content: string, mime: string, ext: string;

    if (exportFmt === "JSON") {
      content = JSON.stringify(
        waves.map(w => ({
          wave: w.label, startTime: w.startTime, criteria: w.criteria,
          capacity: w.capacity, assigned: w.assigned, remaining: w.capacity - w.assigned,
        })),
        null, 2,
      );
      mime = "application/json"; ext = "json";
    } else if (exportFmt === "XML") {
      const rows = waves.map(w =>
        `  <wave label="${w.label}" startTime="${w.startTime}" capacity="${w.capacity}" assigned="${w.assigned}" remaining="${w.capacity - w.assigned}"><criteria>${w.criteria}</criteria></wave>`,
      ).join("\n");
      content = `<?xml version="1.0" encoding="UTF-8"?>\n<waves event="${eventId}">\n${rows}\n</waves>`;
      mime = "application/xml"; ext = "xml";
    } else {
      const header = ["Wave", "Start Time", "Criteria", "Capacity", "Assigned", "Remaining"].join(",");
      const body   = waves.map(w =>
        [w.label, w.startTime, `"${w.criteria}"`, w.capacity, w.assigned, w.capacity - w.assigned].join(","),
      );
      content = [header, ...body].join("\n");
      mime = "text/csv"; ext = "csv";
    }

    const blob = new Blob([content], { type: mime });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `${eventId}-wave-assignments.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addWave = () => {
    if (!draft.label.trim()) return;
    setWaves(ws => [
      ...ws,
      { id: "w" + Date.now(), label: draft.label, criteria: draft.criteria,
        capacity: parseInt(draft.capacity) || 0, startTime: draft.startTime, assigned: 0 },
    ]);
    setDraft({ label: "", criteria: "", capacity: "", startTime: "" });
    setAdding(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    setWaves(ws => ws.map(w => w.id === editing.id ? { ...editing, capacity: parseInt(String(editing.capacity)) || 0 } : w));
    setEditing(null);
  };

  const stats = [
    { label: "Waves",          value: waves.length,                  Icon: ListOrdered  },
    { label: "Total capacity", value: totalCap.toLocaleString(),      Icon: Users        },
    { label: "Assigned",       value: totalAssigned.toLocaleString(), Icon: CheckCircle  },
    { label: "Remaining",      value: (totalCap - totalAssigned).toLocaleString(), Icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-dark-darker">
      <OrganiserTopBar />

      <main className="pt-14">
        <div className="max-w-[1240px] mx-auto px-6 py-[34px] pb-[90px] page-in">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 font-headline text-[11px] uppercase tracking-[0.15em] text-muted-dark mb-[22px]">
            <Link href="/organiser/listings" className="text-muted hover:text-light transition-colors">Listings</Link>
            <ChevronRight className="w-3 h-3" />
            {event && (
              <Link href={`/organiser/events/${id}/dashboard`} className="text-muted hover:text-light transition-colors max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                {event.title}
              </Link>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Waves</span>
          </div>

          {/* Tab strip */}
          <EventPageTabs eventId={id} active="waves" />

          {/* Page header */}
          <div className="flex items-end justify-between gap-5 flex-wrap mb-6">
            <div>
              <div className="font-headline font-bold text-[10px] uppercase tracking-[0.25em] text-primary mb-[10px]">
                Wave management{event ? ` · ${event.title}` : ""}
              </div>
              <h1 className="font-headline font-bold italic tracking-[-0.04em] leading-[0.92] text-light m-0"
                  style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
                Start wave<br />
                <span className="text-primary">assignments.</span>
              </h1>
            </div>

            <div className="flex gap-2.5 flex-wrap">
              {/* Format toggle */}
              <div className="flex border border-dark-lighter rounded-[12px] overflow-hidden">
                {(["CSV", "JSON", "XML"] as const).map((fmt, i) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFmt(fmt)}
                    className={[
                      "h-10 px-[13px] font-headline font-bold text-[10.5px] uppercase tracking-[0.12em] transition-all",
                      i < 2 ? "border-r border-dark-lighter" : "",
                      exportFmt === fmt
                        ? "bg-dark-light text-light"
                        : "bg-transparent text-muted-dark hover:text-muted",
                    ].join(" ")}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <button
                onClick={doExport}
                className="inline-flex items-center gap-2 h-10 px-4 border border-dark-lighter rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] text-light hover:border-primary hover:bg-dark-light transition-colors"
              >
                <Download className="w-[14px] h-[14px]" /> Export
              </button>

              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-gradient-to-br from-[#c2ec77] to-[#b3e153] text-dark rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] shadow-machined hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
              >
                <Plus className="w-[15px] h-[15px]" /> Add wave
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid gap-[14px] mb-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {stats.map(({ label, value, Icon }) => (
              <div key={label} className="bg-dark border border-dark-lighter rounded-[14px] px-5 py-[18px]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-headline font-bold text-[9.5px] uppercase tracking-[0.2em] text-muted">{label}</span>
                </div>
                <div className="font-headline font-bold italic tracking-[-0.03em] text-[34px] text-light leading-none">{value}</div>
              </div>
            ))}
          </div>

          {/* Wave table */}
          <div className="bg-dark border border-dark-lighter rounded-[14px] overflow-hidden mb-4">
            {/* Table header */}
            <div
              className="grid gap-[14px] px-[22px] py-3 border-b border-dark-lighter"
              style={{ background: "rgba(255,255,255,.02)", gridTemplateColumns: "64px 90px minmax(0,1.8fr) 90px 90px 110px 80px" }}
            >
              {["Wave", "Start", "Criteria", "Cap.", "Assigned", "Fill", ""].map((h, i) => (
                <div key={i} className={`font-headline font-bold text-[10px] uppercase tracking-[0.15em] text-muted-dark ${i >= 3 && i <= 5 ? "text-center" : i === 6 ? "text-right" : ""}`}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {waves.map((w, i) => {
              const pct      = w.capacity > 0 ? Math.round((w.assigned / w.capacity) * 100) : 0;
              const barColor = pct >= 95 ? "#f87171" : pct >= 75 ? "#fbbf24" : "#b3e153";
              return (
                <div
                  key={w.id}
                  className="grid gap-[14px] px-[22px] py-4 items-center transition-colors hover:bg-[rgba(179,225,83,0.03)]"
                  style={{
                    gridTemplateColumns: "64px 90px minmax(0,1.8fr) 90px 90px 110px 80px",
                    borderBottom: i < waves.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
                  }}
                >
                  <div className="font-headline font-bold italic text-[22px] text-primary tracking-[-0.02em]">{w.label}</div>
                  <div className="font-headline text-[13px] text-muted-light">{w.startTime}</div>
                  <div className="text-[13.5px] text-muted-light">{w.criteria}</div>
                  <div className="text-center font-headline font-bold text-[14px] text-light">{w.capacity.toLocaleString()}</div>
                  <div className="text-center font-headline font-bold text-[14px] text-light">{w.assigned.toLocaleString()}</div>
                  <div className="flex flex-col items-center gap-[5px]">
                    <span className="font-headline font-bold text-[11px]" style={{ color: barColor }}>{pct}%</span>
                    <div className="h-1 w-[76px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-[600ms]"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      title="Edit wave"
                      onClick={() => setEditing({ ...w })}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-dark-light text-muted hover:text-light transition-colors"
                    >
                      <Pencil className="w-[14px] h-[14px]" />
                    </button>
                    <button
                      title="Remove wave"
                      onClick={() => setWaves(ws => ws.filter(x => x.id !== w.id))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-400/10 text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Inline add form */}
            {adding && (
              <div
                className="px-[22px] py-[18px]"
                style={{ borderTop: "1px solid #b3e153", background: "rgba(179,225,83,.04)" }}
              >
                <div className="grid gap-[14px] mb-[14px]" style={{ gridTemplateColumns: "80px 110px minmax(0,1fr) 110px" }}>
                  <div>
                    <FieldLabel>Wave</FieldLabel>
                    <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="E.g. E" className={inputCls} />
                  </div>
                  <div>
                    <FieldLabel>Start time</FieldLabel>
                    <input type="time" value={draft.startTime} onChange={e => setDraft(d => ({ ...d, startTime: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <FieldLabel>Criteria</FieldLabel>
                    <input value={draft.criteria} onChange={e => setDraft(d => ({ ...d, criteria: e.target.value }))} placeholder="e.g. Under 40 min 10K" className={inputCls} />
                  </div>
                  <div>
                    <FieldLabel>Capacity</FieldLabel>
                    <input type="number" value={draft.capacity} onChange={e => setDraft(d => ({ ...d, capacity: e.target.value }))} placeholder="500" className={inputCls} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setAdding(false)}
                    className="h-8 px-3 font-headline font-bold text-[11px] uppercase tracking-[0.12em] text-muted hover:text-light rounded-lg hover:bg-dark-light transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addWave}
                    className="inline-flex items-center gap-1.5 h-8 px-3 bg-gradient-to-br from-[#c2ec77] to-[#b3e153] text-dark rounded-[10px] font-headline font-bold text-[11px] uppercase tracking-[0.12em] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                  >
                    <CheckCircle className="w-3 h-3" /> Save wave
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {waves.length === 0 && !adding && (
            <div className="bg-dark border border-dark-lighter rounded-[14px] py-[50px] px-6 text-center">
              <div className="w-[52px] h-[52px] rounded-full bg-dark-light inline-flex items-center justify-center mb-4">
                <ListOrdered className="w-[22px] h-[22px] text-muted-dark" />
              </div>
              <div className="font-headline font-bold italic text-[18px] text-light mb-1">No waves defined</div>
              <div className="text-muted-dark text-[13px]">Add a wave to start building your start grid.</div>
            </div>
          )}
        </div>
      </main>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          style={{ background: "rgba(10,10,10,.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-[500px] bg-dark border border-dark-lighter rounded-[18px] p-[26px_28px]"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,.6)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="font-headline font-bold italic text-[22px] text-light mb-[22px]">
              Edit wave <span className="text-primary">{editing.label}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-[22px]">
              <div>
                <FieldLabel>Wave label</FieldLabel>
                <input value={editing.label} onChange={e => setEditing(w => w && ({ ...w, label: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Start time</FieldLabel>
                <input type="time" value={editing.startTime} onChange={e => setEditing(w => w && ({ ...w, startTime: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <FieldLabel>Criteria</FieldLabel>
                <input value={editing.criteria} onChange={e => setEditing(w => w && ({ ...w, criteria: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Capacity</FieldLabel>
                <input type="number" value={editing.capacity} onChange={e => setEditing(w => w && ({ ...w, capacity: parseInt(e.target.value) || 0 }))} className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setEditing(null)}
                className="h-10 px-4 font-headline font-bold text-[12px] uppercase tracking-[0.12em] text-muted hover:text-light rounded-[12px] hover:bg-dark-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center gap-2 h-10 px-4 bg-gradient-to-br from-[#c2ec77] to-[#b3e153] text-dark rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] shadow-machined hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
              >
                Save wave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
