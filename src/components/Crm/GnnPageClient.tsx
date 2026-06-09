"use client";

import {
  ArrowRight,
  GitBranch,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  GCN_FORMULA,
  PYTHON_SNIPPET,
  applyEmbeddings,
  cloneGraph,
  defaultGnnGraph,
  defaultGnnWeights,
  embeddingMagnitude,
  formatVector,
  forwardGcn,
  type GnnGraph,
} from "@/lib/crm/gnn";

const CANVAS = { w: 640, h: 360 };
const NODE_R = 28;

function nodeColor(mag: number, maxMag: number): string {
  const t = maxMag > 0 ? Math.min(1, mag / maxMag) : 0;
  const hue = 190 + t * 70;
  const light = 42 + t * 18;
  return `hsl(${hue} ${58 + t * 20}% ${light}%)`;
}

function GnnCanvas({
  graph,
  activeEdgeIndex,
}: {
  graph: GnnGraph;
  activeEdgeIndex: number | null;
}) {
  const idx = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );

  const mags = graph.nodes.map((n) => embeddingMagnitude(n.embedding));
  const maxMag = Math.max(...mags, 0.001);

  return (
    <div className="relative overflow-hidden rounded-none border border-white/8 bg-[#050810]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />
      <svg
        viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
        className="relative block w-full"
        role="img"
        aria-label="Graph neural network node diagram"
      >
        <defs>
          <filter id="gnn-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {graph.edges.map((edge, i) => {
          const a = idx.get(edge.from);
          const b = idx.get(edge.to);
          if (!a || !b) return null;
          const x1 = a.x * CANVAS.w;
          const y1 = a.y * CANVAS.h;
          const x2 = b.x * CANVAS.w;
          const y2 = b.y * CANVAS.h;
          const active = activeEdgeIndex === i;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? "rgba(34,211,238,0.85)" : "rgba(148,163,184,0.35)"}
              strokeWidth={active ? 2.5 : 1.25}
              strokeDasharray={active ? undefined : "4 4"}
            />
          );
        })}

        {graph.nodes.map((node, i) => {
          const cx = node.x * CANVAS.w;
          const cy = node.y * CANVAS.h;
          const fill = nodeColor(mags[i] ?? 0, maxMag);
          return (
            <g key={node.id} filter="url(#gnn-glow)">
              <circle
                cx={cx}
                cy={cy}
                r={NODE_R + 4}
                fill="none"
                stroke={fill}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <circle cx={cx} cy={cy} r={NODE_R} fill={fill} fillOpacity={0.92} />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                className="fill-white text-[11px] font-semibold"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MatrixPreview({
  title,
  matrix,
  labels,
}: {
  title: string;
  matrix: number[][];
  labels: string[];
}) {
  return (
    <div className="rounded-none border border-white/8 bg-black/25 p-3">
      <p className="text-muted-foreground mb-2 text-[9px] font-semibold tracking-[0.16em] uppercase">
        {title}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[10px]">
          <thead>
            <tr>
              <th className="p-1" />
              {labels.map((l) => (
                <th
                  key={l}
                  className="text-muted-foreground p-1 font-normal tracking-wide"
                >
                  {l.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={labels[i]}>
                <th className="text-muted-foreground p-1 text-left font-normal">
                  {labels[i]?.slice(0, 3)}
                </th>
                {row.map((v, j) => (
                  <td key={j} className="p-0.5">
                    <span
                      className="block min-w-[28px] rounded-none px-1 py-0.5 text-center tabular-nums"
                      style={{
                        backgroundColor: `rgba(34,211,238,${Math.min(0.55, v * 0.45)})`,
                        color: v > 0.4 ? "#ecfeff" : "rgba(226,232,240,0.75)",
                      }}
                    >
                      {v > 0 ? "1" : "·"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GnnPageClient() {
  const [graph, setGraph] = useState<GnnGraph>(() => defaultGnnGraph());
  const [layerCount, setLayerCount] = useState(2);
  const [step, setStep] = useState(0);
  const [animEdge, setAnimEdge] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const labels = useMemo(() => graph.nodes.map((n) => n.label), [graph.nodes]);

  const weights = useMemo(() => {
    const inDim = graph.nodes[0]?.features.length ?? 3;
    const hiddenDim = 3;
    return Array.from({ length: layerCount }, () =>
      defaultGnnWeights(inDim, hiddenDim),
    );
  }, [graph.nodes, layerCount]);

  const forward = useMemo(
    () => forwardGcn(cloneGraph(graph), weights),
    [graph, weights],
  );

  const displayGraph = useMemo(() => {
    const layer = forward.layers[step] ?? forward.layers[0]!;
    return applyEmbeddings(graph, layer);
  }, [graph, forward.layers, step]);

  const runPropagation = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStep(0);

    for (let l = 0; l < layerCount; l++) {
      for (let e = 0; e < graph.edges.length; e++) {
        setAnimEdge(e);
        await new Promise((r) => setTimeout(r, 120));
      }
      setStep(l + 1);
      setGraph((g) =>
        applyEmbeddings(g, forward.layers[l + 1] ?? forward.layers[l]!),
      );
      await new Promise((r) => setTimeout(r, 280));
    }

    setAnimEdge(null);
    setRunning(false);
  }, [running, layerCount, graph.edges.length, forward.layers]);

  const reset = useCallback(() => {
    setGraph(defaultGnnGraph());
    setStep(0);
    setAnimEdge(null);
    setRunning(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="bg-violet-500/12 text-violet-200 inline-flex size-11 items-center justify-center rounded-none ring-1 ring-violet-400/25">
            <Share2 className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Graph lab
            </p>
            <p className="text-foreground text-base font-semibold tracking-tight">
              Message passing on your CRM graph
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-muted-foreground flex items-center gap-2 text-[10px] font-semibold tracking-wide uppercase">
            Layers
            <select
              value={layerCount}
              onChange={(e) => {
                setLayerCount(Number(e.target.value));
                setStep(0);
                setGraph(defaultGnnGraph());
              }}
              className="text-foreground rounded-none border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] font-normal normal-case"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void runPropagation()}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-none border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-[10px] font-semibold tracking-wide text-cyan-50 uppercase transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <Play className="size-3.5" aria-hidden />
            Propagate
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-none border border-white/8 px-3 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/3"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_76%,transparent)] backdrop-blur-md">
        <header className="border-b border-white/6 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-violet-200/90 text-[10px] font-bold tracking-[0.18em] uppercase">
                Graph view
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Node color scales with embedding magnitude after each layer.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
              <span className="text-muted-foreground">Step</span>
              <span className="text-foreground">
                {step}/{layerCount}
              </span>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <GnnCanvas graph={displayGraph} activeEdgeIndex={animEdge} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_76%,transparent)] p-5 sm:p-6">
          <p className="text-cyan-200/90 mb-3 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase">
            <GitBranch className="size-3.5" aria-hidden />
            Node embeddings
          </p>
          <ul className="space-y-2">
            {displayGraph.nodes.map((node, i) => (
              <li
                key={node.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-white/6 bg-black/20 px-3 py-2"
              >
                <span className="text-foreground text-sm font-medium">
                  {node.label}
                </span>
                <code className="text-cyan-100/90 font-mono text-[11px]">
                  {formatVector(node.embedding)}
                </code>
                <div className="bg-white/8 h-1 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-violet-400/80 h-full transition-[width] duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (embeddingMagnitude(node.embedding) /
                          Math.max(
                            ...displayGraph.nodes.map((n) =>
                              embeddingMagnitude(n.embedding),
                            ),
                            0.001,
                          )) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <MatrixPreview
            title="Adjacency A + I"
            matrix={forward.adjacency}
            labels={labels}
          />
          <div className="rounded-none border border-white/8 bg-black/25 p-4">
            <p className="text-muted-foreground mb-2 text-[9px] font-semibold tracking-[0.16em] uppercase">
              GCN layer
            </p>
            <code className="text-cyan-100/90 block font-mono text-[12px] leading-relaxed">
              {GCN_FORMULA}
            </code>
            <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[11px]">
              <Sparkles className="size-3.5 text-violet-400/80" aria-hidden />
              Pure JavaScript forward pass - no server round-trip.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-none border border-white/6 bg-[color-mix(in_oklab,var(--card)_70%,transparent)] p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
            Python equivalent (PyTorch Geometric)
          </p>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
            Reference only
            <ArrowRight className="size-3" aria-hidden />
          </span>
        </div>
        <pre className="overflow-x-auto rounded-none border border-white/6 bg-[#050810] p-4 font-mono text-[11px] leading-relaxed text-slate-300">
          {PYTHON_SNIPPET}
        </pre>
      </section>
    </div>
  );
}
