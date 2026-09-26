import type { Chain, FraudTypology, RiskBand, CaseStatus, Role, DataProvenance } from "../../src/lib/types";

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  agency?: string;
  createdAt: string;
}

export interface DbAgency {
  id: string;
  name: string;
  code: string;
  jurisdiction: string;
  country: string;
  contactEmail: string;
  createdAt: string;
}

export interface DbComplaint {
  id: string;
  caseId?: string;
  complaintRef: string;
  source: "NCRP" | "SAHYOG" | "DIRECT_FIR" | "VICTIM_INTAKE" | "INTERPOL";
  victimName?: string;
  victimEmail?: string;
  victimPhone?: string;
  complaintText: string;
  lossAmount: number;
  lossCurrency: string;
  lossUsd: number;
  reportedWallets: string[];
  reportedTxHashes: string[];
  chain?: Chain;
  fraudTypology: FraudTypology;
  createdAt: string;
}

export interface DbCase {
  id: string;
  title: string;
  description: string;
  reportedWallet: string;
  chain: Chain;
  status: CaseStatus;
  riskBand: RiskBand;
  riskScore: number;
  priorityScore: number;
  typology: FraudTypology;
  reportedLossUsd: number;
  traceableUsd: number;
  complaintRef: string;
  complaintText: string;
  investigator: string;
  recoveryProbability: number;
  extractedWallets: string[];
  connectedVictims: number;
  provenance: DataProvenance;
  victimName?: string;
  victimEmail?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  targetVasp?: string;
  freezeStatus?: "NOT_REQUESTED" | "SUBMITTED" | "ACKNOWLEDGED" | "ASSETS_FROZEN" | "REJECTED";
  notes: Array<{
    id: string;
    body: string;
    text?: string;
    author: string;
    createdAt: string;
    timestamp?: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    detail: string;
    actor: string;
    createdAt: string;
    timestamp?: string;
  }>;
}

