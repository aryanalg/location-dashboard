"""
Location Dashboard - Local Server
Reads Excel file from OneDrive sync folder and serves as JSON
"""

from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow dashboard to fetch from this server

# ============================================
# Configuration - UPDATE THIS PATH
# ============================================
EXCEL_FILE_PATH = os.path.expanduser("~/Library/CloudStorage/OneDrive-SharedLibraries-MKSJewelryInternationalCoLtd(HeadOffice)/Business - Documents/Silver J/Location Tracking/Location Journal C640.xlsx")

# Sheets that contain PO data (add more as needed)
PO_SHEET_PATTERN = ["40413", "41393", "42147", "43015"]

# ============================================
# Excel Reading
# ============================================

def read_excel_data():
    """Read all PO sheets from Excel and combine into one dataset"""

    if not os.path.exists(EXCEL_FILE_PATH):
        return {
            "error": f"Excel file not found at: {EXCEL_FILE_PATH}",
            "jobs": [],
            "timestamp": datetime.now().isoformat()
        }

    try:
        xls = pd.ExcelFile(EXCEL_FILE_PATH)
        all_jobs = []

        # Find sheets that match PO patterns
        for sheet_name in xls.sheet_names:
            # Check if sheet name contains any PO number
            is_po_sheet = any(po in sheet_name for po in PO_SHEET_PATTERN)

            # Also check if sheet name looks like a PO (starts with digits)
            if not is_po_sheet:
                # Try to detect PO sheets by checking if name starts with 4-5 digits
                sheet_prefix = ''.join(c for c in sheet_name.split()[0] if c.isdigit())
                if len(sheet_prefix) >= 4:
                    is_po_sheet = True

            if is_po_sheet:
                try:
                    df = pd.read_excel(xls, sheet_name=sheet_name)

                    # Process each row
                    for _, row in df.iterrows():
                        job_no = str(row.get('Job No', '')).strip()

                        # Skip empty rows or header-like rows
                        if not job_no or job_no == 'nan' or not job_no.startswith('SO'):
                            continue

                        # Extract PO from Job No if PO No column is empty
                        po_no = str(row.get('PO No', '')).replace('.0', '').strip()
                        if po_no == 'nan' or not po_no:
                            # Try to extract from job_no (e.g., SO40413-001-J1 -> 40413)
                            parts = job_no.replace('SO', '').split('-')
                            if parts:
                                po_no = parts[0]

                        job = {
                            'jobNo': job_no,
                            'poNo': po_no,
                            'sku': str(row.get('Internal SKU', '')).strip() if str(row.get('Internal SKU', '')) != 'nan' else '',
                            'plating': str(row.get('Plating', '')).strip() if str(row.get('Plating', '')) != 'nan' else '',
                            'batchQty': safe_int(row.get('Batch Qty', 0)),
                            'totalQty': safe_int(row.get('Total Qty', 0)),
                            'size': str(row.get('Size', '')).strip() if str(row.get('Size', '')) != 'nan' else '',
                            'location': str(row.get('Location', '')).strip() if str(row.get('Location', '')) != 'nan' else '',
                            'notesPre': str(row.get('Notes ( Pre Production Gan )', '')).strip() if str(row.get('Notes ( Pre Production Gan )', '')) != 'nan' else '',
                            'notesNew': str(row.get('Notes (  Production New)', '')).strip() if str(row.get('Notes (  Production New)', '')) != 'nan' else '',
                            'dateSending': format_date(row.get('Date Sending')),
                            'dateReceive': format_date(row.get('Date Receive')),
                            'weightCasting': safe_float(row.get('Weight after Casting (Gan)')),
                            'weightPolishing': safe_float(row.get('Weight after Polishing (New)')),
                            'weightPlating': safe_float(row.get('Weight after Plating (Bow)')),
                            'accWt': safe_float(row.get('ACC wt'))
                        }
                        all_jobs.append(job)

                except Exception as e:
                    print(f"Error reading sheet {sheet_name}: {e}")
                    continue

        return {
            "jobs": all_jobs,
            "count": len(all_jobs),
            "timestamp": datetime.now().isoformat(),
            "file": EXCEL_FILE_PATH
        }

    except Exception as e:
        return {
            "error": str(e),
            "jobs": [],
            "timestamp": datetime.now().isoformat()
        }


def safe_int(value):
    """Safely convert to int"""
    try:
        if pd.isna(value):
            return 0
        return int(float(value))
    except:
        return 0


def safe_float(value):
    """Safely convert to float"""
    try:
        if pd.isna(value):
            return None
        return round(float(value), 2)
    except:
        return None


def format_date(value):
    """Format date value"""
    try:
        if pd.isna(value) or str(value) in ['NaT', 'nan', '']:
            return ''
        if isinstance(value, str):
            return value[:10]
        return value.strftime('%Y-%m-%d')
    except:
        return ''


# ============================================
# API Endpoints
# ============================================

@app.route('/')
def home():
    return jsonify({
        "service": "Location Dashboard API",
        "endpoints": {
            "/api/data": "Get all job data from Excel",
            "/api/health": "Check if server is running"
        }
    })


@app.route('/api/data')
def get_data():
    """Main endpoint - returns all job data"""
    return jsonify(read_excel_data())


@app.route('/api/health')
def health():
    """Health check endpoint"""
    file_exists = os.path.exists(EXCEL_FILE_PATH)
    return jsonify({
        "status": "ok",
        "file_exists": file_exists,
        "file_path": EXCEL_FILE_PATH,
        "timestamp": datetime.now().isoformat()
    })


# ============================================
# Run Server
# ============================================

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Location Dashboard - Local Server")
    print("="*50)
    print(f"Excel file: {EXCEL_FILE_PATH}")
    print(f"File exists: {os.path.exists(EXCEL_FILE_PATH)}")
    print(f"\nServer running at: http://localhost:5050")
    print(f"Dashboard API: http://localhost:5050/api/data")
    print("\nPress Ctrl+C to stop the server")
    print("="*50 + "\n")

    app.run(host='127.0.0.1', port=5050, debug=False)
