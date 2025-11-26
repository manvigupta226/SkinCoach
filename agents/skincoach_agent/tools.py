# agents/skincoach_agent/tools.py
import csv
import os
from typing import List, Dict

PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), "products.csv")


def _infer_category(product_type: str) -> str:
    """Normalize product types."""
    pt = product_type.lower()

    if any(k in pt for k in ["cleanser", "face wash", "wash"]):
        return "cleanser"
    if any(k in pt for k in ["moisturizer", "cream", "gel", "lotion"]):
        return "moisturizer"
    if any(k in pt for k in ["sunscreen", "spf"]):
        return "sunscreen"
    if "serum" in pt:
        return "serum"
    if "toner" in pt:
        return "toner"
    if any(k in pt for k in ["exfoliant", "scrub", "peel"]):
        return "exfoliant"
    if "treatment" in pt:
        return "treatment"

    return pt.strip() or "other"


def _load_products() -> List[Dict]:
    """Load your Indian skincare dataset (no price/vendor/url)."""
    products: List[Dict] = []

    with open(PRODUCTS_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            name = row.get("product_name", "").strip()
            product_type = row.get("product_type", "").strip()
            ingredients = row.get("ingredients", "").strip()

            if not name:
                continue

            category = _infer_category(product_type)

            products.append(
                {
                    "name": name,
                    "product_type": product_type.lower(),
                    "category": category,
                    "ingredients": ingredients,
                }
            )

    return products


PRODUCTS = _load_products()


def suggest_products(category: str, limit: int = 5) -> dict:
    """
    Return a list of matching products by category.
    (No price, no vendor, no urls)
    """
    category = category.lower()

    matches = [
        p for p in PRODUCTS
        if category in p["category"] or category in p["product_type"]
    ]

    if not matches:
        return {"products": []}

    return {"products": matches[:limit]}


def get_cheapest_product(product_name: str) -> dict:
    """
    Deprecated behavior — now just return the closest name match.
    (We don’t have prices anymore.)
    """
    name_lower = product_name.lower()

    matches = [
        p for p in PRODUCTS
        if name_lower in p["name"].lower()
    ]

    if not matches:
        return {"product": None}

    # Instead of cheapest, return first match
    return {"product": matches[0]}
