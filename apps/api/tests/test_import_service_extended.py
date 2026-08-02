"""
Extended Unit & Integration Tests for TradeLens AI Import Service (`app.services.import_service`).
"""

import pytest
from app.services.import_service import (
    import_positions_csv,
    import_inventory_csv,
    import_shipments_csv,
    ImportValidationError,
)
from app.models.entities import PositionModel, InventoryModel, ShipmentModel


class TestImportServiceExtended:
    def test_import_positions_valid(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        csv_content = (
            "commodity,instrument,direction,quantity,unit,entry_price,market_price,counterparty\n"
            "Copper,LME Copper Future,Long,100,MT,9500,9600,Glencore\n"
            "Aluminium,LME Primary,Short,200,MT,2400,2350,Trafigura\n"
        ).encode("utf-8")

        count = import_positions_csv(db, csv_content)
        assert count == 2

        positions = db.query(PositionModel).all()
        assert len(positions) == 2
        assert positions[0].commodity == "Copper"
        assert positions[0].direction == "Long"
        assert positions[1].direction == "Short"

    def test_import_positions_invalid_direction(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        csv_content = (
            "commodity,instrument,direction,quantity,unit,entry_price,market_price\n"
            "Copper,LME Copper Future,InvalidDirection,100,MT,9500,9600\n"
        ).encode("utf-8")

        with pytest.raises(ImportValidationError) as exc_info:
            import_positions_csv(db, csv_content)
        
        detail = exc_info.value.to_detail()
        assert len(detail["errors"]) > 0
        assert detail["errors"][0]["column"] == "direction"

    def test_import_inventory_available_exceeds_quantity(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        csv_content = (
            "commodity,location,quantity,unit,minimum_required,available_quantity\n"
            "Zinc,Rotterdam,500,MT,200,600\n"  # Available (600) > Quantity (500)
        ).encode("utf-8")

        with pytest.raises(ImportValidationError) as exc_info:
            import_inventory_csv(db, csv_content)

        detail = exc_info.value.to_detail()
        assert detail["errors"][0]["code"] == "exceeds_quantity"

    def test_import_shipments_invalid_arrival_date(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        csv_content = (
            "commodity,origin,destination,quantity,expected_arrival,status\n"
            "Nickel,Indonesia,Rotterdam,1000,02/28/2026,In Transit\n"  # Invalid non-ISO format
        ).encode("utf-8")

        with pytest.raises(ImportValidationError) as exc_info:
            import_shipments_csv(db, csv_content)

        detail = exc_info.value.to_detail()
        assert detail["errors"][0]["code"] == "invalid_date"

    def test_import_empty_file_error(self, isolated_client):
        client, session_factory = isolated_client
        db = session_factory()

        with pytest.raises(ImportValidationError) as exc_info:
            import_positions_csv(db, b"")

        detail = exc_info.value.to_detail()
        assert detail["errors"][0]["code"] == "empty_file"
