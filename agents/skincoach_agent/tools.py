import csv
import os
from typing import List, Dict


PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), "products.csv")


def _load_products() -> List[Dict]:
    products = []
    with open(PRODUCTS_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["price"] = float(row["price"])
            products.append(row)
    return products


PRODUCTS = _load_products()


def suggest_products(
    category: str,
    skin_type: str,
    concern: str,
) -> dict:
    """
    Suggest up to 3 products for a given category, skin_type, and main concern.
    Returns: {"products": [ {name, vendor, url, price}, ... ]}
    """
    category = category.lower()
    skin_type = skin_type.lower()
    concern = concern.lower()

    filtered = []
    for p in PRODUCTS:
        if p["category"].lower() != category:
            continue
        if skin_type and p["skin_type"].lower() != skin_type:
            continue
        if concern and concern not in p["concern"].lower():
            continue
        filtered.append(p)

    # fallback: loosen filters if nothing found
    if not filtered:
        for p in PRODUCTS:
            if p["category"].lower() == category:
                filtered.append(p)

    filtered = sorted(filtered, key=lambda x: x["price"])[:3]
    return {
        "products": [
            {
                "name": p["name"],
                "vendor": p["vendor"],
                "url": p["url"],
                "price": p["price"],
            }
            for p in filtered
        ]
    }


def get_cheapest_product(product_name: str) -> dict:
    """
    Given a product name (approximate text), return the cheapest match and where to buy it.
    Returns: {"product": {name, vendor, url, price}} or {"product": null}
    """
    name_lower = product_name.lower()
    matches = [p for p in PRODUCTS if name_lower in p["name"].lower()]
    if not matches:
        # fuzzy fallback: any product with overlapping words
        tokens = name_lower.split()
        for p in PRODUCTS:
            pname = p["name"].lower()
            if any(t in pname for t in tokens):
                matches.append(p)

    if not matches:
        return {"product": None}

    cheapest = min(matches, key=lambda x: x["price"])
    return {
        "product": {
            "name": cheapest["name"],
            "vendor": cheapest["vendor"],
            "url": cheapest["url"],
            "price": cheapest["price"],
        }
    }
