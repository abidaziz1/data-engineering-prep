PYTHON ?= .venv/bin/python
export CDC_HOME ?= $(CURDIR)/cdc_data

setup:
	python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

test:
	$(PYTHON) -m pytest -q tests

# the services of the pipeline on this machine (needs KAFKA_HOME and DEBEZIUM_PLUGINS, see README)
stack:
	$(PYTHON) -m stack.local

# read the new messages into bronze, apply them to silver, and check silver against Postgres
run:
	$(PYTHON) -m cdc.run

clean:
	rm -rf cdc_data
