import csv

# Test the options CSV file
with open("data/csv/sample_options.csv", newline="", encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for i, row in enumerate(reader):
        if i < 3:  # Just check first 3 rows
            print(f"Row {i}: {row}")
            try:
                order = int(row["order"])
                print(f"  Order: {order}")
            except Exception as e:
                print(f"  Error with order: {e}")
                print(f"  Order value: '{row['order']}'")
                print(f"  All keys: {list(row.keys())}")
                break 