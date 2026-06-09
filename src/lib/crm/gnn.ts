export type GnnNode = {
  id: string;
  label: string;
  /** Layout coordinates in [0, 1] */
  x: number;
  y: number;
  features: number[];
  embedding: number[];
};

export type GnnEdge = {
  from: string;
  to: string;
};

export type GnnGraph = {
  nodes: GnnNode[];
  edges: GnnEdge[];
};

export type GnnLayerWeights = {
  w: number[][];
  b: number[];
};

export type GnnForwardResult = {
  layers: number[][][];
  adjacency: number[][];
  normalizedAdjacency: number[][];
};

/** CRM-themed demo graph: entities as nodes, relationships as edges. */
export function defaultGnnGraph(): GnnGraph {
  const specs: Omit<GnnNode, "embedding">[] = [
    { id: "lead", label: "Lead", x: 0.18, y: 0.28, features: [1, 0, 0] },
    { id: "contact", label: "Contact", x: 0.42, y: 0.14, features: [0, 1, 0] },
    { id: "company", label: "Company", x: 0.72, y: 0.22, features: [0, 0, 1] },
    { id: "deal", label: "Deal", x: 0.58, y: 0.52, features: [1, 0.2, 0] },
    { id: "task", label: "Task", x: 0.28, y: 0.62, features: [0.3, 1, 0.1] },
    { id: "goal", label: "Goal", x: 0.78, y: 0.72, features: [0.1, 0.2, 1] },
  ];

  return {
    nodes: specs.map((n) => ({ ...n, embedding: [...n.features] })),
    edges: [
      { from: "lead", to: "contact" },
      { from: "contact", to: "company" },
      { from: "lead", to: "deal" },
      { from: "contact", to: "deal" },
      { from: "deal", to: "goal" },
      { from: "task", to: "lead" },
      { from: "task", to: "goal" },
      { from: "company", to: "goal" },
    ],
  };
}

export function cloneGraph(graph: GnnGraph): GnnGraph {
  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      features: [...n.features],
      embedding: [...n.embedding],
    })),
    edges: graph.edges.map((e) => ({ ...e })),
  };
}

export function buildAdjacency(graph: GnnGraph, selfLoops = true): number[][] {
  const n = graph.nodes.length;
  const idx = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const a = Array.from({ length: n }, () => Array(n).fill(0));

  for (const { from, to } of graph.edges) {
    const i = idx.get(from);
    const j = idx.get(to);
    if (i == null || j == null) continue;
    a[i]![j] = 1;
    a[j]![i] = 1;
  }

  if (selfLoops) {
    for (let i = 0; i < n; i++) a[i]![i] = 1;
  }

  return a;
}

export function normalizeAdjacency(a: number[][]): number[][] {
  const n = a.length;
  const deg = a.map((row) => row.reduce((s, v) => s + v, 0));
  const dInvSqrt = deg.map((d) => (d > 0 ? 1 / Math.sqrt(d) : 0));
  const out = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[i]![j] = a[i]![j]! * dInvSqrt[i]! * dInvSqrt[j]!;
    }
  }

  return out;
}

function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, w, i) => s + w * v[i]!, 0));
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0]?.length ?? 0;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      for (let j = 0; j < cols; j++) {
        out[i]![j]! += a[i]![k]! * b[k]![j]!;
      }
    }
  }
  return out;
}

export function relu(v: number[]): number[] {
  return v.map((x) => (x > 0 ? x : 0));
}

/** One GCN layer: H' = ReLU(Â H W + b) */
export function gcnLayer(
  h: number[][],
  aNorm: number[][],
  weights: GnnLayerWeights,
): number[][] {
  const hw = h.map((row) => {
    const projected = matVec(weights.w, row);
    return projected.map((x, i) => x + (weights.b[i] ?? 0));
  });
  const aggregated = matMul(aNorm, hw);
  return aggregated.map(relu);
}

/** Deterministic tiny weights for reproducible demo output. */
export function defaultGnnWeights(
  inDim: number,
  hiddenDim: number,
): GnnLayerWeights {
  const w: number[][] = [];
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 0.8 - 0.4;
  };
  for (let i = 0; i < hiddenDim; i++) {
    w.push(Array.from({ length: inDim }, () => rnd()));
  }
  const b = Array.from({ length: hiddenDim }, () => rnd() * 0.2);
  return { w, b };
}

export function forwardGcn(
  graph: GnnGraph,
  weights: GnnLayerWeights[],
): GnnForwardResult {
  const adjacency = buildAdjacency(graph);
  const normalizedAdjacency = normalizeAdjacency(adjacency);
  const layers: number[][][] = [graph.nodes.map((n) => [...n.features])];

  let h = layers[0]!;
  for (const layer of weights) {
    h = gcnLayer(h, normalizedAdjacency, layer);
    layers.push(h.map((row) => [...row]));
  }

  return { layers, adjacency, normalizedAdjacency };
}

export function applyEmbeddings(graph: GnnGraph, embeddings: number[][]): GnnGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node, i) => ({
      ...node,
      embedding: [...(embeddings[i] ?? node.features)],
    })),
  };
}

export function embeddingMagnitude(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

export function formatVector(v: number[], digits = 2): string {
  return `[${v.map((x) => x.toFixed(digits)).join(", ")}]`;
}

export const GCN_FORMULA =
  "H^(l+1) = ReLU( D^(-1/2) (A + I) D^(-1/2) H^(l) W^(l) + b^(l) )";

export const PYTHON_SNIPPET = `# PyTorch Geometric (conceptual)
import torch
from torch_geometric.nn import GCNConv

class CRMGNN(torch.nn.Module):
    def __init__(self, in_ch, hidden_ch):
        super().__init__()
        self.conv1 = GCNConv(in_ch, hidden_ch)
        self.conv2 = GCNConv(hidden_ch, hidden_ch)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        return self.conv2(x, edge_index).relu()`;
