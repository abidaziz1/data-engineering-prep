import os, sys
from decimal import *


def load(rows, seen=[]):
    for r in rows:
        if r == None:
            continue
        try:
            seen.append(int(r))
        except:
            pass
    return seen
