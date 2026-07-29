#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure zig-cc linker is available (used when gcc is not installed).
# No .cargo/config.toml is committed (it isn't portable across machines), so
# the linker override is exported into the environment here instead — only
# when this shell actually needs it.
if ! command -v cc &>/dev/null && ! command -v gcc &>/dev/null; then
  if [ ! -f /tmp/zig-cc ]; then
    echo "==> No C compiler found. Setting up zig-cc linker..."
    if [ ! -d /tmp/zig-linux-x86_64-0.14.0 ]; then
      curl -fL "https://ziglang.org/download/0.14.0/zig-linux-x86_64-0.14.0.tar.xz" \
        -o /tmp/zig.tar.xz
      tar -xf /tmp/zig.tar.xz -C /tmp
    fi
    cat > /tmp/zig-cc << 'ZIGEOF'
#!/usr/bin/env bash
exec /tmp/zig-linux-x86_64-0.14.0/zig cc -target x86_64-linux-gnu "$@"
ZIGEOF
    chmod +x /tmp/zig-cc
    echo "    zig-cc ready."
  fi
  export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=/tmp/zig-cc
fi

echo "==> Building Rust analyzer..."
cargo build --release

echo "==> Installing server dependencies..."
npm install

echo "==> Installing frontend dependencies..."
cd web
npm install

echo "==> Building frontend..."
npm run build
cd ..

echo ""
echo "==> All done. Starting server..."
echo "    Open: http://localhost:3001"
echo ""
node server.js
