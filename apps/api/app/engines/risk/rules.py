def shipment_delay_rule(shipment) -> dict | None:
    delay = getattr(shipment, "delay_days", 0)
    if delay >= 5:
        return {
            "rule": "shipment_delay",
            "category": "logistics",
            "severity": "high",
            "score": 25,
            "message": f"Shipment from {shipment.origin} to {shipment.destination} delayed by {delay} days",
            "action": "Confirm revised vessel ETA and locate spot buffer stock."
        }
    elif delay >= 2:
        return {
            "rule": "shipment_delay",
            "category": "logistics",
            "severity": "medium",
            "score": 12,
            "message": f"Shipment from {shipment.origin} to {shipment.destination} delayed by {delay} days",
            "action": "Monitor shipment tracking updates."
        }
    return None

def inventory_below_minimum_rule(inv) -> dict | None:
    avail = getattr(inv, "available_quantity", 0)
    min_req = getattr(inv, "minimum_required", 0)
    if min_req > 0 and avail < min_req:
        deficit_pct = round(((min_req - avail) / min_req) * 100, 1)
        severity = "high" if deficit_pct > 30 else "medium"
        score = 30 if severity == "high" else 15
        return {
            "rule": "inventory_below_minimum",
            "category": "inventory",
            "severity": severity,
            "score": score,
            "message": f"Inventory at {inv.location} ({avail} {inv.unit}) is {deficit_pct}% below minimum requirement ({min_req} {inv.unit})",
            "action": "Review inventory allocation and avoid unhedged physical sales."
        }
    return None

def counterparty_limit_exceeded_rule(cp) -> dict | None:
    limit = getattr(cp, "credit_limit", 0)
    exp = getattr(cp, "current_exposure", 0)
    if limit > 0:
        util_pct = (exp / limit) * 100
        if util_pct >= 90:
            return {
                "rule": "counterparty_limit_exceeded",
                "category": "credit",
                "severity": "high",
                "score": 25,
                "message": f"Counterparty {cp.name} utilization is at {round(util_pct, 1)}% of credit limit (${limit:,.0f})",
                "action": "Halt further credit line expansion for this counterparty."
            }
        elif util_pct >= 80:
            return {
                "rule": "counterparty_limit_exceeded",
                "category": "credit",
                "severity": "medium",
                "score": 12,
                "message": f"Counterparty {cp.name} utilization is at {round(util_pct, 1)}% of limit",
                "action": "Require credit risk desk pre-approval for new trades."
            }
    return None

def high_concentration_rule(positions) -> dict | None:
    if not positions:
        return None
    counterparty_counts = {}
    for p in positions:
        cp = p.counterparty or "Exchange"
        counterparty_counts[cp] = counterparty_counts.get(cp, 0) + p.quantity
    
    total_qty = sum(p.quantity for p in positions)
    if total_qty > 0:
        for cp, qty in counterparty_counts.items():
            pct = (qty / total_qty) * 100
            if pct > 60:
                return {
                    "rule": "high_concentration",
                    "category": "concentration",
                    "severity": "medium",
                    "score": 15,
                    "message": f"High concentration detected: {cp} accounts for {round(pct, 1)}% of total position volume",
                    "action": "Diversify counterparty allocations for upcoming orders."
                }
    return None

def missing_market_price_rule(positions) -> dict | None:
    missing_count = sum(1 for p in positions if getattr(p, "market_price", 0) <= 0)
    if missing_count > 0:
        return {
            "rule": "missing_market_price",
            "category": "market_data",
            "severity": "high",
            "score": 20,
            "message": f"{missing_count} positions are missing active mark-to-market prices",
            "action": "Update spot/futures feed or provide manual benchmark prices."
        }
    return None

def negative_margin_rule(positions) -> dict | None:
    negative_margin_count = 0
    for p in positions:
        direction = getattr(p, "direction", "").lower()
        entry = getattr(p, "entry_price", 0)
        mkt = getattr(p, "market_price", 0)
        if direction == "long" and mkt < entry:
            negative_margin_count += 1
        elif direction == "short" and mkt > entry:
            negative_margin_count += 1

    if negative_margin_count > 0:
        return {
            "rule": "negative_margin",
            "category": "margin",
            "severity": "medium",
            "score": 15,
            "message": f"{negative_margin_count} positions currently have negative unrealized PnL margin",
            "action": "Review mark-to-market valuations and collateral requirements."
        }
    return None

def evaluate_all_rules(positions, inventory, shipments, counterparties, risk_limits=None):
    findings = []
    
    for s in shipments:
        res = shipment_delay_rule(s)
        if res:
            findings.append(res)

    for inv in inventory:
        res = inventory_below_minimum_rule(inv)
        if res:
            findings.append(res)

    for cp in counterparties:
        res = counterparty_limit_exceeded_rule(cp)
        if res:
            findings.append(res)
            
    # Position limit rule check
    total_pos_qty = sum(p.quantity for p in positions if p.direction.lower() == "long")
    if risk_limits and hasattr(risk_limits, "max_position_quantity"):
        max_qty = risk_limits.max_position_quantity
        if total_pos_qty > max_qty:
            findings.append({
                "rule": "position_limit_exceeded",
                "category": "position",
                "severity": "high",
                "score": 20,
                "message": f"Total net long position ({total_pos_qty} MT) exceeds risk limit ({max_qty} MT)",
                "action": "Trim open long positions or execute short hedges."
            })

    # Additional MVP rules
    conc_res = high_concentration_rule(positions)
    if conc_res:
        findings.append(conc_res)

    mkt_res = missing_market_price_rule(positions)
    if mkt_res:
        findings.append(mkt_res)

    margin_res = negative_margin_rule(positions)
    if margin_res:
        findings.append(margin_res)

    return findings

def calculate_scores(findings):
    if not findings:
        return {"risk_score": 15, "evidence_score": 85}
    
    total_risk_points = sum(f["score"] for f in findings)
    risk_score = min(100, 15 + total_risk_points)
    evidence_score = max(10, 100 - int(risk_score * 0.55))
    
    return {
        "risk_score": risk_score,
        "evidence_score": evidence_score
    }
