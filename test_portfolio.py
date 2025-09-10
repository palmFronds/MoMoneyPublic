from unified_app.firebase_setup.firebaseSet import db
from google.cloud.firestore import FieldFilter

def check_portfolio():
    try:
        print("Checking portfolio entries...")
        
        # Check portfolio entries
        portfolio_ref = db.collection('portfolio_entries')
        entries = list(portfolio_ref.where('session_id', '==', 'session_71JDaONSbEZDztu8UcprSGMXR1s2_1').stream())
        
        print(f"Found {len(entries)} portfolio entries")
        
        # Check for entries with holdings
        entries_with_holdings = [doc for doc in entries if doc.to_dict().get('holdings', 0) > 0]
        print(f"Entries with holdings: {len(entries_with_holdings)}")
        
        if entries_with_holdings:
            print("Entries with holdings:")
            for doc in entries_with_holdings:
                data = doc.to_dict()
                print(f"  {data.get('symbol')}: {data.get('holdings')} shares @ ${data.get('avg_price')}")
        else:
            print("No entries with holdings found")
            
        # Show first few entries regardless of holdings
        print("\nFirst 5 portfolio entries:")
        for i, doc in enumerate(entries[:5]):
            data = doc.to_dict()
            print(f"  {i+1}. {data.get('symbol')}: {data.get('holdings')} shares @ ${data.get('avg_price')}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_portfolio() 