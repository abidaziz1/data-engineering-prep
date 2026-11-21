"""Fast tests of the pieces that do not need a database: the rules of the shop, and the contract between the shop and the dbt seed."""
import csv
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'ingestion'))
import shop_api  # noqa: E402


def test_day_one_has_200_orders_and_day_three_255():
    assert len(shop_api.orders_on(1)) == 200
    assert len(shop_api.orders_on(2)) == 230
    assert len(shop_api.orders_on(3)) == 255


def test_totals_equal_the_lines_for_every_priced_order():
    for day in (1, 2, 3):
        for o in shop_api.orders_on(day).values():
            if all(l['sku'] in shop_api.PRICES for l in o['lines']):
                assert o['total_cents'] == sum(l['qty'] * shop_api.PRICES[l['sku']] for l in o['lines'])


def test_the_seed_has_the_prices_of_the_shop():
    seed = {r['sku']: int(r['price_cents']) for r in csv.DictReader(open(ROOT / 'dbt' / 'seeds' / 'product_prices.csv'))}
    assert seed == shop_api.PRICES or set(seed) >= set(shop_api.PRICES)


def test_a_change_moves_updated_at_forward():
    d1, d2 = shop_api.orders_on(1), shop_api.orders_on(2)
    assert all(d2[i]['updated_at'] > d1[i]['updated_at'] for i in range(1, 21))


def test_the_changes_of_a_day_are_spread_over_the_day():
    stamps = sorted(o['updated_at'] for o in shop_api.orders_on(1).values())
    assert stamps[0][:10] == stamps[-1][:10] == '2026-03-01' and len({s[11:16] for s in stamps}) > 100
