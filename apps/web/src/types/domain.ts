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
