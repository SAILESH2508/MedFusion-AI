from app.models import models, database
db = next(database.get_db())
scans = db.query(models.Scan).order_by(models.Scan.id.desc()).limit(5).all()
for s in scans:
    print(f"Scan ID: {s.id}, Type: {s.scan_type}, Status: {s.status}")
    report = db.query(models.Report).filter(models.Report.scan_id == s.id).first()
    print(f"  Report: {'Exists' if report else 'None'}")
