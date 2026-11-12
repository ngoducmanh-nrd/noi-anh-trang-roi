FROM node:24-bookworm-slim AS app

WORKDIR /workspace/app
COPY app/package.json app/package-lock.json ./
RUN npm ci

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:24-trixie-slim AS emulator

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY tests ./tests
COPY docker/firebase.json ./firebase.json

EXPOSE 9000 9099
CMD ["npx", "firebase", "emulators:start", "--only", "auth,database", "--project", "demo-inlove-owned"]
