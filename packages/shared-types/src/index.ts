/**
 * @tradelens/shared-types
 *
 * Canonical TypeScript type definitions shared across the TradeLens AI
 * monorepo (web app, potential future CLI tools, etc.).
 *
 * All backend-facing types are mirrored here so frontend packages can import
 * from one authoritative source rather than duplicating definitions.
 */

// ── Core domain entities ───────────────────────────────────────────────────────

export interface Position {
  id: string;
  commodity: string;
  instrument: string;
  direction: 'Long' | 'Short';
  quantity: number;
  unit: string;
  entry_price: number;
  market_price: number;
  currency: string;
  counterparty?: string;
}

export interface Inventory {
  id: string;
  commodity: string;
  location: string;
  quantity: number;
  unit: string;
  minimum_required: number;
  available_quantity: number;
}

export interface Shipment {
  id: string;
  commodity: string;
  origin: string;
  destination: string;
  quantity: number;
  unit: string;
  expected_arrival: string;
  status: ShipmentStatus;
  delay_days: number;
}

export type ShipmentStatus = 'In Transit' | 'Loading' | 'Delayed' | 'Delivered' | 'Cancelled';

export interface Counterparty {
  id: string;
  name: string;
  credit_limit: number;
  current_exposure: number;
  risk_rating: string;
}

export interface MarketEvent {
  id: string;
  commodity: string;
  title: string;
  impact_level: ImpactLevel;
  description: string;
  source: string;
  date: string;
}

export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface RiskLimit {
  id: string;
  commodity: string;
  max_position_quantity: number;
  max_counterparty_exposure_pct: number;
  min_inventory_days: number;
}

// ── Risk & decision types ──────────────────────────────────────────────────────

export interface Alert {
  id: string;
  commodity: string;
  category: AlertCategory;
  severity: Severity;
  title: string;
  description: string;
  evidence: string[];
  recommended_action?: string;
  created_at?: string;
}

export type AlertCategory = 'logistics' | 'inventory' | 'credit' | 'concentration' | 'margin' | 'market_data' | 'position';
export type Severity = 'high' | 'medium' | 'low';

export type PermissionOutcome = 'Allowed' | 'Limited' | 'Blocked' | 'Review Required';

export interface DecisionSnapshot {
  commodity: string;
  market_state: string;
  permission: PermissionOutcome;
  evidence_score: number;
  risk_score: number;
  confidence_score: number;
  summary: string;
  supporting_evidence: string[];
  blocking_factors: string[];
  created_at?: string;
}

export interface DecisionHistoryEntry {
  id: string;
  commodity: string;
  market_state: string;
  permission: PermissionOutcome;
  evidence_score: number;
  risk_score: number;
  created_at: string;
}

// ── AI Brief ───────────────────────────────────────────────────────────────────

export interface AIBrief {
  headline: string;
  summary: string;
  why: string[];
  next_actions: string[];
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface DashboardData {
  commodity: string;
  decision: DecisionSnapshot;
  ai_brief: AIBrief;
  alerts: Alert[];
  positions: Position[];
  inventory: Inventory[];
  shipments: Shipment[];
  counterparties: Counterparty[];
}

// ── Utility types ──────────────────────────────────────────────────────────────

/** Strip `id` from an entity type for create payloads. */
export type CreatePayload<T extends { id: string }> = Omit<T, 'id'>;

/** All commodity names supported by the engine. */
export type Commodity = 'Copper' | 'Aluminium' | 'Zinc' | 'Nickel';

export const COMMODITIES: Commodity[] = ['Copper', 'Aluminium', 'Zinc', 'Nickel'];
