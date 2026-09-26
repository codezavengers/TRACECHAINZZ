import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  DbUser,
  DbAgency,
  DbComplaint,
  DbCase,
  DbWallet,
  DbWalletCluster,
  DbTransaction,
  DbTokenTransfer,
  DbInvestigation,
  DbInvestigationPath,
  DbVasp,
  DbVaspAddress,
  DbBridge,
  DbDex,
  DbMixer,
  DbRiskAssessment,
  DbRiskSignal,
  DbAlert,
  DbWatchlist,
  DbEvidenceRecord,
  DbAuditLog,
  DbAiAnalysis,
  DbReport,
  DbActionPacket,
  DbApiIntegration,
} from "./schema";
import type { Role, CaseStatus, Chain, FraudTypology, RiskBand } from "../../src/lib/types";

interface TraceChainDatabaseStore {
  users: DbUser[];
  agencies: DbAgency[];
  complaints: DbComplaint[];
  cases: DbCase[];
  wallets: DbWallet[];
  walletClusters: DbWalletCluster[];
  transactions: DbTransaction[];
  tokenTransfers: DbTokenTransfer[];
  investigations: DbInvestigation[];
  investigationPaths: DbInvestigationPath[];
  vasps: DbVasp[];
  vaspAddresses: DbVaspAddress[];
  bridges: DbBridge[];
  dexes: DbDex[];
  mixers: DbMixer[];
  riskAssessments: DbRiskAssessment[];
  riskSignals: DbRiskSignal[];
  alerts: DbAlert[];
  watchlist: DbWatchlist[];
  evidenceRecords: DbEvidenceRecord[];
  auditLogs: DbAuditLog[];
  aiAnalyses: DbAiAnalysis[];
  reports: DbReport[];
  actionPackets: DbActionPacket[];
  apiIntegrations: DbApiIntegration[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "tracechain_db.json");

let memoryStore: TraceChainDatabaseStore | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;

function getGenesisHash(): string {
  return "0000000000000000000000000000000000000000000000000000000000000000";
}

function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
  return `{${pairs.join(",")}}`;
}

