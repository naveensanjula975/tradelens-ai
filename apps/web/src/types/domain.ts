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
export interface CommodityAnalyticsSummary {
  commodity: string;
  permission: 'Allowed' | 'Limited' | 'Blocked' | 'Review Required';
  market_state: string;
  risk_score: number;
  evidence_score: number;
  net_quantity_mt: number;
  mtm_value_usd: number;
  available_inventory_mt: number;
  inventory_coverage_pct: number;
  in_transit_shipments: number;
  delayed_shipments: number;
  high_alerts: number;
  medium_alerts: number;
}

export interface PortfolioAnalytics {
  total_portfolio_exposure_usd: number;
  total_credit_limit_usd: number;
  total_current_exposure_usd: number;
  overall_credit_utilization_pct: number;
  highest_risk_commodity: string;
  permission_status_counts: Record<string, number>;
  commodities: CommodityAnalyticsSummary[];
}

// ── Price Watchlist ───────────────────────────────────────────────────────────

export interface PriceWatchlistEntry {
  id: string;
  commodity: string;
  instrument: string;
  label: string;
  direction: 'above' | 'below';
  threshold_price: number;
  current_price: number | null;
  is_triggered: boolean;
  note?: string;
  created_at?: string;
  last_checked_at?: string;
}

export type PriceWatchlistCreate = Omit<PriceWatchlistEntry, 'id' | 'current_price' | 'is_triggered' | 'created_at' | 'last_checked_at'>;

export interface WatchlistEvaluationSummary {
  evaluated_count: number;
  triggered_count: number;
  pending_count: number;
  triggered: PriceWatchlistEntry[];
  pending: PriceWatchlistEntry[];
}
