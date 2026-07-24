MARKET_STATES = [
    "Normal",
    "Supply Tightening",
    "Inventory Pressure",
    "Logistics Disruption",
    "Credit Risk Elevated",
    "Exposure Concentrated",
    "Mixed Conditions",
]

def classify_market_state(findings):
    if not findings:
        return "Normal"

    categories = [f["category"] for f in findings]
    has_high_severity = any(f["severity"] == "high" for f in findings)
    
    logistics_issues = categories.count("logistics")
    inventory_issues = categories.count("inventory")
    credit_issues = categories.count("credit")
    
    if logistics_issues >= 1 and inventory_issues >= 1:
        return "Logistics Disruption"
    elif inventory_issues >= 2 or (inventory_issues >= 1 and has_high_severity):
        return "Inventory Pressure"
    elif credit_issues >= 1:
        return "Credit Risk Elevated"
    elif logistics_issues >= 1:
        return "Supply Tightening"
    elif len(findings) >= 3:
        return "Mixed Conditions"
    
    return "Normal"
