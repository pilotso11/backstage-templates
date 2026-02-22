# Backend Makefile (FastAPI)
VENV   := .venv
PY     := $(VENV)/bin/python
PIP    := $(VENV)/bin/pip

.PHONY: install build test lint run clean

install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt

build: install

test:
	$(VENV)/bin/pytest --cov=app --cov=. --cov-report=xml --cov-report=term-missing

lint:
	$(VENV)/bin/ruff check .
	$(VENV)/bin/ruff format --check .
	$(VENV)/bin/mypy .

run:
	$(VENV)/bin/uvicorn main:app --reload --port 8000

clean:
	rm -rf $(VENV) .coverage coverage.xml __pycache__ .mypy_cache .ruff_cache
	find . -name "__pycache__" -type d -exec rm -rf {} +
