"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight, Upload, AlertCircle, CheckCircle,
  ArrowLeft, Zap, RefreshCw,
} from "lucide-react";
import OrganiserTopBar from "@/components/organiser/TopBar";
import EventPageTabs from "@/components/organiser/EventPageTabs";

// ── Types ────────────────────────────────────────────────────────────────────

type IssueStatus = "ok" | "missing_time" | "name_mismatch" | "unmatched" | "duplicate_bib";
type Resolution  = null | "accepted" | "removed";
type Step        = "upload" | "review" | "published";
type Filter      = "all" | "issues" | "clean";
type ExportFmt   = "CSV" | "JSON" | "XML";

interface ResultRow {
  id: string;
  bib: string;
  name: string;
  regName: string | null;
  cat: string;
  time: string;
  status: IssueStatus;
  resolution: Resolution;
  editedTime: string;
}

interface EventInfo { id: string; title: string }

// ── Mock seed rows (used when no file is uploaded) ──────────────────────────

const SEED_ROWS: ResultRow[] = [
  { id: "r01", bib: "001", name: "Sarah Mitchell", regName: "Sarah Mitchell", cat: "Elite F",  time: "32:14",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r02", bib: "002", name: "James Okoye",    regName: "James Okoye",    cat: "Elite M",  time: "29:48",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r03", bib: "003", name: "Priya Sharma",   regName: "Priya Sharma",   cat: "Wave A F", time: "38:22",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r04", bib: "004", name: "Thomas Nguyen",  regName: "Thomas Nguyen",  cat: "Wave A M", time: "",        status: "missing_time",  resolution: null, editedTime: "" },
  { id: "r05", bib: "005", name: "Lucy Chen",      regName: "Lucy Chang",     cat: "Wave A F", time: "41:05",   status: "name_mismatch", resolution: null, editedTime: "" },
  { id: "r06", bib: "006", name: "Marcus Webb",    regName: "Marcus Webb",    cat: "Wave B M", time: "44:18",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r07", bib: "007", name: "Aisha Patel",    regName: null,             cat: "Wave B F", time: "46:32",   status: "unmatched",     resolution: null, editedTime: "" },
  { id: "r08", bib: "008", name: "Daniel Torres",  regName: "Daniel Torres",  cat: "Wave B M", time: "47:11",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r09", bib: "009", name: "Emma Wilson",    regName: "Emma Wilson",    cat: "Wave B F", time: "48:55",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r10", bib: "010", name: "Ryan Kowalski",  regName: "Ryan Kowalski",  cat: "Wave C M", time: "52:33",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r11", bib: "006", name: "Aaron Baptiste", regName: null,             cat: "Wave C M", time: "53:44",   status: "duplicate_bib", resolution: null, editedTime: "" },
  { id: "r12", bib: "012", name: "Natalie Brooks", regName: "Natalie Brooks", cat: "Wave C F", time: "55:18",   status: "ok",            resolution: null, editedTime: "" },
  { id: "r13", bib: "013", name: "Chris Fairfax",  regName: "Chris Fairfax",  cat: "Wave D M", time: "1:02:45", status: "ok",            resolution: null, editedTime: "" },
  { id: "r14", bib: "014", name: "Yuki Tanaka",    regName: "Yuki Tanaka",    cat: "Wave D F", time: "1:05:22", status: "ok",            resolution: null, editedTime: "" },
  { id: "r15", bib: "015", name: "Sam De Bruyn",   regName: "Sam De Bruyn",   cat: "Wave D M", time: "1:08:07", status: "ok",            resolution: null, editedTime: "" },
];

// ── Issue metadata ────────────────────────────────────────────────────────────

const ISSUE_META: Record<Exclude<IssueStatus, "ok">, { label: string; tone: string }> = {
  missing_time:  { label: "Missing time",    tone: "warning" },
  name_mismatch: { label: "Name mismatch",   tone: "warning" },
  unmatched:     { label: "No registration", tone: "danger"  },
  duplicate_bib: { label: "Duplicate bib",   tone: "danger"  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCsv(text: string): Omit<ResultRow, "id" | "regName" | "status" | "resolution" | "editedTime">[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const cols: Record<string, string> = {};
    line.split(",").forEach((v, i) => { cols[headers[i]] = v.replace(/^"|"$/g, "").trim(); });
    return {
      bib:  cols["bib"]         ?? "",
      name: cols["name"]        ?? "",
      cat:  cols["category"]    ?? "",
      time: cols["finish_time"] ?? "",
    };
  }).filter(r => r.bib);
}

function parseJson(text: string): Omit<ResultRow, "id" | "regName" | "status" | "resolution" | "editedTime">[] {
  const arr = JSON.parse(text) as Record<string, string>[];
  return arr.map(r => ({ bib: r.bib ?? "", name: r.name ?? "", cat: r.category ?? "", time: r.finish_time ?? "" }));
}

function parseXml(text: string): Omit<ResultRow, "id" | "regName" | "status" | "resolution" | "editedTime">[] {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, "application/xml");
  return Array.from(doc.querySelectorAll("result")).map(el => ({
    bib:  el.getAttribute("bib")      ?? el.querySelector("bib")?.textContent         ?? "",
    name: el.getAttribute("name")     ?? el.querySelector("name")?.textContent        ?? "",
    cat:  el.getAttribute("category") ?? el.querySelector("category")?.textContent    ?? "",
    time: el.getAttribute("finish_time") ?? el.querySelector("finish_time")?.textContent ?? "",
  }));
}

function detectIssues(raw: Omit<ResultRow, "id" | "regName" | "status" | "resolution" | "editedTime">[]): ResultRow[] {
  const bibCount: Record<string, number> = {};
  raw.forEach(r => { bibCount[r.bib] = (bibCount[r.bib] ?? 0) + 1; });

  return raw.map((r, i) => {
    let status: IssueStatus = "ok";
    if (bibCount[r.bib] > 1)  status = "duplicate_bib";
    else if (!r.time.trim())  status = "missing_time";
    return { ...r, id: `r${String(i).padStart(2, "0")}`, regName: r.name, status, resolution: null, editedTime: "" };
  });
}

function processFile(file: File): Promise<ResultRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const ext  = file.name.split(".").pop()?.toLowerCase();
        const raw  = ext === "json" ? parseJson(text) : ext === "xml" ? parseXml(text) : parseCsv(text);
        resolve(detectIssues(raw));
      } catch {
        reject(new Error("Could not parse file. Check the format."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

// ── Action button style helper ────────────────────────────────────────────────

function ActionBtn({ color, bg, children, onClick }: {
  color: string; bg: string; children: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center font-headline font-bold uppercase whitespace-nowrap transition-opacity hover:opacity-80"
      style={{
        height: 28, padding: "0 10px", borderRadius: 7, border: "none",
        fontSize: 10.5, letterSpacing: "0.1em", background: bg, color, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_TONES: Record<string, { bg: string; fg: string; dot: string }> = {
  success: { bg: "rgba(179,225,83,.10)",  fg: "#b3e153", dot: "#b3e153" },
  warning: { bg: "rgba(251,191,36,.12)",  fg: "#fcd34d", dot: "#fbbf24" },
  danger:  { bg: "rgba(248,113,113,.12)", fg: "#fca5a5", dot: "#f87171" },
  muted:   { bg: "rgba(255,255,255,.05)", fg: "#6e737b", dot: "#6e737b" },
};

function StatusBadge({ tone, dot, children }: { tone: string; dot?: boolean; children: React.ReactNode }) {
  const t = BADGE_TONES[tone] ?? BADGE_TONES.muted;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-headline font-bold text-[10.5px] uppercase tracking-[0.13em] px-2.5 py-1 rounded-full leading-none"
      style={{ background: t.bg, color: t.fg }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResultsReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [event, setEvent]   = useState<EventInfo | null>(null);
  const [step,  setStep]    = useState<Step>("upload");
  const [rows,  setRows]    = useState<ResultRow[]>(SEED_ROWS.map(r => ({ ...r })));
  const [filter,       setFilter]       = useState<Filter>("all");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [timeInput,    setTimeInput]    = useState("");
  const [dragOver,     setDragOver]     = useState(false);
  const [parseError,   setParseError]   = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/organiser/events/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setEvent({ id: d.id, title: d.title }))
      .catch(() => null);
  }, [id]);

  // Derived counts
  const issueRows          = rows.filter(r => r.status !== "ok");
  const unresolvedCritical = issueRows.filter(r => !r.resolution && (r.status === "duplicate_bib" || r.status === "unmatched"));
  const unresolvedWarnings = issueRows.filter(r => !r.resolution && (r.status === "missing_time"  || r.status === "name_mismatch"));
  const resolvedCount      = issueRows.filter(r => r.resolution).length;
  const publishCount       = rows.filter(r => r.resolution !== "removed").length;
  const canPublish         = unresolvedCritical.length === 0;

  const filteredRows =
    filter === "issues" ? rows.filter(r => r.status !== "ok") :
    filter === "clean"  ? rows.filter(r => r.status === "ok") :
    rows;

  const resolve = (rowId: string, resolution: Resolution, extra?: Partial<ResultRow>) => {
    setRows(rs => rs.map(r => r.id === rowId ? { ...r, resolution, ...(extra ?? {}) } : r));
    setEditingRowId(null);
  };

  const handleFile = async (file: File) => {
    setParseError("");
    try {
      const parsed = await processFile(file);
      setRows(parsed);
      setFilter("all");
      setStep("review");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Parse error");
    }
  };

  const resetToUpload = () => {
    setRows(SEED_ROWS.map(r => ({ ...r })));
    setFilter("all");
    setEditingRowId(null);
    setTimeInput("");
    setStep("upload");
  };

  const breadcrumb = (
    <div className="flex items-center gap-2 font-headline text-[11px] uppercase tracking-[0.15em] text-muted-dark mb-[22px]">
      <Link href="/organiser/listings" className="text-muted hover:text-light transition-colors">Listings</Link>
      <ChevronRight className="w-3 h-3" />
      {event && (
        <Link href={`/organiser/events/${id}/dashboard`} className="text-muted hover:text-light transition-colors max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
          {event.title}
        </Link>
      )}
      <ChevronRight className="w-3 h-3" />
      <span className="text-primary">Results</span>
    </div>
  );

  // ── UPLOAD STEP ────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <div className="min-h-screen bg-dark-darker">
        <OrganiserTopBar />
        <main className="pt-14">
          <div className="max-w-[1240px] mx-auto px-6 py-[34px] pb-[90px] page-in">
            {breadcrumb}
            <EventPageTabs eventId={id} active="results" />

            <div className="mb-7">
              <div className="font-headline font-bold text-[10px] uppercase tracking-[0.25em] text-primary mb-[10px]">
                Post-race{event ? ` · ${event.title}` : ""}
              </div>
              <h1 className="font-headline font-bold italic tracking-[-0.04em] leading-[0.92] text-light m-0"
                  style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
                Import race<br /><span className="text-primary">results.</span>
              </h1>
            </div>

            {/* Explainer steps */}
            <div className="grid gap-3 mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))" }}>
              {[
                ["01", "Timing company",        "Sends you the results CSV after the race."],
                ["02", "Startline flags issues", "Duplicate bibs, unmatched athletes, missing times — all highlighted automatically."],
                ["03", "You review",             "Accept, correct, or exclude each flagged entry before anything goes live."],
                ["04", "Published",              "Results appear on athlete profiles and the event leaderboard."],
              ].map(([num, title, desc]) => (
                <div key={num} className="bg-dark-light border border-dark-lighter rounded-[14px] px-5 py-[18px]">
                  <div className="font-headline font-bold italic text-[28px] text-primary tracking-[-0.04em] leading-none mb-2">{num}</div>
                  <div className="font-headline font-bold text-[12px] uppercase tracking-[0.1em] text-light mb-[5px]">{title}</div>
                  <div className="text-[12.5px] text-muted leading-[1.55]">{desc}</div>
                </div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file); else setStep("review");
              }}
              className="py-16 px-10 text-center rounded-[14px] cursor-pointer transition-all duration-200"
              style={{
                border: `2px dashed ${dragOver ? "#b3e153" : "#353535"}`,
                background: dragOver ? "rgba(179,225,83,.05)" : "transparent",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.xml"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div className="w-14 h-14 rounded-full bg-dark-light border border-dark-lighter inline-flex items-center justify-center mb-[18px]">
                <Upload className="w-6 h-6 text-muted" />
              </div>
              <div className="font-headline font-bold italic text-[20px] text-light mb-1.5">Drop your results file here</div>
              <div className="text-muted-dark text-[13.5px] mb-5">CSV, JSON or XML · or click to browse</div>

              <span className="inline-flex items-center gap-2 h-10 px-[18px] rounded-[12px] border border-dark-lighter font-headline font-bold text-[11.5px] uppercase tracking-[0.12em] text-muted-light bg-dark-light">
                <Upload className="w-3.5 h-3.5" /> Upload file
              </span>

              <div className="flex gap-2 justify-center mt-5">
                {(["CSV", "JSON", "XML"] as ExportFmt[]).map(fmt => (
                  <span key={fmt} className="inline-flex items-center h-[26px] px-2.5 rounded-[6px] border border-dark-lighter font-headline font-bold text-[10px] uppercase tracking-[0.15em] text-muted-dark bg-dark-light">
                    {fmt}
                  </span>
                ))}
              </div>
              <div className="mt-2.5 text-[12px] text-muted-dark">Fields: bib, name, category, finish_time</div>

              {/* Demo fallback */}
              <button
                className="mt-4 text-[11px] text-muted hover:text-muted-light font-headline uppercase tracking-widest transition-colors"
                onClick={e => { e.stopPropagation(); setStep("review"); }}
              >
                or load demo data →
              </button>
            </div>

            {parseError && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-xl text-[13px] text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── PUBLISHED STEP ────────────────────────────────────────────────────────

  if (step === "published") {
    const excluded  = rows.filter(r => r.resolution === "removed").length;
    const published = rows.length - excluded;

    return (
      <div className="min-h-screen bg-dark-darker">
        <OrganiserTopBar />
        <main className="pt-14">
          <div className="max-w-[1240px] mx-auto px-6 py-[34px] pb-[90px] page-in">
            {breadcrumb}
            <EventPageTabs eventId={id} active="results" />

            <div className="bg-dark border border-dark-lighter rounded-[14px] py-16 px-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 inline-flex items-center justify-center mb-5">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
              <div className="font-headline font-bold text-[10px] uppercase tracking-[0.25em] text-primary mb-2.5">Results published</div>
              <h1 className="font-headline font-bold italic tracking-[-0.04em] text-light m-0 mb-2.5 leading-none"
                  style={{ fontSize: "clamp(32px, 4vw, 52px)" }}>
                {published} results<br /><span className="text-primary">now live.</span>
              </h1>
              <p className="text-[14px] text-muted max-w-[420px] mx-auto mt-3.5 mb-8 leading-[1.6]">
                Athlete profiles and the event leaderboard have been updated.
                {excluded > 0 && ` ${excluded} entr${excluded === 1 ? "y was" : "ies were"} excluded from the import.`}
              </p>

              <div className="grid grid-cols-3 gap-[14px] max-w-[460px] mx-auto mb-8">
                {[
                  ["Published",      published,      "#b3e153"],
                  ["Issues resolved", resolvedCount, "#60a5fa"],
                  ["Excluded",        excluded,      "#6e737b"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="py-4 px-3 bg-dark-light border border-dark-lighter rounded-[12px]">
                    <div className="font-headline font-bold italic text-[32px] leading-none" style={{ color: color as string }}>{value}</div>
                    <div className="font-headline text-[9.5px] uppercase tracking-[0.18em] text-muted-dark mt-[5px]">{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 justify-center">
                <Link
                  href={`/organiser/events/${id}/dashboard`}
                  className="inline-flex items-center gap-2 h-10 px-4 border border-dark-lighter rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] text-light hover:border-primary hover:bg-dark-light transition-colors"
                >
                  View event
                </Link>
                <button
                  onClick={resetToUpload}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-gradient-to-br from-[#c2ec77] to-[#b3e153] text-dark rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] shadow-machined hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                >
                  <RefreshCw className="w-[14px] h-[14px]" /> Import another file
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── REVIEW STEP ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-darker">
      <OrganiserTopBar />
      <main className="pt-14">
        <div className="max-w-[1240px] mx-auto px-6 py-[34px] pb-[90px] page-in">
          {breadcrumb}
          <EventPageTabs eventId={id} active="results" />

          {/* Header */}
          <div className="flex items-end justify-between gap-5 flex-wrap mb-6">
            <div>
              <div className="font-headline font-bold text-[10px] uppercase tracking-[0.25em] text-primary mb-[10px]">
                Review import{event ? ` · ${event.title}` : ""}
              </div>
              <h1 className="font-headline font-bold italic tracking-[-0.04em] leading-[0.92] text-light m-0"
                  style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}>
                {rows.length} results<br /><span className="text-primary">ready to review.</span>
              </h1>
            </div>
            <button
              onClick={resetToUpload}
              className="inline-flex items-center gap-1.5 h-8 px-3 font-headline font-bold text-[11px] uppercase tracking-[0.12em] text-muted hover:text-light rounded-[12px] hover:bg-dark-light transition-colors"
            >
              <ArrowLeft className="w-[13px] h-[13px]" /> Re-upload
            </button>
          </div>

          {/* Issue summary banners */}
          {(unresolvedCritical.length > 0 || unresolvedWarnings.length > 0 || resolvedCount > 0) && (
            <div className="grid gap-3 mb-[22px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {unresolvedCritical.length > 0 && (
                <div className="flex gap-3.5 items-start px-[18px] py-4 border rounded-[14px]"
                     style={{ background: "rgba(248,113,113,.12)", borderColor: "rgba(248,113,113,.2)" }}>
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-headline font-bold italic text-[22px] tracking-[-0.02em] leading-none" style={{ color: "#fca5a5" }}>{unresolvedCritical.length} critical</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "rgba(252,165,165,.7)" }}>Must resolve before publishing</div>
                  </div>
                </div>
              )}
              {unresolvedWarnings.length > 0 && (
                <div className="flex gap-3.5 items-start px-[18px] py-4 border rounded-[14px]"
                     style={{ background: "rgba(251,191,36,.12)", borderColor: "rgba(251,191,36,.2)" }}>
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-headline font-bold italic text-[22px] tracking-[-0.02em] leading-none" style={{ color: "#fcd34d" }}>{unresolvedWarnings.length} warnings</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "rgba(252,211,77,.7)" }}>Review and accept or correct</div>
                  </div>
                </div>
              )}
              {resolvedCount > 0 && (
                <div className="flex gap-3.5 items-start px-[18px] py-4 border rounded-[14px]"
                     style={{ background: "rgba(179,225,83,.10)", borderColor: "rgba(179,225,83,.2)" }}>
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="font-headline font-bold italic text-[22px] text-primary tracking-[-0.02em] leading-none">{resolvedCount} resolved</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "rgba(179,225,83,.7)" }}>Issues addressed</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter tabs + bulk action */}
          <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
            <div className="flex gap-1.5">
              {([
                ["all",    "All",    rows.length],
                ["issues", "Issues", issueRows.length],
                ["clean",  "Clean",  rows.filter(r => r.status === "ok").length],
              ] as [Filter, string, number][]).map(([k, label, count]) => {
                const on = filter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-full font-headline font-bold text-[11px] uppercase tracking-[0.1em] transition-all"
                    style={{
                      border: `1px solid ${on ? "#b3e153" : "#353535"}`,
                      background: on ? "rgba(179,225,83,.10)" : "transparent",
                      color: on ? "#b3e153" : "#6e737b",
                    }}
                  >
                    {label} <span style={{ opacity: 0.6 }}>{count}</span>
                  </button>
                );
              })}
            </div>
            {issueRows.some(r => !r.resolution) && (
              <button
                onClick={() => setRows(rs => rs.map(r => (r.status !== "ok" && !r.resolution) ? { ...r, resolution: "accepted" } : r))}
                className="inline-flex items-center gap-1.5 h-8 px-3 border border-dark-lighter rounded-[12px] font-headline font-bold text-[11px] uppercase tracking-[0.12em] text-light hover:border-primary hover:bg-dark-light transition-colors"
              >
                <CheckCircle className="w-[13px] h-[13px]" /> Accept all warnings
              </button>
            )}
          </div>

          {/* Results table */}
          <div className="bg-dark border border-dark-lighter rounded-[14px] overflow-hidden mb-[90px]">
            {/* Table header */}
            <div
              className="grid gap-[14px] px-5 py-3 border-b border-dark-lighter"
              style={{ background: "rgba(255,255,255,.02)", gridTemplateColumns: "72px minmax(0,1.8fr) minmax(0,1fr) 90px 130px minmax(0,1.2fr)" }}
            >
              {["Bib", "Athlete", "Category", "Time", "Status", "Action"].map(h => (
                <div key={h} className="font-headline font-bold text-[10px] uppercase tracking-[0.15em] text-muted-dark">{h}</div>
              ))}
            </div>

            {filteredRows.map((r, i) => {
              const meta       = r.status !== "ok" ? ISSUE_META[r.status] : null;
              const isResolved = !!r.resolution;
              const isEditing  = editingRowId === r.id;
              const isCritical = r.status === "duplicate_bib" || r.status === "unmatched";

              const borderColor = isResolved
                ? r.resolution === "removed" ? "#f87171" : "#b3e153"
                : isCritical      ? "#f87171"
                : r.status !== "ok" ? "#fbbf24"
                : "transparent";

              const rowBg = isResolved
                ? r.resolution === "removed" ? "rgba(248,113,113,.04)" : "rgba(179,225,83,.03)"
                : isCritical      ? "rgba(248,113,113,.04)"
                : r.status !== "ok" ? "rgba(251,191,36,.03)"
                : "transparent";

              return (
                <div
                  key={r.id}
                  className="grid gap-[14px] px-5 py-[14px] items-center transition-opacity"
                  style={{
                    gridTemplateColumns: "72px minmax(0,1.8fr) minmax(0,1fr) 90px 130px minmax(0,1.2fr)",
                    borderBottom: i < filteredRows.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
                    borderLeft: `2px solid ${borderColor}`,
                    background: rowBg,
                    opacity: r.resolution === "removed" ? 0.45 : 1,
                  }}
                >
                  {/* Bib */}
                  <div className="font-headline font-bold text-[14px]"
                       style={{ color: r.status === "duplicate_bib" ? "#f87171" : "#6e737b" }}>
                    #{r.bib}
                  </div>

                  {/* Athlete */}
                  <div>
                    <div className="font-headline font-bold text-[14px] text-light"
                         style={{ textDecoration: r.resolution === "removed" ? "line-through" : "none" }}>
                      {r.name}
                    </div>
                    {r.status === "name_mismatch" && !isResolved && (
                      <div className="text-[11.5px] text-muted-dark mt-0.5">
                        Registered: <span style={{ color: "#fcd34d" }}>{r.regName}</span>
                      </div>
                    )}
                    {isResolved && r.status !== "ok" && (
                      <div className="font-headline font-bold text-[10.5px] uppercase tracking-[0.1em] mt-0.5"
                           style={{ color: r.resolution === "removed" ? "#f87171" : "#b3e153" }}>
                        {r.resolution === "removed" ? "✕ excluded" : "✓ accepted"}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="text-[13px] text-muted-light">{r.cat}</div>

                  {/* Time */}
                  <div>
                    {isEditing ? (
                      <input
                        value={timeInput}
                        onChange={e => setTimeInput(e.target.value)}
                        placeholder="mm:ss"
                        autoFocus
                        className="w-[80px] text-center bg-dark-light border border-dark-lighter rounded-[10px] px-2 py-1.5 text-[13px] text-light focus:border-primary focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === "Enter") resolve(r.id, "accepted", { time: timeInput, editedTime: timeInput });
                          if (e.key === "Escape") setEditingRowId(null);
                        }}
                      />
                    ) : (
                      <span className="font-headline font-bold text-[14px]"
                            style={{ color: (r.status === "missing_time" && !isResolved) ? "#fbbf24" : "#f5f7fa" }}>
                        {r.editedTime || r.time || <span className="text-muted-dark">—</span>}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div>
                    {isResolved ? (
                      <StatusBadge tone={r.resolution === "removed" ? "danger" : "success"} dot>
                        {r.resolution === "removed" ? "Excluded" : "Accepted"}
                      </StatusBadge>
                    ) : r.status === "ok" ? (
                      <span className="font-headline text-[10px] uppercase tracking-[0.12em] text-muted-dark">Clean</span>
                    ) : meta ? (
                      <StatusBadge tone={meta.tone} dot>{meta.label}</StatusBadge>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-wrap">
                    {!isResolved && r.status === "missing_time" && !isEditing && (
                      <>
                        <ActionBtn color="#60a5fa" bg="rgba(96,165,250,.12)" onClick={() => { setEditingRowId(r.id); setTimeInput(""); }}>Add time</ActionBtn>
                        <ActionBtn color="#b3e153" bg="rgba(179,225,83,.10)" onClick={() => resolve(r.id, "accepted")}>Accept</ActionBtn>
                      </>
                    )}
                    {!isResolved && r.status === "missing_time" && isEditing && (
                      <>
                        <ActionBtn color="#b3e153" bg="rgba(179,225,83,.10)" onClick={() => resolve(r.id, "accepted", { time: timeInput, editedTime: timeInput })}>Save</ActionBtn>
                        <ActionBtn color="#6e737b" bg="rgba(255,255,255,.05)" onClick={() => setEditingRowId(null)}>Cancel</ActionBtn>
                      </>
                    )}
                    {!isResolved && r.status === "name_mismatch" && (
                      <>
                        <ActionBtn color="#b3e153" bg="rgba(179,225,83,.10)" onClick={() => resolve(r.id, "accepted", { name: r.regName ?? r.name })}>Use registered</ActionBtn>
                        <ActionBtn color="#6e737b" bg="rgba(255,255,255,.06)" onClick={() => resolve(r.id, "accepted")}>Keep submitted</ActionBtn>
                      </>
                    )}
                    {!isResolved && r.status === "unmatched" && (
                      <>
                        <ActionBtn color="#fbbf24" bg="rgba(251,191,36,.12)" onClick={() => resolve(r.id, "accepted")}>Accept as guest</ActionBtn>
                        <ActionBtn color="#f87171" bg="rgba(248,113,113,.12)" onClick={() => resolve(r.id, "removed")}>Remove</ActionBtn>
                      </>
                    )}
                    {!isResolved && r.status === "duplicate_bib" && (
                      <ActionBtn color="#f87171" bg="rgba(248,113,113,.12)" onClick={() => resolve(r.id, "removed")}>Remove duplicate</ActionBtn>
                    )}
                    {isResolved && (
                      <ActionBtn color="#6e737b" bg="rgba(255,255,255,.04)" onClick={() => setRows(rs => rs.map(x => x.id === r.id ? { ...x, resolution: null, editedTime: "" } : x))}>Undo</ActionBtn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky publish bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-6 py-[14px]"
        style={{ background: "rgba(20,20,20,.94)", backdropFilter: "blur(14px)", borderTop: "1px solid #353535" }}
      >
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-5 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="font-headline font-bold italic text-[15px] text-light">{publishCount} results ready</div>
            {unresolvedCritical.length > 0 && (
              <span className="text-[12.5px] text-red-400">⚠ {unresolvedCritical.length} critical issue{unresolvedCritical.length !== 1 ? "s" : ""} must be resolved first</span>
            )}
            {unresolvedCritical.length === 0 && unresolvedWarnings.length > 0 && (
              <span className="text-[12.5px] text-amber-400">{unresolvedWarnings.length} warning{unresolvedWarnings.length !== 1 ? "s" : ""} will publish as-is</span>
            )}
            {unresolvedCritical.length === 0 && unresolvedWarnings.length === 0 && (
              <span className="text-[12.5px] text-primary">All issues resolved · ready to publish</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={resetToUpload}
              className="h-10 px-4 font-headline font-bold text-[12px] uppercase tracking-[0.12em] text-muted hover:text-light rounded-[12px] hover:bg-dark-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (canPublish) setStep("published"); }}
              className={[
                "inline-flex items-center gap-2 h-10 px-4 rounded-[12px] font-headline font-bold text-[12px] uppercase tracking-[0.12em] transition-all",
                canPublish
                  ? "bg-gradient-to-br from-[#c2ec77] to-[#b3e153] text-dark shadow-machined hover:-translate-x-0.5 hover:-translate-y-0.5"
                  : "bg-transparent border border-dark-lighter text-muted cursor-not-allowed opacity-40",
              ].join(" ")}
            >
              <Zap className={`w-[15px] h-[15px] ${canPublish ? "text-dark" : "text-muted"}`} />
              Publish {publishCount} results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