export interface DbWallet {
  address: string;
  chain: Chain;
  label?: string;
  kind: "VICTIM" | "SUSPICIOUS" | "BURNER" | "INTERMEDIARY" | "CONSOLIDATION" | "VASP" | "EXCHANGE" | "BRIDGE" | "MIXER" | "DEFI" | "UNKNOWN";
  clusterId?: string;
  balanceNative: number;
  balanceUsd: number;
  txCount: number;
  isContract: boolean;
  firstSeenAt?: string;
  lastSeenAt?: string;
  riskScore: number;
  riskBand: RiskBand;
  associatedCaseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DbWalletCluster {
  id: string;
  name: string;
  entityType: "VASP" | "MIXER" | "BRIDGE" | "FRAUD_SYNDICATE" | "UNKNOWN";
  addresses: string[];
  chain: Chain;
  confidence: number;
  attributionSource: string;
  createdAt: string;
}

export interface DbTransaction {
  id: string;
  hash: string;
  chain: Chain;
  blockNumber?: number;
  timestamp: string;
  from: string;
  to: string;
  asset: string;
  amount: number;
  amountUsd?: number | null;
  fee?: number | string;
  status: "CONFIRMED" | "PENDING" | "FAILED";
  caseId?: string;
  investigationId?: string;
  hopIndex?: number;
  provenance: DataProvenance;
}

export interface DbTokenTransfer {
  id: string;
  txHash: string;
  chain: Chain;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  from: string;
  to: string;
  amountRaw: string;
  amountFormatted: number;
  usdValue?: number | null;
  timestamp: string;
}

export interface DbInvestigation {
  id: string;
  caseId: string;
  targetAddress: string;
  chain: Chain;
  maxDepth: number;
  minValue: number;
  direction: "OUTGOING" | "INCOMING" | "BOTH";
  status: "COMPLETED" | "RUNNING" | "FAILED";
  discoveredHops: number;
  discoveredWallets: number;
  discoveredTxs: number;
  attributedVasp?: string;
  riskScore: number;
  startedAt: string;
  completedAt?: string;
  investigator: string;
}

export interface DbInvestigationPath {
  id: string;
  investigationId: string;
  hopNumber: number;
  sourceAddress: string;
  sourceRole: string;
  targetAddress: string;
  targetRole: string;
  txHash: string;
  asset: string;
  amount: number;
  amountUsd?: number;
  timestamp: string;
  chain: Chain;
  detectedVasp?: string;
  detectedBridge?: string;
  detectedDex?: string;
}

export interface DbVasp {
  id: string;
  name: string;
  legalEntity: string;
  category: "CENTRALIZED_EXCHANGE" | "PAYMENT_PROCESSOR" | "MIXER_PRIVACY" | "BRIDGE_PROTOCOL";
  jurisdiction: string;
  complianceRating: string;
  kycStandard: string;
  responseLatencyHours: number;
  registeredFiu: boolean;
  contactEmail: string;
  subpoenaFormat: string;
  subpoenaPortal?: string;
  cooperationLevel: "HIGH" | "MEDIUM" | "LOW" | "NON_COOPERATIVE";
  avgFreezeTimeHours: number;
  knownAddresses: Record<string, string[]>; // chain -> addresses
  createdAt: string;
}

export interface DbVaspAddress {
  address: string;
  chain: Chain;
  vaspId: string;
  vaspName: string;
  label: string;
  clusterType: "HOT_WALLET" | "COLD_VAULT" | "DEPOSIT_GATEWAY" | "SWEEP_TRANSIT";
  confidence: number;
  verifiedAt: string;
}

export interface DbBridge {
  id: string;
  name: string;
  protocol: string;
  supportedChains: Chain[];
  contractAddresses: Record<string, string>; // chain -> contract
  website?: string;
  knownDepositPatterns?: string[];
}

export interface DbDex {
  id: string;
  name: string;
  protocol: string;
  chain: Chain;
  routerAddress: string;
  factoryAddress?: string;
}

export interface DbMixer {
  id: string;
  name: string;
  chain: Chain;
  sanctioned: boolean;
  sanctionSource?: string; // e.g. OFAC SDN List
  addresses: string[];
  depositDenominations?: string[];
}

export interface DbRiskAssessment {
  id: string;
  address: string;
  chain: Chain;
  caseId?: string;
  overallScore: number;
  band: RiskBand;
  threatCategory: string;
  explanation: string;
  evaluatedAt: string;
}

export interface DbRiskSignal {
  id: string;
  assessmentId?: string;
  address: string;
  chain: Chain;
  signalType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  weight: number;
  title: string;
  description: string;
  evidenceTxs: string[];
  createdAt: string;
}

export interface DbAlert {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";
  message: string;
  caseId?: string;
  walletAddress?: string;
  chain?: Chain;
  txHash?: string;
  amount?: number;
  asset?: string;
  vasp?: string;
  riskScore?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface DbWatchlist {
  id: string;
  address: string;
  chain: Chain;
  label: string;
  riskBand: RiskBand;
  riskScore: number;
  status: "ACTIVE" | "ALERTING" | "MONITORING" | "SUSPENDED";
  caseId?: string;
  lastActive: string;
  balanceNative: number;
  balanceUsd: number;
  ticker: string;
  lastCheckedAt: string;
  addedAt: string;
  notes?: string;
}

export interface DbEvidenceRecord {
  id: string;
  caseId: string;
  sequenceIndex: number;
  timestamp: string;
  actor: string;
  title: string;
  type: "COMPLAINT_INTAKE" | "ON_CHAIN_PROBE" | "FORENSIC_EVALUATION" | "VASP_IDENTIFICATION" | "ACTION_PACKET_DIRECTIVE" | "AUDIT_ATTESTATION";
  payload: Record<string, any>;
  canonicalPayload: string;
  payloadHash: string; // SHA-256(canonicalPayload)
  previousHash: string; // Hash of sequenceIndex - 1 (or genesis for index 0)
  recordHash: string; // SHA-256(id + timestamp + actor + payloadHash + previousHash)
}

export interface DbAuditLog {
  id: string;
  actor: string;
  actorRole: Role;
  action:
    | "LOGIN"
    | "CASE_CREATED"
    | "CASE_UPDATED"
    | "STATUS_CHANGED"
    | "NOTE_ADDED"
    | "INVESTIGATION_STARTED"
    | "TRACE_STARTED"
    | "WALLET_ADDED"
    | "WATCHLIST_MODIFIED"
    | "EVIDENCE_ADDED"
    | "EVIDENCE_VERIFIED"
    | "REPORT_GENERATED"
    | "ACTION_PACKET_GENERATED"
    | "NCRP_COMPLAINT_INGESTED"
    | "ALERT_ACKNOWLEDGED";
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export interface DbAiAnalysis {
  id: string;
  caseId?: string;
  targetAddress: string;
  chain: Chain;
  executiveSummary: string;
  threatAssessment: string;
  recommendedSubpoenas: string[];
  countermeasureTactics: string[];
  modelUsed: string;
  createdAt: string;
}

export interface DbReport {
  id: string;
  caseId: string;
  title: string;
  investigator: string;
  agency: string;
  generatedAt: string;
  contentMarkdown: string;
  contentHtml: string;
  evidenceRootHash: string;
  isTamperEvidentVerified: boolean;
}

export interface DbActionPacket {
  id: string;
  caseId: string;
  recipientVasp: string;
  targetAddress: string;
  chain: Chain;
  jurisdiction: string;
  issuingOfficer: string;
  statutoryBasis: string;
  noticeText: string;
  evidenceHashes: string[];
  generatedAt: string;
  status: "DRAFT" | "ISSUED" | "ACKNOWLEDGED" | "FROZEN";
}

export interface DbApiIntegration {
  id: string;
  name: "NCRP" | "SAHYOG" | "INTERPOL" | "CUSTOM_WEBHOOK";
  status: "ACTIVE" | "MOCK_MODE" | "DISABLED";
  endpointUrl: string;
  apiKeyMasked: string;
  lastSyncAt?: string;
  ingestedCount: number;
}
