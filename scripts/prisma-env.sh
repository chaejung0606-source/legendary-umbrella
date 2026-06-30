# Source this before running prisma commands in this sandbox.
# Points Prisma at locally-cached engine binaries so it never hits its
# (proxy-flaky) network downloader. Harmless to source in normal environments
# where these files exist; in a fresh environment Prisma downloads as usual.
export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
_ENG="$(pwd)/node_modules/@prisma/engines"
_PLAT=debian-openssl-3.0.x
if [ -f "$_ENG/libquery_engine-$_PLAT.so.node" ]; then
  export PRISMA_QUERY_ENGINE_LIBRARY="$_ENG/libquery_engine-$_PLAT.so.node"
fi
if [ -f "$_ENG/schema-engine-$_PLAT" ]; then
  export PRISMA_SCHEMA_ENGINE_BINARY="$_ENG/schema-engine-$_PLAT"
fi
export PRISMA_CLI_QUERY_ENGINE_TYPE=library
export PRISMA_CLIENT_ENGINE_TYPE=library