export function computeSha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function initSeedData(): TraceChainDatabaseStore {
  const now = new Date();
  const iso = now.toISOString();

  const users: DbUser[] = [
    {
      id: "usr-1",
      name: "Inspector Vikram Mehta",
      email: "vikram.mehta@cybercrime.gov.in",
      role: "INVESTIGATOR",
      department: "Cyber Crime Financial Investigation Unit",
      agency: "Delhi Police Cyber Cell / NCRP Desk",
      createdAt: new Date(Date.now() - 90 * 86400 * 1000).toISOString(),
    },
    {
      id: "usr-2",
      name: "Dr. Anya Sharma",
      email: "anya.sharma@forensics.org",
      role: "ANALYST",
      department: "Blockchain Intelligence & Heuristics",
      agency: "National Cyber Forensics Laboratory",
      createdAt: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
    },
    {
      id: "usr-3",
      name: "Superintendent Rajesh Rao",
      email: "rajesh.rao@police.gov.in",
      role: "ADMIN",
      department: "Directorate of Criminal Investigation",
      agency: "Central Bureau of Investigation (CBI)",
      createdAt: new Date(Date.now() - 120 * 86400 * 1000).toISOString(),
    },
    {
      id: "usr-4",
      name: "Legal Officer Priya Nair",
      email: "priya.nair@prosecution.gov.in",
      role: "VIEWER",
      department: "State Prosecution Audit Cell",
      agency: "Directorate of Enforcement (ED)",
      createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    },
  ];

  const agencies: DbAgency[] = [
    {
      id: "ag-delhi-cyber",
      name: "Delhi Police Special Cyber Cell",
      code: "DP-CC",
      jurisdiction: "Delhi / NCT",
      country: "India",
      contactEmail: "cybercell-delhi@nic.in",
      createdAt: iso,
    },
    {
      id: "ag-cbi-fc",
      name: "Central Bureau of Investigation - Financial Crimes",
      code: "CBI-FC",
      jurisdiction: "National / Federal",
      country: "India",
      contactEmail: "cbi-economic@gov.in",
      createdAt: iso,
    },
  ];

  const cases: DbCase[] = [
    {
      id: "TC-2025-0841",
      title: "Sha Zhu Pan (Pig Butchering) -> OKX Hot Deposit Gateway",
      description: "WhatsApp romance inducement leading to fake liquidity pool. 142,500 USDT funnelled via 2 transit burner wallets directly into OKX hot deposit.",
      reportedWallet: "0x71c0429f939e0807b1d1bc65860d5b77ecb2a601",
      chain: "ethereum",
      status: "VASP_IDENTIFIED",
      riskBand: "CRITICAL",
      riskScore: 94,
      priorityScore: 91,
      typology: "PIG_BUTCHERING",
      reportedLossUsd: 142500,
      traceableUsd: 138200,
      complaintRef: "NCRP-2025-MH-94821",
      complaintText: "Victim was contacted via dating application and convinced to invest savings into a high-yield decentralized arbitrage pool. Initial withdrawal succeeded, following which a major deposit of 142,500 USDT was stolen and swept into mixer/burners.",
      investigator: "Inspector Vikram Mehta",
      recoveryProbability: 0.88,
      extractedWallets: [
        "0x71c0429f939e0807b1d1bc65860d5b77ecb2a601",
        "0x892a019483012984029482049280492840928402",
        "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b",
      ],
      connectedVictims: 1,
      provenance: "LIVE_BLOCKCHAIN_DATA",
      victimName: "Rohan Kapoor",
      victimEmail: "rohan.k@gmail.com",
      assignedTo: "Inspector Vikram Mehta",
      createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      targetVasp: "OKX Exchange",
      freezeStatus: "SUBMITTED",
      notes: [
        {
          id: "note-1",
          body: "Victim lured through fake dating profile on Tinder, redirected to malicious liquidity staking dApp.",
          text: "Victim lured through fake dating profile on Tinder, redirected to malicious liquidity staking dApp.",
          author: "Inspector Vikram Mehta",
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          id: "note-2",
          body: "Automated heuristic detected 2 burner hops before consolidation into OKX 3 Deposit Address.",
          text: "Automated heuristic detected 2 burner hops before consolidation into OKX 3 Deposit Address.",
          author: "TRACE-AI Heuristic Engine",
          createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        },
      ],
      activity: [
        {
          id: "act-1",
          action: "CASE_CREATED",
          detail: "FIR NCRP-2025-MH-94821 ingested via National Cyber Crime Reporting Portal",
          actor: "System",
          createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        },
        {
          id: "act-2",
          action: "AUTONOMOUS_TRACE_COMPLETED",
          detail: "3 hops resolved: Target -> Burner 1 -> Intermediary Splitter -> OKX Cluster Address",
          actor: "TraceChain Engine",
          createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        },
        {
          id: "act-3",
          action: "ACTION_PACK_PREPARED",
          detail: "Section 91 CrPC Preservation Notice and Subpoena Packet generated for OKX Compliance Desk",
          actor: "Inspector Vikram Mehta",
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
      ],
    },
    {
      id: "TC-2025-0792",
      title: "Telegram Part-Time Job Task Scam -> Binance TRC-20 Sweep",
      description: "Victims assigned YouTube video rating tasks and required to recharge pre-paid wallets. Over 48,000 USDT drained across 12 complaints.",
      reportedWallet: "TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA",
      chain: "tron",
      status: "ACTION_REQUIRED",
      riskBand: "CRITICAL",
      riskScore: 97,
      priorityScore: 95,
      typology: "TASK_SCAM",
      reportedLossUsd: 48000,
      traceableUsd: 46500,
      complaintRef: "NCRP-2025-DL-11029",
      complaintText: "Telegram channel 'Alpha Media Review Task' promised 3000 INR per task. Victims forced to transfer USDT to activate VIP withdrawal tiers.",
      investigator: "Dr. Anya Sharma",
      recoveryProbability: 0.92,
      extractedWallets: [
        "TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA",
        "TMuA6YqfCeX8EhbfYEg5y7S4D1Dc2M4K8A",
      ],
      connectedVictims: 12,
      provenance: "LIVE_BLOCKCHAIN_DATA",
      victimName: "Pooja Deshmukh & 11 Others",
      victimEmail: "pooja.d@gmail.com",
      assignedTo: "Dr. Anya Sharma",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      targetVasp: "Binance Global",
      freezeStatus: "NOT_REQUESTED",
      notes: [
        {
          id: "note-3",
          body: "Direct sweep pattern to Binance Hot Deposit Address confirmed on TRON mainnet.",
          text: "Direct sweep pattern to Binance Hot Deposit Address confirmed on TRON mainnet.",
          author: "Dr. Anya Sharma",
          createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        },
      ],
      activity: [
        {
          id: "act-4",
          action: "CASE_CREATED",
          detail: "FIR NCRP-2025-DL-11029 ingested",
          actor: "System",
          createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        },
      ],
    },
    {
      id: "TC-2025-0619",
      title: "Healthcare Ransomware Extortion -> Bitcoin Peel Chain -> Mixer",
      description: "Hospital network encrypted by LockBit 3.0 variant. Ransom paid in BTC; funds undergoing systematic peeling toward CoinJoin / Wasabi privacy clusters.",
      reportedWallet: "bc1qa5wkgaew2dkv56kfvj49j0av5nqvrl529w46dn",
      chain: "bitcoin",
      status: "TRACING",
      riskBand: "HIGH",
      riskScore: 89,
      priorityScore: 84,
      typology: "RANSOMWARE",
      reportedLossUsd: 320000,
      traceableUsd: 285000,
      complaintRef: "CBI-CYBER-2025-0042",
      complaintText: "Multi-specialty hospital management server locked with .lockbit extension. 5.2 BTC extortion payment sent from corporate treasury wallet.",
      investigator: "Inspector Vikram Mehta",
      recoveryProbability: 0.65,
      extractedWallets: [
        "bc1qa5wkgaew2dkv56kfvj49j0av5nqvrl529w46dn",
        "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97",
      ],
      connectedVictims: 1,
      provenance: "LIVE_BLOCKCHAIN_DATA",
      victimName: "Apex Healthcare Ltd.",
      assignedTo: "Inspector Vikram Mehta",
      createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      targetVasp: "Unidentified Wasabi Mixer Cluster",
      freezeStatus: "NOT_REQUESTED",
      notes: [],
      activity: [],
    },
    {
      id: "TC-2025-0550",
      title: "Permit2 Phishing Signature Drainer -> Cross-Chain Bridge Hopping",
      description: "Malicious Google Search ad mimicking Uniswap frontend tricked victim into signing off-chain Permit2 typed approval. $87,200 drained and bridged to Avalanche.",
      reportedWallet: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      chain: "polygon",
      status: "ANALYZING",
      riskBand: "HIGH",
      riskScore: 82,
      priorityScore: 78,
      typology: "MALWARE_DRAINER",
      reportedLossUsd: 87200,
      traceableUsd: 84000,
      complaintRef: "NCRP-2025-KA-38104",
      complaintText: "Victim clicked sponsored search result for Uniswap and connected MetaMask. Within 1 block, 87,200 USDC was transferred without gas fees via Permit2 signature.",
      investigator: "Dr. Anya Sharma",
      recoveryProbability: 0.72,
      extractedWallets: [
        "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
        "0x3304e22ddaa22bdda6fe3a598c257b49466e31b6",
      ],
      connectedVictims: 1,
      provenance: "LIVE_BLOCKCHAIN_DATA",
      victimName: "Vikrant Patil",
      victimEmail: "vikrant.patil@outlook.com",
      assignedTo: "Dr. Anya Sharma",
      createdAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      targetVasp: "Stargate Cross-Chain Router",
      freezeStatus: "NOT_REQUESTED",
      notes: [],
      activity: [],
    },
  ];

  const complaints: DbComplaint[] = [
    {
      id: "comp-1",
      caseId: "TC-2025-0841",
      complaintRef: "NCRP-2025-MH-94821",
      source: "NCRP",
      victimName: "Rohan Kapoor",
      victimEmail: "rohan.k@gmail.com",
      complaintText: cases[0].complaintText,
      lossAmount: 142500,
      lossCurrency: "USDT",
      lossUsd: 142500,
      reportedWallets: ["0x71c0429f939e0807b1d1bc65860d5b77ecb2a601"],
      reportedTxHashes: ["0x9a8f276189c441503828976d22510aad0201ac7ec88293211d23dca7efae728"],
      chain: "ethereum",
      fraudTypology: "PIG_BUTCHERING",
      createdAt: cases[0].createdAt,
    },
  ];

  const vasps: DbVasp[] = [
    {
      id: "vasp-binance",
      name: "Binance Global",
      legalEntity: "Binance Holdings Ltd.",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "Multiple (Cayman / UAE / France / El Salvador)",
      complianceRating: "A- (Responsive to LE Portal)",
      kycStandard: "Strict Tier-2 Biometric ID",
      responseLatencyHours: 4,
      registeredFiu: true,
      contactEmail: "compliance-le@binance.com",
      subpoenaFormat: "Kodak Law Enforcement Portal (LEP)",
      subpoenaPortal: "https://www.binance.com/en/support/law-enforcement",
      cooperationLevel: "HIGH",
      avgFreezeTimeHours: 6,
      knownAddresses: {
        bitcoin: [
          "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo",
          "3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6",
          "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
        ],
        ethereum: [
          "0x28c6c06298d514db089934071355e5743bf21d60",
          "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
          "0xdfd5293d8e347dfee59e53b244454e7e60397e7b",
          "0x56ed60771dc35d397a82c3d433fee70ba46b084a",
          "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8",
        ],
        bsc: [
          "0x8894e0a0c962cb723c1976a4421c95949be2d4e3",
          "0x0d0707963952f2fba59dd06f2b425ace40b492fe",
        ],
        tron: [
          "TMuA6YqfCeX8EhbfYEg5y7S4D1Dc2M4K8A",
          "TNPeeaaTKeh22mvYfsWhVKbZGDTQWer5KA",
        ],
        solana: [
          "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S",
        ],
      },
      createdAt: iso,
    },
    {
      id: "vasp-okx",
      name: "OKX Exchange",
      legalEntity: "Aux Cayes FinTech Co. Ltd",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "Seychelles / Bahamas / UAE",
      complianceRating: "B+ (Requires Verified Official Email)",
      kycStandard: "Tier-2 KYC / Liveness Detection",
      responseLatencyHours: 8,
      registeredFiu: true,
      contactEmail: "law-enforcement@okx.com",
      subpoenaFormat: "Secured PDF Directive / INTERPOL Notice",
      cooperationLevel: "HIGH",
      avgFreezeTimeHours: 12,
      knownAddresses: {
        ethereum: [
          "0x6cC5F688a30d379E122c5992b855295cf643bd69",
          "0xa7efae728d2936e78bda97dc267687568dd593f3",
          "0x5a21b3f940268ec3802e3b3a6e9a8f276189c441",
        ],
        tron: [
          "TMc6HdQ649B2mF3kL48p6tUuD2bQ8a1Z5y",
        ],
      },
      createdAt: iso,
    },
    {
      id: "vasp-kraken",
      name: "Kraken (Payward)",
      legalEntity: "Payward Inc.",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "United States (FinCEN / state licenses)",
      complianceRating: "A+ (US Court & MLAT Responsive)",
      kycStandard: "FinCEN Tier-3 Comprehensive",
      responseLatencyHours: 2,
      registeredFiu: true,
      contactEmail: "subpoenas@kraken.com",
      subpoenaFormat: "18 U.S.C. § 981 / 2703(d) Orders",
      cooperationLevel: "HIGH",
      avgFreezeTimeHours: 4,
      knownAddresses: {
        bitcoin: ["bc1qx9t2l3pymy2svxwhq5ph72x0pksq25nd52u243"],
        ethereum: [
          "0x2910543af39aba0cd09dbb2d50200b3e800a63d2",
          "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13",
        ],
      },
      createdAt: iso,
    },
    {
      id: "vasp-coinbase",
      name: "Coinbase Global",
      legalEntity: "Coinbase Inc.",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "United States (Delaware / NY DFS)",
      complianceRating: "A+ (Direct LE Portal / 24x7)",
      kycStandard: "US Strict FinCEN Tier-3",
      responseLatencyHours: 3,
      registeredFiu: true,
      contactEmail: "law-enforcement-requests@coinbase.com",
      subpoenaFormat: "Federal Subpoena / LE Portal",
      cooperationLevel: "HIGH",
      avgFreezeTimeHours: 5,
      knownAddresses: {
        bitcoin: ["bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97"],
        ethereum: [
          "0x71660c4005ba85c37ccec55d0c4493e66fe775d3",
          "0x503828976d22510aad0201ac7ec88293211d23dc",
          "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740",
        ],
        base: ["0x3304e22ddaa22bdda6fe3a598c257b49466e31b6"],
        solana: ["H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS"],
      },
      createdAt: iso,
    },
    {
      id: "vasp-coindcx",
      name: "CoinDCX (Neblio Technologies)",
      legalEntity: "Neblio Technologies Pvt. Ltd.",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "India (FIU-IND Registered / PMLA Compliant)",
      complianceRating: "A (Dedicated Indian Law Enforcement Desk)",
      kycStandard: "Aadhaar / PAN Strict e-KYC",
      responseLatencyHours: 2,
      registeredFiu: true,
      contactEmail: "nodal@coindcx.com",
      subpoenaFormat: "Section 91 / 102 CrPC Formal Directive",
      cooperationLevel: "HIGH",
      avgFreezeTimeHours: 3,
      knownAddresses: {
        ethereum: ["0xd90e2f925da726b50c4ed8d0fb90ad053324f31b"],
        polygon: ["0x456c606298d514db089934071355e5743bf21d45"],
      },
      createdAt: iso,
    },
    {
      id: "vasp-wazirx",
      name: "WazirX (Zanmai Labs)",
      legalEntity: "Zanmai Labs Pvt Ltd / Zettai Pte Ltd",
      category: "CENTRALIZED_EXCHANGE",
      jurisdiction: "India (FIU-IND) / Singapore",
      complianceRating: "B (Subject to Legal Advisory Review)",
      kycStandard: "Indian Statutory KYC (PAN + Video)",
      responseLatencyHours: 6,
      registeredFiu: true,
      contactEmail: "nodal@wazirx.com",
      subpoenaFormat: "Section 91 CrPC Notice",
      cooperationLevel: "MEDIUM",
      avgFreezeTimeHours: 12,
      knownAddresses: {
        ethereum: ["0x5041ed759dd4afc3a72b8192c143f72f4724081a"],
      },
      createdAt: iso,
    },
    {
      id: "vasp-tornado",
      name: "Tornado Cash (OFAC Sanctioned)",
      legalEntity: "Decentralized Smart Contract Mixer",
      category: "MIXER_PRIVACY",
      jurisdiction: "Decentralized / OFAC SDN List (August 2022)",
      complianceRating: "F (Non-Compliant / Sanctioned)",
      kycStandard: "None (Zero-Knowledge Mixer)",
      responseLatencyHours: 999,
      registeredFiu: false,
      contactEmail: "none@tornado.cash",
      subpoenaFormat: "Direct On-Chain Asset Blacklist",
      cooperationLevel: "NON_COOPERATIVE",
      avgFreezeTimeHours: 0,
      knownAddresses: {
        ethereum: [
          "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
          "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",
          "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
          "0xa160cdab225685da1d56aa342ad8841c3b53f291",
        ],
      },
      createdAt: iso,
    },
  ];

  const bridges: DbBridge[] = [
    {
      id: "br-stargate",
      name: "Stargate Finance",
      protocol: "LayerZero Omnichain",
      supportedChains: ["ethereum", "polygon", "bsc", "arbitrum", "optimism", "avalanche"],
      contractAddresses: {
        ethereum: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
        polygon: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
        avalanche: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
      },
    },
    {
      id: "br-hop",
      name: "Hop Protocol",
      protocol: "Hop Bridge Router",
      supportedChains: ["ethereum", "polygon", "arbitrum", "optimism"],
      contractAddresses: {
        ethereum: "0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a",
      },
    },
    {
      id: "br-portal",
      name: "Portal Bridge (Wormhole)",
      protocol: "Wormhole Core",
      supportedChains: ["ethereum", "solana", "polygon", "bsc", "avalanche"],
      contractAddresses: {
        ethereum: "0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B",
        solana: "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth",
      },
    },
  ];

  const dexes: DbDex[] = [
    {
      id: "dex-uniswap-v3",
      name: "Uniswap V3 SwapRouter",
      protocol: "Uniswap",
      chain: "ethereum",
      routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    {
      id: "dex-uniswap-universal",
      name: "Uniswap Universal Router",
      protocol: "Uniswap",
      chain: "ethereum",
      routerAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
    },
    {
      id: "dex-pancakeswap-v2",
      name: "PancakeSwap V2 Router",
      protocol: "PancakeSwap",
      chain: "bsc",
      routerAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    },
    {
      id: "dex-sunswap",
      name: "SunSwap V2 Router",
      protocol: "SunSwap",
      chain: "tron",
      routerAddress: "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax",
    },
  ];

  const mixers: DbMixer[] = [
    {
      id: "mx-tornado",
      name: "Tornado Cash",
      chain: "ethereum",
      sanctioned: true,
      sanctionSource: "OFAC SDN List",
      addresses: [
        "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
        "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",
        "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
        "0xa160cdab225685da1d56aa342ad8841c3b53f291",
      ],
      depositDenominations: ["0.1 ETH", "1 ETH", "10 ETH", "100 ETH"],
    },
  ];

  const alerts: DbAlert[] = [
    {
      id: "alt-1",
      type: "LARGE_SWEEP_DETECTED",
      severity: "CRITICAL",
      status: "OPEN",
      message: "Unusual transfer of 45,000 USDT into unverified high-risk transit node",
      caseId: "TC-2025-0841",
      walletAddress: "0x71c0429f939e0807b1d1bc65860d5b77ecb2a601",
      chain: "ethereum",
      amount: 45000,
      asset: "USDT",
      vasp: "OKX Exchange",
      riskScore: 94,
      acknowledged: false,
      createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
    {
      id: "alt-2",
      type: "VASP_DEPOSIT_MATCH",
      severity: "HIGH",
      status: "OPEN",
      message: "Target wallet funds detected entering Binance TRC-20 deposit gateway",
      caseId: "TC-2025-0792",
      walletAddress: "TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA",
      chain: "tron",
      amount: 46500,
      asset: "USDT",
      vasp: "Binance Global",
      riskScore: 97,
      acknowledged: false,
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "alt-3",
      type: "PEEL_CHAIN_CONSOLIDATION",
      severity: "MEDIUM",
      status: "ACKNOWLEDGED",
      message: "0.85 BTC output change split detected during ransom hop analysis",
      caseId: "TC-2025-0619",
      walletAddress: "bc1qa5wkgaew2dkv56kfvj49j0av5nqvrl529w46dn",
      chain: "bitcoin",
      amount: 0.85,
      asset: "BTC",
      riskScore: 89,
      acknowledged: true,
      acknowledgedBy: "Inspector Vikram Mehta",
      acknowledgedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    },
  ];

  const watchlist: DbWatchlist[] = [
    {
      id: "w-1",
      address: "0x71c0429f939e0807b1d1bc65860d5b77ecb2a601",
      chain: "ethereum",
      label: "Sha Zhu Pan Transit Burner",
      riskBand: "CRITICAL",
      riskScore: 94,
      status: "ALERTING",
      caseId: "TC-2025-0841",
      lastActive: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      balanceNative: 0.05,
      balanceUsd: 138.5,
      ticker: "ETH",
      lastCheckedAt: iso,
      addedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      notes: "Suspect wallet identified in dating app fraud complaint",
    },
    {
      id: "w-2",
      address: "TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA",
      chain: "tron",
      label: "Telegram Task Scam Hub",
      riskBand: "CRITICAL",
      riskScore: 97,
      status: "ACTIVE",
      caseId: "TC-2025-0792",
      lastActive: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      balanceNative: 124.5,
      balanceUsd: 32.8,
      ticker: "TRX",
      lastCheckedAt: iso,
      addedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      notes: "High-frequency TRC-20 USDT aggregator",
    },
    {
      id: "w-3",
      address: "bc1qa5wkgaew2dkv56kfvj49j0av5nqvrl529w46dn",
      chain: "bitcoin",
      label: "LockBit Hospital Extortion Destination",
      riskBand: "HIGH",
      riskScore: 89,
      status: "MONITORING",
      caseId: "TC-2025-0619",
      lastActive: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      balanceNative: 4.35,
      balanceUsd: 285000,
      ticker: "BTC",
      lastCheckedAt: iso,
      addedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      notes: "Active peel chain under watch",
    },
  ];

  // Build initial tamper-evident evidence chain for TC-2025-0841
  const evidenceRecords: DbEvidenceRecord[] = [];
  const case1 = cases[0];
  const e1Payload = {
    caseId: case1.id,
    targetAddress: case1.reportedWallet,
    chain: case1.chain,
    complaintRef: case1.complaintRef,
    victimName: case1.victimName,
  };
  const e1Canonical = canonicalStringify(e1Payload);
  const e1PayloadHash = computeSha256(e1Canonical);
  const e1RecordHash = computeSha256(
    `ev-intake-${case1.id}|${case1.createdAt}|TraceChain Automated Intake Engine|${e1PayloadHash}|${getGenesisHash()}`
  );

  evidenceRecords.push({
    id: `ev-intake-${case1.id}`,
    caseId: case1.id,
    sequenceIndex: 0,
    timestamp: case1.createdAt,
    actor: "TraceChain Automated Intake Engine",
    title: `Intake Target Record: ${case1.reportedWallet.slice(0, 10)}... (ETH)`,
    type: "COMPLAINT_INTAKE",
    payload: e1Payload,
    canonicalPayload: e1Canonical,
    payloadHash: e1PayloadHash,
    previousHash: getGenesisHash(),
    recordHash: e1RecordHash,
  });

  const e2Payload = {
    caseId: case1.id,
    provider: "Ethereum Mainnet JSON-RPC",
    blockHeight: 21890432,
    txCount: 14,
    balance: "0.05 ETH",
  };
  const e2Canonical = canonicalStringify(e2Payload);
  const e2PayloadHash = computeSha256(e2Canonical);
  const e2RecordHash = computeSha256(
    `ev-rpc-${case1.id}|${new Date(Date.now() - 35 * 3600 * 1000).toISOString()}|Native JSON-RPC Subsystem|${e2PayloadHash}|${e1RecordHash}`
  );

  evidenceRecords.push({
    id: `ev-rpc-${case1.id}`,
    caseId: case1.id,
    sequenceIndex: 1,
    timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString(),
    actor: "Native JSON-RPC Subsystem",
    title: "Live Blockchain Verification: Ethereum Mainnet Node",
    type: "ON_CHAIN_PROBE",
    payload: e2Payload,
    canonicalPayload: e2Canonical,
    payloadHash: e2PayloadHash,
    previousHash: e1RecordHash,
    recordHash: e2RecordHash,
  });

  const e3Payload = {
    caseId: case1.id,
    riskScore: 94,
    detectedPatterns: ["LAYERING_DISPERSAL", "HIGH_VELOCITY_PASSTHROUGH"],
    threatCategory: "High Velocity Layering Transit Sink",
  };
  const e3Canonical = canonicalStringify(e3Payload);
  const e3PayloadHash = computeSha256(e3Canonical);
  const e3RecordHash = computeSha256(
    `ev-forensics-${case1.id}|${new Date(Date.now() - 34 * 3600 * 1000).toISOString()}|TraceChain Pattern & Heuristic Engine|${e3PayloadHash}|${e2RecordHash}`
  );

  evidenceRecords.push({
    id: `ev-forensics-${case1.id}`,
    caseId: case1.id,
    sequenceIndex: 2,
    timestamp: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
    actor: "TraceChain Pattern & Heuristic Engine",
    title: "Forensic Pattern & Risk Ledger (Score: 94)",
    type: "FORENSIC_EVALUATION",
    payload: e3Payload,
    canonicalPayload: e3Canonical,
    payloadHash: e3PayloadHash,
    previousHash: e2RecordHash,
    recordHash: e3RecordHash,
  });

  const e4Payload = {
    caseId: case1.id,
    vasp: "OKX Exchange",
    clusterAddress: "0x6cC5F688a30d379E122c5992b855295cf643bd69",
    hopDistance: 2,
    confidence: 0.91,
    subpoenaContact: "law-enforcement@okx.com",
  };
  const e4Canonical = canonicalStringify(e4Payload);
  const e4PayloadHash = computeSha256(e4Canonical);
  const e4RecordHash = computeSha256(
    `ev-vasp-${case1.id}|${new Date(Date.now() - 30 * 3600 * 1000).toISOString()}|Authoritative VASP Directory Subsystem|${e4PayloadHash}|${e3RecordHash}`
  );

  evidenceRecords.push({
    id: `ev-vasp-${case1.id}`,
    caseId: case1.id,
    sequenceIndex: 3,
    timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    actor: "Authoritative VASP Directory Subsystem",
    title: "VASP Legal Attribution Record (OKX Exchange)",
    type: "VASP_IDENTIFICATION",
    payload: e4Payload,
    canonicalPayload: e4Canonical,
    payloadHash: e4PayloadHash,
    previousHash: e3RecordHash,
    recordHash: e4RecordHash,
  });

  const auditLogs: DbAuditLog[] = [
    {
      id: "aud-1",
      actor: "Inspector Vikram Mehta",
      actorRole: "INVESTIGATOR",
      action: "LOGIN",
      resource: "SYSTEM_AUTH",
      resourceId: "usr-1",
      timestamp: new Date(Date.now() - 37 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-2",
      actor: "System Intake",
      actorRole: "INVESTIGATOR",
      action: "CASE_CREATED",
      resource: "CASE",
      resourceId: "TC-2025-0841",
      timestamp: cases[0].createdAt,
    },
    {
      id: "aud-3",
      actor: "Inspector Vikram Mehta",
      actorRole: "INVESTIGATOR",
      action: "TRACE_STARTED",
      resource: "INVESTIGATION",
      resourceId: "TC-2025-0841",
      timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString(),
    },
    {
      id: "aud-4",
      actor: "Inspector Vikram Mehta",
      actorRole: "INVESTIGATOR",
      action: "EVIDENCE_VERIFIED",
      resource: "EVIDENCE_CHAIN",
      resourceId: "TC-2025-0841",
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
  ];

  const apiIntegrations: DbApiIntegration[] = [
    {
      id: "integ-ncrp",
      name: "NCRP",
      status: "ACTIVE",
      endpointUrl: "https://cybercrime.gov.in/api/v2/complaints/webhook",
      apiKeyMasked: "ncrp_sec_live_*******7a9",
      lastSyncAt: iso,
      ingestedCount: 42,
    },
    {
      id: "integ-sahyog",
      name: "SAHYOG",
      status: "ACTIVE",
      endpointUrl: "https://sahyog.mha.gov.in/forensics/intake",
      apiKeyMasked: "sahyog_gov_******b82",
      lastSyncAt: iso,
      ingestedCount: 18,
    },
  ];

  return {
    users,
    agencies,
    complaints,
    cases,
    wallets: [],
    walletClusters: [],
    transactions: [],
    tokenTransfers: [],
    investigations: [],
    investigationPaths: [],
    vasps,
    vaspAddresses: [],
    bridges,
    dexes,
    mixers,
    riskAssessments: [],
    riskSignals: [],
    alerts,
    watchlist,
    evidenceRecords,
    auditLogs,
    aiAnalyses: [],
    reports: [],
    actionPackets: [],
    apiIntegrations,
  };
}

export function getDatabase(): TraceChainDatabaseStore {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      memoryStore = JSON.parse(content);
      // Ensure all arrays exist in case of migration
      const template = initSeedData();
      for (const key of Object.keys(template) as Array<keyof TraceChainDatabaseStore>) {
        if (!memoryStore![key] || !Array.isArray(memoryStore![key])) {
          (memoryStore as any)[key] = template[key];
        }
      }
      return memoryStore!;
    }
  } catch (err) {
    console.warn("[TraceChain DB] Error reading persistent store, creating fresh database:", err);
  }

  // Create initial seed database
  memoryStore = initSeedData();
  persistDatabaseSync();
  return memoryStore;
}

export function persistDatabaseSync(): void {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryStore, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("[TraceChain DB] Failed to save database to disk:", err);
  }
}

export function scheduleDatabaseSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    persistDatabaseSync();
  }, 100);
}

