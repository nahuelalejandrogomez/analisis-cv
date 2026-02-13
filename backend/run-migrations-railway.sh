#!/bin/bash

# Script para ejecutar migrations directamente contra Railway DB
# Uso: ./run-migrations-railway.sh

echo "=========================================="
echo "  Railway Migrations Runner"
echo "=========================================="
echo ""

# Solicitar DATABASE_URL
echo "Ve a Railway Dashboard → Backend → Variables"
echo "Copia el valor de DATABASE_URL"
echo ""
read -p "Pega aquí el DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no puede estar vacío"
  exit 1
fi

# Solicitar ADMIN_EMAIL y ADMIN_PASSWORD
read -p "ADMIN_EMAIL [admin@redb.ee]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@redb.ee}

read -sp "ADMIN_PASSWORD: " ADMIN_PASSWORD
echo ""

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ ERROR: ADMIN_PASSWORD no puede estar vacío"
  exit 1
fi

echo ""
echo "🚀 Ejecutando migrations..."
echo ""

# Exportar variables y ejecutar migrations
export DATABASE_URL="$DATABASE_URL"
export ADMIN_EMAIL="$ADMIN_EMAIL"
export ADMIN_PASSWORD="$ADMIN_PASSWORD"
export NODE_ENV="production"

# Ejecutar migrations
node src/migrations/run.js

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✅ Migrations completadas exitosamente!"
  echo "=========================================="
  echo ""
  echo "Ahora prueba el login:"
  echo "  Email: $ADMIN_EMAIL"
  echo "  Password: ******"
  echo ""
else
  echo ""
  echo "❌ Error ejecutando migrations"
  exit 1
fi
