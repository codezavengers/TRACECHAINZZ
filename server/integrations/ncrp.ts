import type { Chain, FraudTypology, InvestigationCase } from "../../src/lib/types";
import { createCaseFromComplaint } from "../complaint";
import { logAuditEvent } from "../db";

export interface NcrpRawComplaintPayload {
  acknowledgementNumber: string; // e.g. "2026/09/DL/0091823"
  incidentDate: string;
  category: string; // e.g. "Cryptocurrency Crime / Investment Fraud"
  subCategory: string;
  complainant: {
    fullName: string;
    email: string;
    mobile: string;
    state: string;
    district: string;
  };
  suspectDetails: {
    suspectWalletAddresses?: string[];
    suspectSocialMediaUrl?: string;
    bankAccountNumber?: string;
    suspectMobile?: string;
  };
  financialDetails: {
    totalLossAmount: number;
    currency: "INR" | "USD" | "USDT";
    transactionHashes?: string[];
  };
  complaintDescription: string;
}

export interface NcrpIngestResponse {
  success: boolean;
  adapterMode: "DEMO_ADAPTER" | "MOCK_INTEGRATION";
  disclaimer: string;
  acknowledgementNumber: string;
  caseId: string;
  investigationCase: InvestigationCase;
  extractedWallets: string[];
  status: "INGESTED_AND_CASE_INITIALIZED";
  receivedAt: string;
}

export const SAMPLE_NCRP_FIXTURES: NcrpRawComplaintPayload[] = [
  {
    acknowledgementNumber: "2026/09/MH/0048192",
    incidentDate: "2026-09-20T14:30:00Z",
    category: "Online Financial Fraud",
    subCategory: "Cryptocurrency Romance Scam (Sha Zhu Pan)",
    complainant: {
      fullName: "Anand Verma",
      email: "anand.verma@gmail.com",
      mobile: "+91-98201-44910",
      state: "Maharashtra",
      district: "Mumbai Suburban",
    },
    suspectDetails: {
      suspectWalletAddresses: ["0x71c0429f939e0807b1d1bc65860d5b77ecb2a601"],
      suspectSocialMediaUrl: "https://t.me/global_arbitrage_vip",
    },
    financialDetails: {
      totalLossAmount: 11800000, // ~118 Lakh INR (~140k USD)
      currency: "INR",
      transactionHashes: ["0x9a8f276189c441503828976d22510aad0201ac7ec88293211d23dca7efae728"],
    },
    complaintDescription:
      "Victim was approached on WhatsApp by an individual posing as a foreign crypto market maker. Convinced to transfer 142,500 USDT to suspect wallet 0x71c0429f939e0807b1d1bc65860d5b77ecb2a601 for automated staking.",
  },
  {
    acknowledgementNumber: "2026/09/DL/0091823",
    incidentDate: "2026-09-22T09:15:00Z",
    category: "Cyber Crime Financial Fraud",
    subCategory: "Telegram Rating Task Scam",
    complainant: {
      fullName: "Meenakshi Sundaram",
      email: "meenakshi.s@yahoo.com",
      mobile: "+91-98110-23849",
      state: "Delhi",
      district: "South Delhi",
    },
    suspectDetails: {
      suspectWalletAddresses: ["TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA"],
    },
    financialDetails: {
      totalLossAmount: 3950000, // ~47k USD
      currency: "INR",
    },
    complaintDescription:
      "Assigned daily YouTube video rating tasks. Forced to recharge TRC-20 USDT into wallet TQ41vQxX9bW9pLz7Y2N1jK6mM4vR8eT3sA to unlock salary payout.",
  },
];

export async function processNcrpComplaint(
  payload: NcrpRawComplaintPayload,
  officerName: string = "Inspector Vikram Mehta"
): Promise<NcrpIngestResponse> {
  const narrative = `[NCRP COMPLAINT REF: ${payload.acknowledgementNumber}]
Complainant: ${payload.complainant.fullName} (${payload.complainant.state}, ${payload.complainant.district})
Category: ${payload.category} - ${payload.subCategory}
Reported Loss: ${payload.financialDetails.totalLossAmount} ${payload.financialDetails.currency}
Reported Suspect Wallets: ${(payload.suspectDetails.suspectWalletAddresses || []).join(", ") || "None"}
Details: ${payload.complaintDescription}`;

  const createdCase = await createCaseFromComplaint(narrative, {
    complaintRef: `NCRP-${payload.acknowledgementNumber.replace(/\//g, "-")}`,
    victimName: payload.complainant.fullName,
    victimEmail: payload.complainant.email,
    officerName,
    source: "NCRP",
  });

  logAuditEvent(
    officerName,
    "INVESTIGATOR",
    "NCRP_COMPLAINT_INGESTED",
    "NCRP_INTEGRATION",
    payload.acknowledgementNumber,
    { caseId: createdCase.id, lossAmount: payload.financialDetails.totalLossAmount }
  );

  return {
    success: true,
    adapterMode: "DEMO_ADAPTER",
    disclaimer:
      "DEMO ADAPTER NOTICE: This endpoint simulates the National Cyber Crime Reporting Portal (NCRP) API schema. In a production deployment, authenticated bilateral mTLS certificates and authorized MHA API keys are required.",
    acknowledgementNumber: payload.acknowledgementNumber,
    caseId: createdCase.id,
    investigationCase: createdCase,
    extractedWallets: createdCase.extractedWallets,
    status: "INGESTED_AND_CASE_INITIALIZED",
    receivedAt: new Date().toISOString(),
  };
}
