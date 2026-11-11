"""An MCP server for the Brewline data. The lessons show this file. It runs over stdio: a client starts it as a child process."""
from typing import Literal

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

app = MCPServer('brewline-data', instructions='Read Brewline policies and order counts. Writes need a person to approve them.')

POLICIES = {
    'refund window': 'A customer may return an unused drink voucher or a sealed bag of beans within 14 days of purchase with a receipt.',
    'refund approval': 'A refund above EUR 50 needs a second manager to approve it in the till.',
    'milk storage': 'Milk must be stored at 5 degrees Celsius or lower, and the fridge temperature is logged at open and close.',
}
COUNTS = {'COMPLETED': 120, 'CANCELLED': 40, 'PENDING': 40}


@app.tool(annotations=ToolAnnotations(readOnlyHint=True))
def search_policies(query: str, limit: int = 3) -> list[str]:
    """Find the Brewline policy sentences that match the words of a question. Returns at most `limit` sentences."""
    words = set(query.lower().split())
    hits = [s for k, s in POLICIES.items() if words & set(k.split()) or words & set(s.lower().split())]
    return hits[:limit]


@app.tool(annotations=ToolAnnotations(readOnlyHint=True))
def orders_by_status(status: Literal['COMPLETED', 'CANCELLED', 'PENDING']) -> dict:
    """Count the orders that have a status."""
    return {'status': status, 'orders': COUNTS[status]}


@app.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=False))
def issue_refund(order_id: str, amount: float) -> str:
    """Refund an order. This writes to the till system, so a person must approve it before the call."""
    if amount <= 0:
        raise ValueError('the amount must be positive')
    return 'refunded %.2f on %s' % (amount, order_id)


@app.resource('brewline://schema/orders', mime_type='text/plain')
def orders_schema() -> str:
    """The columns of the orders table."""
    return 'orders(order_id int, store_id int, status text, total_eur decimal, placed_at date)'


@app.prompt()
def triage_order(order_id: str) -> str:
    """A starting prompt for a question about one order."""
    return 'Look at order %s. Say its status, and say whether a refund is allowed by the policy. Do not issue a refund yourself.' % order_id


if __name__ == '__main__':
    app.run('stdio')
