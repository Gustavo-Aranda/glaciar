#!/bin/sh
set -e

BASE_MODEL="${OLLAMA_BASE_MODEL:-llama3.2}"
CUSTOM_MODEL="${OLLAMA_MODEL:-glaciar-assistant}"
MODELFILE_PATH="${OLLAMA_MODELFILE_PATH:-/ollama-init/Modelfile}"

echo "[Glaciar Ollama] Iniciando servidor Ollama em background..."
/bin/ollama serve &
OLLAMA_PID=$!

# Repassa SIGTERM/SIGINT (docker stop / Ctrl+C) ao `ollama serve` para um desligamento limpo,
# em vez de esperar os 10s de timeout do Docker e ser finalizado com SIGKILL.
encerrar() {
  echo "[Glaciar Ollama] Encerrando servidor Ollama..."
  kill -TERM "$OLLAMA_PID" 2>/dev/null || true
  wait "$OLLAMA_PID" 2>/dev/null || true
  exit 0
}
trap encerrar TERM INT

echo "[Glaciar Ollama] Aguardando disponibilidade da API local do Ollama..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done

if ! ollama list | grep -q "${BASE_MODEL}"; then
  echo "[Glaciar Ollama] Baixando modelo base '${BASE_MODEL}'..."
  ollama pull "${BASE_MODEL}"
else
  echo "[Glaciar Ollama] Modelo base '${BASE_MODEL}' já presente no volume persistente."
fi

echo "[Glaciar Ollama] Criando/atualizando modelo customizado '${CUSTOM_MODEL}' a partir de ${MODELFILE_PATH}..."
ollama create "${CUSTOM_MODEL}" -f "${MODELFILE_PATH}"
echo "[Glaciar Ollama] Modelo '${CUSTOM_MODEL}' pronto para inferência!"

wait "$OLLAMA_PID"
