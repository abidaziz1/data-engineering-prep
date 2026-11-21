PYTHON ?= .venv/bin/python
export LAKEHOUSE_HOME ?= $(CURDIR)/lakehouse_data

setup:
	python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

test:
	$(PYTHON) -m pytest -q tests

# one run for one day of the pretend source: land the files, bronze, silver, gold, and the quality gate
day-%:
	$(PYTHON) -m lakehouse.run --day $*

clean:
	rm -rf lakehouse_data
