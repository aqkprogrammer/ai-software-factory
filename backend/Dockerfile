# Run the agent loop in here, not on your laptop. run_command executes whatever
# the model decides to run, and that is exactly what you want it to do — inside
# a container with no credentials and no access to your host.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN useradd -m agent && chown -R agent:agent /app
USER agent

ENTRYPOINT ["python", "run.py"]