// ---------------------------------------------------------------------------
// Case Operations
// ---------------------------------------------------------------------------
export function getAllCases(): DbCase[] {
  const db = getDatabase();
  return db.cases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCaseById(id: string): DbCase | null {
  const db = getDatabase();
  return db.cases.find((c) => c.id === id) || null;
}

export function insertCase(newCase: DbCase): DbCase {
  const db = getDatabase();
  db.cases.unshift(newCase);
  scheduleDatabaseSave();
  return newCase;
}

export function updateCase(id: string, updates: Partial<DbCase>): DbCase | null {
  const db = getDatabase();
  const idx = db.cases.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  db.cases[idx] = {
    ...db.cases[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  scheduleDatabaseSave();
  return db.cases[idx];
}

// ---------------------------------------------------------------------------
// Watchlist Operations
// ---------------------------------------------------------------------------
export function getWatchlist(): DbWatchlist[] {
  const db = getDatabase();
  return db.watchlist;
}

export function addWatchlistWallet(item: DbWatchlist): DbWatchlist {
  const db = getDatabase();
  const existingIdx = db.watchlist.findIndex((w) => w.address.toLowerCase() === item.address.toLowerCase() && w.chain === item.chain);
  if (existingIdx !== -1) {
    db.watchlist[existingIdx] = { ...db.watchlist[existingIdx], ...item };
    scheduleDatabaseSave();
    return db.watchlist[existingIdx];
  }
  db.watchlist.unshift(item);
  scheduleDatabaseSave();
  return item;
}

export function removeWatchlistWallet(id: string): boolean {
  const db = getDatabase();
  const len = db.watchlist.length;
  db.watchlist = db.watchlist.filter((w) => w.id !== id);
  if (db.watchlist.length !== len) {
    scheduleDatabaseSave();
    return true;
  }
  return false;
}

export function updateWatchlistWallet(id: string, updates: Partial<DbWatchlist>): DbWatchlist | null {
  const db = getDatabase();
  const idx = db.watchlist.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  db.watchlist[idx] = { ...db.watchlist[idx], ...updates };
  scheduleDatabaseSave();
  return db.watchlist[idx];
}

// ---------------------------------------------------------------------------
// Alert Operations
// ---------------------------------------------------------------------------
export function getAlerts(): DbAlert[] {
  const db = getDatabase();
  return db.alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function insertAlert(alert: DbAlert): DbAlert {
  const db = getDatabase();
  db.alerts.unshift(alert);
  scheduleDatabaseSave();
  return alert;
}

export function updateAlert(id: string, updates: Partial<DbAlert>): DbAlert | null {
  const db = getDatabase();
  const idx = db.alerts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  db.alerts[idx] = { ...db.alerts[idx], ...updates };
  scheduleDatabaseSave();
  return db.alerts[idx];
}

// ---------------------------------------------------------------------------
// Evidence Operations & Genuine Cryptographic Hash Chain
// ---------------------------------------------------------------------------
export function getEvidenceRecordsForCase(caseId: string): DbEvidenceRecord[] {
  const db = getDatabase();
  return db.evidenceRecords
    .filter((e) => e.caseId === caseId)
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
}

export function addEvidenceRecord(
  caseId: string,
  title: string,
  type: DbEvidenceRecord["type"],
  actor: string,
  payload: Record<string, any>
): DbEvidenceRecord {
  const db = getDatabase();
  const existing = getEvidenceRecordsForCase(caseId);
  const sequenceIndex = existing.length;

  const previousHash = sequenceIndex === 0
    ? getGenesisHash()
    : existing[sequenceIndex - 1].recordHash;

  const now = new Date().toISOString();
  const id = `ev-${caseId}-${sequenceIndex + 1}-${Date.now().toString(36)}`;
  const canonicalPayload = canonicalStringify(payload);
  const payloadHash = computeSha256(canonicalPayload);

  const hashPreimage = `${id}|${now}|${actor}|${payloadHash}|${previousHash}`;
  const recordHash = computeSha256(hashPreimage);

  const newRecord: DbEvidenceRecord = {
    id,
    caseId,
    sequenceIndex,
    timestamp: now,
    actor,
    title,
    type,
    payload,
    canonicalPayload,
    payloadHash,
    previousHash,
    recordHash,
  };

  db.evidenceRecords.push(newRecord);
  scheduleDatabaseSave();
  return newRecord;
}

export interface EvidenceVerificationResult {
  verified: boolean;
  totalRecords: number;
  genesisHash: string;
  rootHash: string;
  chainValid: boolean;
  tamperedRecords: Array<{
    sequenceIndex: number;
    id: string;
    reason: string;
    expectedHash?: string;
    computedHash?: string;
  }>;
  verifiedAt: string;
  courtCertificate: {
    statute: string;
    issuingSystem: string;
    algorithm: "SHA-256";
    evidenceIntegrityStatus: "AUTHENTIC_UNMODIFIED" | "INTEGRITY_COMPROMISED";
  };
}

export function verifyEvidenceChain(caseId: string): EvidenceVerificationResult {
  const records = getEvidenceRecordsForCase(caseId);
  const tampered: EvidenceVerificationResult["tamperedRecords"] = [];

  let expectedPreviousHash = getGenesisHash();

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    // 1. Verify sequence index
    if (rec.sequenceIndex !== i) {
      tampered.push({
        sequenceIndex: rec.sequenceIndex,
        id: rec.id,
        reason: `Broken sequence: expected index ${i}, got ${rec.sequenceIndex}`,
      });
    }

    // 2. Verify payload hash against canonical payload
    const computedPayloadHash = computeSha256(canonicalStringify(rec.payload));
    if (computedPayloadHash !== rec.payloadHash) {
      tampered.push({
        sequenceIndex: rec.sequenceIndex,
        id: rec.id,
        reason: `Payload content altered. Stored payloadHash does not match recalculation.`,
        expectedHash: rec.payloadHash,
        computedHash: computedPayloadHash,
      });
    }

    // 3. Verify previous hash chaining
    if (rec.previousHash !== expectedPreviousHash) {
      tampered.push({
        sequenceIndex: rec.sequenceIndex,
        id: rec.id,
        reason: `Hash chain link broken. Previous hash does not match prior record.`,
        expectedHash: expectedPreviousHash,
        computedHash: rec.previousHash,
      });
    }

    // 4. Verify record hash
    const computedRecordHash = computeSha256(
      `${rec.id}|${rec.timestamp}|${rec.actor}|${rec.payloadHash}|${rec.previousHash}`
    );
    if (computedRecordHash !== rec.recordHash) {
      tampered.push({
        sequenceIndex: rec.sequenceIndex,
        id: rec.id,
        reason: `Record header or metadata modified. Record hash mismatch.`,
        expectedHash: rec.recordHash,
        computedHash: computedRecordHash,
      });
    }

    expectedPreviousHash = rec.recordHash;
  }

  const isChainValid = records.length > 0 && tampered.length === 0;
  const rootHash = records.length > 0 ? records[records.length - 1].recordHash : getGenesisHash();

  return {
    verified: isChainValid,
    totalRecords: records.length,
    genesisHash: getGenesisHash(),
    rootHash,
    chainValid: isChainValid,
    tamperedRecords: tampered,
    verifiedAt: new Date().toISOString(),
    courtCertificate: {
      statute: "Section 65B Indian Evidence Act 1872 / Bharatiya Sakshya Adhiniyam 2023 & Fed. R. Evid. 902(13)",
      issuingSystem: "TraceChain Tamper-Evident Evidence Ledger v2.4",
      algorithm: "SHA-256",
      evidenceIntegrityStatus: isChainValid ? "AUTHENTIC_UNMODIFIED" : "INTEGRITY_COMPROMISED",
    },
  };
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------
export function logAuditEvent(
  actor: string,
  actorRole: Role,
  action: DbAuditLog["action"],
  resource: string,
  resourceId: string,
  metadata?: Record<string, any>,
  ipAddress?: string
): DbAuditLog {
  const db = getDatabase();
  const log: DbAuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    actor,
    actorRole,
    action,
    resource,
    resourceId,
    metadata,
    timestamp: new Date().toISOString(),
    ipAddress,
  };
  db.auditLogs.unshift(log);
  // Keep last 1000 logs in active memory
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  scheduleDatabaseSave();
  return log;
}

export function getAuditLogs(limit: number = 100): DbAuditLog[] {
  const db = getDatabase();
  return db.auditLogs.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Investigations & Multi-Hop Paths
// ---------------------------------------------------------------------------
export function insertInvestigation(inv: DbInvestigation): DbInvestigation {
  const db = getDatabase();
  db.investigations.unshift(inv);
  scheduleDatabaseSave();
  return inv;
}

export function insertInvestigationPaths(paths: DbInvestigationPath[]): void {
  const db = getDatabase();
  db.investigationPaths.push(...paths);
  scheduleDatabaseSave();
}

export function getInvestigationPaths(investigationId: string): DbInvestigationPath[] {
  const db = getDatabase();
  return db.investigationPaths
    .filter((p) => p.investigationId === investigationId)
    .sort((a, b) => a.hopNumber - b.hopNumber);
}

// ---------------------------------------------------------------------------
// Reports & Action Packets
// ---------------------------------------------------------------------------
export function saveReport(report: DbReport): DbReport {
  const db = getDatabase();
  const idx = db.reports.findIndex((r) => r.caseId === report.caseId);
  if (idx !== -1) {
    db.reports[idx] = report;
  } else {
    db.reports.unshift(report);
  }
  scheduleDatabaseSave();
  return report;
}

export function getReportByCaseId(caseId: string): DbReport | null {
  const db = getDatabase();
  return db.reports.find((r) => r.caseId === caseId) || null;
}

export function saveActionPacket(packet: DbActionPacket): DbActionPacket {
  const db = getDatabase();
  const idx = db.actionPackets.findIndex((p) => p.caseId === packet.caseId);
  if (idx !== -1) {
    db.actionPackets[idx] = packet;
  } else {
    db.actionPackets.unshift(packet);
  }
  scheduleDatabaseSave();
  return packet;
}

export function getActionPacketByCaseId(caseId: string): DbActionPacket | null {
  const db = getDatabase();
  return db.actionPackets.find((p) => p.caseId === caseId) || null;
}

// ---------------------------------------------------------------------------
// User Operations
// ---------------------------------------------------------------------------
export function getAllUsers(): DbUser[] {
  const db = getDatabase();
  return db.users;
}

export function getUserById(id: string): DbUser | null {
  const db = getDatabase();
  return db.users.find((u) => u.id === id) || null;
}
