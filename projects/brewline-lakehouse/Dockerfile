# NOT BUILT in the walkthrough that describes this project: it is a sketch of how the pipeline would be packaged.
FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y python3 python3-venv && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN python3 -m venv /venv && /venv/bin/pip install --no-cache-dir -r requirements.txt
COPY lakehouse lakehouse
ENV LAKEHOUSE_HOME=/data
ENTRYPOINT ["/venv/bin/python", "-m", "lakehouse.run"]
