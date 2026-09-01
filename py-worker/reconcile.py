"""Nightly reconciliation: compare Stripe charges against our ledger."""

import os

import requests
import stripe

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

LEDGER_API = "https://ledger.internal.acme.dev"


def recent_charges(limit: int = 100):
    charges = stripe.Charge.list(limit=limit)
    return charges.data


def refund_charge(charge_id: str, amount: int | None = None):
    return stripe.Refund.create(charge=charge_id, amount=amount)


def customer_for_email(email: str):
    matches = stripe.Customer.list(email=email, limit=1)
    return matches["data"][0] if matches["data"] else None


def raw_balance_transactions(created_after: int):
    # Raw REST call kept for pagination behavior the SDK didn't expose
    # when this was written.
    resp = requests.get(
        "https://api.stripe.com/v1/balance_transactions",
        params={"created[gte]": created_after, "limit": 100},
        auth=(stripe.api_key, ""),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"]


def reconcile(created_after: int) -> list[str]:
    mismatches: list[str] = []
    ledger = requests.get(f"{LEDGER_API}/entries", timeout=30).json()
    ledger_ids = {entry["charge_id"] for entry in ledger}
    for charge in recent_charges():
        if charge["id"] not in ledger_ids:
            mismatches.append(charge["id"])
    return mismatches


def start_payment(amount: int, customer_id: str):
    intent = stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        customer=customer_id,
        payment_method_types=["card", "link"],
    )
    return intent["client_secret"]
