"""A notebook is a set of cells that share one namespace. The order that you press Run in is part of the program."""
cells = {
    1: "total = 0",
    2: "total = total + 12.50  # add the first order",
    3: "total = total * 1.09   # add 9 percent tax",
}

def run(order):
    ns = {}
    for n in order:
        exec(cells[n], ns)
    return round(ns["total"], 2)

print("top to bottom (1, 2, 3):         ", run([1, 2, 3]))
print("cell 2 pressed twice (1, 2, 2, 3):", run([1, 2, 2, 3]))
print("tax before the order (1, 3, 2):  ", run([1, 3, 2]))
