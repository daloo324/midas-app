#!/bin/sh
# Supabase's arm64 storage image crashes on start on this Mac (node exits with
# 139, a segfault, even for `node --version`). This swaps in the Intel build,
# which runs under emulation. Local development only; run it if
# `supabase start` says the storage container is unhealthy.
set -e
version=$(cat supabase/.temp/storage-version 2>/dev/null || echo v1.80.2)
image="public.ecr.aws/supabase/storage-api:$version"
echo "FROM --platform=linux/amd64 $image" | docker build -q --platform linux/amd64 -t "$image" -
echo "Using the Intel build of $image. Run supabase start again."
