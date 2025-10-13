#!/bin/bash

# Start local Solana test validator with required Metaplex programs
# Usage: ./start-validator.sh

PROGRAM_DIR="/Users/ruansilva/Documents/facul/tcc/test-programs"

echo "Starting Solana test validator with Metaplex Core programs..."

solana-test-validator -r \
  --bpf-program CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d "$PROGRAM_DIR/mpl-core.so" \
  --bpf-program CMACYFENjoBMHzapRXyo1JZkVS6EtaDDzkjMrmQLvr4J "$PROGRAM_DIR/mpl-core-candy-machine.so" \
  --bpf-program CMAGAKJ67e9hRZgfC5SFTbZH8MgEmtqazKXjmkaJjWTJ "$PROGRAM_DIR/mpl-core-candy-guard.so"