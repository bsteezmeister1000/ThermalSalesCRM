"use client";

import { useMemo, useState } from "react";
import { LockKeyhole, Sigma } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const markupOptions = ["25%", "30%", "35%", "40%", "45%"];
const roundingOptions = ["Nearest 0.25", "Nearest 0.50", "Nearest 1.00", "Always up"];
const rowMultipliers = [
  { rows: "1 row", multiplier: "1.00x" },
  { rows: "2 rows", multiplier: "1.18x" },
  { rows: "3 rows", multiplier: "1.34x" },
  { rows: "4+ rows", multiplier: "1.48x" }
];

const panelCardClass = "rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]";
const sectionTitleClass = "text-xs font-bold uppercase tracking-[0.22em] text-black";
const sectionDescriptionClass = "mt-2 text-sm leading-6 text-zinc-600";

function Section({
  title,
  description,
  children,
  className
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(panelCardClass, "space-y-5", className)}>
      <div>
        <p className={sectionTitleClass}>{title}</p>
        <CardDescription className={sectionDescriptionClass}>{description}</CardDescription>
      </div>
      {children}
    </Card>
  );
}

function InputCell({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function FieldClass(active = true, critical = false) {
  return cn(
    "w-full rounded-2xl border px-4 py-3 text-sm font-normal outline-none transition focus:border-black focus:ring-0",
    active
      ? critical
        ? "border-rose-300 bg-rose-50 text-black"
        : "border-zinc-300 bg-white text-black"
      : "border-zinc-200 bg-zinc-100 text-zinc-500"
  );
}

export function QuoteControlPanel() {
  const [markup, setMarkup] = useState("35%");
  const [tsRounding, setTsRounding] = useState("Nearest 0.50");
  const [nonTsRounding, setNonTsRounding] = useState("Nearest 0.25");
  const [laminateMode, setLaminateMode] = useState<"Manual" | "Automated">("Automated");
  const [manualLaminate, setManualLaminate] = useState("18.00");
  const [rowBand, setRowBand] = useState("3 rows");
  const [poleBraceMode, setPoleBraceMode] = useState("Standard hardware");

  const laminatePreview = useMemo(() => {
    if (laminateMode === "Manual") {
      return `${manualLaminate} LF manual laminate allowance`;
    }

    const selected = rowMultipliers.find((item) => item.rows === rowBand);
    return `${selected?.multiplier ?? "1.00x"} automated laminate multiplier`;
  }, [laminateMode, manualLaminate, rowBand]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="grid gap-4">
        <Section
          title="Primary Quote Controls"
          description="Keep the main pricing levers in one place so internal users can adjust quote behavior quickly without touching formulas."
          className="border-black"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InputCell label="Markup">
              <select value={markup} onChange={(event) => setMarkup(event.target.value)} className={FieldClass(true, true)}>
                {markupOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </InputCell>

            <InputCell label="TS Rounding">
              <select
                value={tsRounding}
                onChange={(event) => setTsRounding(event.target.value)}
                className={FieldClass(true, true)}
              >
                {roundingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </InputCell>

            <InputCell label="Non-TS Rounding">
              <select
                value={nonTsRounding}
                onChange={(event) => setNonTsRounding(event.target.value)}
                className={FieldClass(true, true)}
              >
                {roundingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </InputCell>

            <InputCell label="Pole / Brace Logic">
              <select
                value={poleBraceMode}
                onChange={(event) => setPoleBraceMode(event.target.value)}
                className={FieldClass()}
              >
                <option>Standard hardware</option>
                <option>Reduced hardware</option>
                <option>Heavy duty</option>
              </select>
            </InputCell>
          </div>
        </Section>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Section
            title="Standard Shelving"
            description="Controls that affect normal shelving behavior stay separate from laminate-specific logic."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputCell label="Default Shelf Depth">
                <select className={FieldClass()}>
                  <option>12 in</option>
                  <option>16 in</option>
                  <option>20 in</option>
                </select>
              </InputCell>
              <InputCell label="Brace Spacing">
                <select className={FieldClass()}>
                  <option>24 in centers</option>
                  <option>32 in centers</option>
                  <option>Custom</option>
                </select>
              </InputCell>
            </div>

            <div className="rounded-2xl border border-zinc-300 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Formula / Output zone</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-black">
                    <LockKeyhole className="h-4 w-4 text-zinc-500" />
                    Effective markup
                  </div>
                  <p className="mt-2 text-lg font-semibold text-black">{markup}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-black">
                    <LockKeyhole className="h-4 w-4 text-zinc-500" />
                    Rounding behavior
                  </div>
                  <p className="mt-2 text-lg font-semibold text-black">TS {tsRounding} / Non-TS {nonTsRounding}</p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            title="Laminate Controls"
            description="Laminate mode is isolated so users can switch between manual override and automated row-count behavior without affecting pole or brace settings."
          >
            <div className="grid gap-4">
              <InputCell label="Laminate Mode">
                <select
                  value={laminateMode}
                  onChange={(event) => setLaminateMode(event.target.value as "Manual" | "Automated")}
                  className={FieldClass(true, true)}
                >
                  <option value="Manual">Manual</option>
                  <option value="Automated">Automated</option>
                </select>
              </InputCell>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition",
                    laminateMode === "Manual"
                      ? "border-rose-300 bg-rose-50"
                      : "border-zinc-200 bg-zinc-100 opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-black">Manual laminate input</p>
                    {laminateMode === "Manual" ? (
                      <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Active</Badge>
                    ) : null}
                  </div>
                  <input
                    value={manualLaminate}
                    onChange={(event) => setManualLaminate(event.target.value)}
                    disabled={laminateMode !== "Manual"}
                    className={cn("mt-4", FieldClass(laminateMode === "Manual", true))}
                  />
                </div>

                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition",
                    laminateMode === "Automated"
                      ? "border-rose-300 bg-rose-50"
                      : "border-zinc-200 bg-zinc-100 opacity-75"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-black">Automated row-count multiplier</p>
                    {laminateMode === "Automated" ? (
                      <Badge className="border border-rose-200 bg-rose-100 text-rose-800">Active</Badge>
                    ) : null}
                  </div>
                  <select
                    value={rowBand}
                    onChange={(event) => setRowBand(event.target.value)}
                    disabled={laminateMode !== "Automated"}
                    className={cn("mt-4", FieldClass(laminateMode === "Automated", true))}
                  >
                    {rowMultipliers.map((item) => (
                      <option key={item.rows}>{item.rows}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-black">
                  <Sigma className="h-4 w-4 text-rose-700" />
                  Laminate behavior preview
                </div>
                <p className="mt-2 text-base font-semibold text-black">{laminatePreview}</p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="grid gap-4">
        <Section
          title="Reference Tables"
          description="Helper lookups stay visible but visually secondary so users focus on live inputs first."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-black">Markup options</p>
              <div className="mt-3 grid gap-2 text-sm">
                {markupOptions.map((option) => (
                  <div key={option} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
                    <span className="text-black">{option}</span>
                    <span className="text-zinc-500">Standard control</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-black">Rounding references</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
                  <span className="text-black">TS</span>
                  <span className="text-zinc-500">{tsRounding}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
                  <span className="text-black">Non-TS</span>
                  <span className="text-zinc-500">{nonTsRounding}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-black">Laminate multiplier lookup</p>
              <div className="mt-3 grid gap-2 text-sm">
                {rowMultipliers.map((item) => (
                  <div key={item.rows} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
                    <span className="text-black">{item.rows}</span>
                    <span className="text-zinc-500">{item.multiplier}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
