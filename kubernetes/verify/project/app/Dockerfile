FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY load_orders.py worker.py ./
CMD ["python", "load_orders.py", "/data/orders.csv"]
