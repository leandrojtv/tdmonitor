#!/bin/sh
set -e

host="$1"
port="$2"
shift 2

until nc -z "$host" "$port"; do
  echo "Aguardando $host:$port..."
  sleep 1
done

echo "$host:$port disponível. Iniciando aplicação..."
exec "$@"
