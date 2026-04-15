FROM node:18-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ default-jdk-headless \
  && rm -rf /var/lib/apt/lists/*

RUN JVM_LIB_PATH="$(find /usr/lib/jvm -name libjvm.so | head -n 1)" \
  && test -n "${JVM_LIB_PATH}" \
  && ln -sf "${JVM_LIB_PATH}" /usr/lib/libjvm.so

ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV LIBRARY_PATH=/usr/lib:${LIBRARY_PATH}
ENV LD_LIBRARY_PATH=/usr/lib:${LD_LIBRARY_PATH}

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

FROM node:18-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends default-jre-headless \
  && rm -rf /var/lib/apt/lists/*

RUN JVM_LIB_PATH="$(find /usr/lib/jvm -name libjvm.so | head -n 1)" \
  && test -n "${JVM_LIB_PATH}" \
  && ln -sf "${JVM_LIB_PATH}" /usr/lib/libjvm.so

ENV NODE_ENV=production
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"
ENV LIBRARY_PATH=/usr/lib:${LIBRARY_PATH}
ENV LD_LIBRARY_PATH=/usr/lib:${LD_LIBRARY_PATH}
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY wait-for-it.sh ./wait-for-it.sh
RUN chmod +x ./wait-for-it.sh

EXPOSE 3001
CMD ["./wait-for-it.sh", "db", "5432", "node", "dist/index.js"]
