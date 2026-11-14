"""Point a Tableau data source file at another server, without opening Tableau. Uses the Tableau Document API."""
from tableaudocumentapi import Datasource


def switch(src, dst, server, dbname):
    ds = Datasource.from_file(src)
    for con in ds.connections:
        con.server = server
        con.dbname = dbname
    ds.save_as(dst)
    return [(c.dbclass, c.server, c.dbname, c.username) for c in ds.connections]
