#!/bin/sh
# The nightly check: the tax rate must be a plausible rate (at most 0.25).
rate=$(cat loader/tax_rate.txt)
if awk "BEGIN { exit !($rate > 0.25) }"; then
  echo "check failed: tax rate $rate is not plausible"
  exit 1
fi
echo "check passed: tax rate $rate"
