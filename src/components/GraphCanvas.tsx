import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Coins,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { shortAddr, usd } from "@/lib/format";

export interface GraphNode {
  id: string;
  label: string;
  kind: "VICTIM" | "SUSPICIOUS" | "BURNER" | "VASP" | "EXCHANGE" | "BRIDGE" | "MIXER" | "DEFI" | string;
  address: string;
  riskScore: number;
  isVictim?: boolean;
  isVasp?: boolean;
  balance?: number;
  usdValue?: number;
}

export interface GraphEdge {
  id: string;
  txHash: string;
  source: string;
  target: string;
  kind: string;
  amount: number;
  asset: string;
  usdValue?: number;
  timestamp: string;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (nodeId: string) => void;
}

export function GraphCanvas({ nodes, edges, onSelectNode }: GraphCanvasProps) {
  const [scale, setScale] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[1]?.id || nodes[0]?.id || null);
  const [copied, setCopied] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  // Fixed horizontal layout for orderly forensic flow (left to right)
  const nodeSpacing = 190;
  const startX = 90;
  const centerY = 160;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, idx) => {
    // Slight vertical wave offset to give visual organic spacing
    const yOffset = (idx % 2 === 1 ? 1 : -1) * (idx === 0 || idx === nodes.length - 1 ? 0 : 25);
    nodePositions[n.id] = {
      x: startX + idx * nodeSpacing,
      y: centerY + yOffset,
    };
  });

  const getNodeColor = (node: GraphNode) => {
    if (node.isVictim || node.kind === "VICTIM") return { stroke: "#38bdf8", fill: "#0369a1", bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400" };
    if (node.isVasp || node.kind === "VASP" || node.kind === "EXCHANGE") return { stroke: "#10b981", fill: "#047857", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };
    if (node.kind === "SUSPICIOUS") return { stroke: "#f43f5e", fill: "#be123c", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" };
    return { stroke: "#f59e0b", fill: "#b45309", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
  };

  const canvasWidth = Math.max(900, startX + nodes.length * nodeSpacing + 100);
  const canvasHeight = 320;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0e121a] overflow-hidden flex flex-col">
      {/* Canvas Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#121622] text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400" />
            Autonomous Graph Flow
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {nodes.length} Vertices • {edges.length} Directed Hops
          </span>
        </div>

        {/* Zoom Controls & Legend */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-sky-400 inline-block" /> Victim
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500 inline-block" /> Suspect
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-400 inline-block" /> Transit/Burner
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Target VASP
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 hover:bg-white/10 rounded text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-400">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1.5, s + 0.15))}
              className="p-1 hover:bg-white/10 rounded text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-1 hover:bg-white/10 rounded text-slate-300 transition"
              title="Reset Zoom"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative overflow-x-auto overflow-y-hidden bg-[#0a0d14] p-2 min-h-[320px]">
        <svg
          width={canvasWidth * scale}
          height={canvasHeight * scale}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="transition-transform duration-200"
        >
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>
          </defs>

          {/* Grid Background Pattern */}
          <pattern id="canvasGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.8" fill="#ffffff" opacity="0.07" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#canvasGrid)" />

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const srcPos = nodePositions[nodes[idx]?.id || ""] || { x: startX, y: centerY };
            const tgtPos = nodePositions[nodes[idx + 1]?.id || ""] || { x: startX + 200, y: centerY };

            const midX = (srcPos.x + tgtPos.x) / 2;
            const midY = (srcPos.y + tgtPos.y) / 2;

            return (
              <g key={edge.id || idx}>
                {/* Connecting Curved Line */}
                <path
                  d={`M ${srcPos.x} ${srcPos.y} Q ${midX} ${midY - 15}, ${tgtPos.x} ${tgtPos.y}`}
                  fill="none"
                  stroke="url(#edgeGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="4,3"
                  markerEnd="url(#arrowhead)"
                  className="animate-pulse"
                />

                {/* Edge Amount Badge */}
                <g transform={`translate(${midX - 35}, ${midY - 24})`}>
                  <rect
                    width="70"
                    height="18"
                    rx="9"
                    fill="#161a24"
                    stroke="#ffffff"
                    strokeOpacity="0.15"
                  />
                  <text
                    x="35"
                    y="12"
                    textAnchor="middle"
                    fill="#34d399"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {edge.amount.toFixed(2)} {edge.asset}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id] || { x: startX, y: centerY };
            const colors = getNodeColor(node);
            const isSelected = selectedNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  if (onSelectNode) onSelectNode(node.id);
                }}
                className="cursor-pointer group"
              >
                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    r="34"
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    className="animate-spin"
                    style={{ transformOrigin: "0 0" }}
                  />
                )}

                {/* Outer Node Circle */}
                <circle
                  r="26"
                  fill="#0d1117"
                  stroke={isSelected ? colors.stroke : "#ffffff"}
                  strokeOpacity={isSelected ? 1 : 0.2}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Inner Glow Circle */}
                <circle r="20" fill={colors.fill} fillOpacity="0.3" />

                {/* Node Icon / Symbol */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {node.isVictim ? "VIC" : node.isVasp ? "VASP" : `H${node.id.replace(/\D/g, "") || "1"}`}
                </text>

                {/* Node Label Below */}
                <text
                  textAnchor="middle"
                  dy="40"
                  fill="#ffffff"
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {node.label}
                </text>

                {/* Address Snippet */}
                <text
                  textAnchor="middle"
                  dy="54"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {shortAddr(node.address, 5, 4)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="border-t border-white/10 bg-[#121622] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase ${
                getNodeColor(selectedNode).bg
              } ${getNodeColor(selectedNode).text} border ${getNodeColor(selectedNode).border}`}
            >
              {selectedNode.kind}
            </div>
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                <span>{selectedNode.label}</span>
                <span className="text-[11px] font-mono text-slate-400">
                  Risk: {selectedNode.riskScore}/100
                </span>
              </div>
              <div className="font-mono text-slate-400 text-[11px] flex items-center gap-2 pt-0.5">
                <span className="truncate max-w-[280px] sm:max-w-md">{selectedNode.address}</span>
                <button
                  onClick={() => handleCopy(selectedNode.address)}
                  className="text-amber-400 hover:text-amber-300 p-0.5 rounded transition"
                  title="Copy Address"
                >
                  {copied === selectedNode.address ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right shrink-0">
            {selectedNode.usdValue !== undefined && (
              <div>
                <div className="text-slate-400 text-[10px]">Estimated Holding</div>
                <div className="font-mono font-bold text-white text-xs">
                  {usd(selectedNode.usdValue)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
