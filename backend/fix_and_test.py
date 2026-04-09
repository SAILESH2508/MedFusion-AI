from app.models import models, database
import json

db = next(database.get_db())
# Cleanup scan 23
scan23 = db.query(models.Scan).filter(models.Scan.id == 23).first()
if scan23:
    scan23.status = "error"
    db.commit()
    print("Scan 23 updated to error state.")

# Test if JSON column works (creating a dummy report for scan 22)
try:
    # First delete any existing report for 22 if it exists (it shouldn't based on previous check)
    db.query(models.Report).filter(models.Report.scan_id == 22).delete()
    
    test_report = models.Report(
        scan_id=22,
        findings={"test": "data"},
        severity_score=0.5,
        ai_summary={"summary": "Detailed dict summary test", "protocol": "TEST-V1"},
        doctor_notes="Test report to verify JSON column."
    )
    db.add(test_report)
    db.commit()
    print("JSON column test successful: Report with dict summary created for Scan 22.")
except Exception as e:
    db.rollback()
    print(f"JSON column test FAILED: {str(e)}")
