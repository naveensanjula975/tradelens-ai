export interface Position {
  id: string;
  commodity: string;
  instrument: string;
  direction: string;
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
  status: string;
  delay_days: number;
}

export interface Counterparty {
  id: string;
  name: string;
  credit_limit: number;
  current_exposure: number;
  risk_rating: string;
}

export interface Alert {
  id: string;
  commodity: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  recommended_action?: string;
  created_at?: string;
}

export interface DecisionSnapshot {
  commodity: string;
  market_state: string;
  permission: 'Allowed' | 'Limited' | 'Blocked' | 'Review Required';
  evidence_score: number;
  risk_score: number;
  confidence_score: number;
  summary: string;
  supporting_evidence: string[];
  blocking_factors: string[];
  created_at?: string;
}

export interface AIBrief {
  headline: string;
  summary: string;
  why: string[];
  next_actions: string[];
}

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

// ── New domain types ──────────────────────────────────────────────────────────

export interface MarketEvent {
  id: string;
  commodity: string;
  title: string;
  impact_level: 'High' | 'Medium' | 'Low';
  description: string;
  source: string;
  date: string;
}

export interface RiskLimit {
  id: string;
  commodity: string;
  max_position_quantity: number;
  max_counterparty_exposure_pct: number;
  min_inventory_days: number;
}

export interface DecisionHistoryEntry {
  id: string;
  commodity: string;
  market_state: string;
  permission: 'Allowed' | 'Limited' | 'Blocked' | 'Review Required';
  evidence_score: number;
  risk_score: number;
  created_at: string;
}

export interface SimulationParams {
  commodity: string;
  price_shift_pct: number;
  inventory_shift_pct: number;
  added_shipment_delay_days: number;
  counterparty_exposure_shift_pct: number;
}

export interface SimulationResult {
  commodity: string;
  parameters: SimulationParams;
  baseline: {
    permission: string;
    market_state: string;
    evidence_score: number;
    risk_score: number;
    findings_count: number;
    critical_findings_count: number;
  };
  simulated: {
    permission: string;
    market_state: string;
    evidence_score: number;
    risk_score: number;
    findings_count: number;
    critical_findings_count: number;
  };
  delta: {
    risk_score_change: number;
    evidence_score_change: number;
    permission_changed: boolean;
    new_findings: Array<{
      rule: string;
      category: string;
      severity: string;
      score: number;
      message: string;
      action?: string;
    }>;
  };
}

