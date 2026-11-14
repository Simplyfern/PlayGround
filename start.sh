#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd -P)"
PORT="${PORT:-3000}"
export PORT

timed() { /usr/bin/time -p "$@"; }

timed test -d "$PROJECT_DIR"
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    timed npm ci --no-audit --no-fund
  else
    timed npm install --no-audit --no-fund
  fi
  if node -e 'process.exit(require("./package.json").scripts?.build ? 0 : 1)'; then
    timed npm run build
  fi

  BUILD_DIR=""
  for candidate in dist build out; do
    if [[ -f "$PROJECT_DIR/$candidate/index.html" ]]; then
      BUILD_DIR="$PROJECT_DIR/$candidate"
      break
    fi
  done
  if [[ -z "$BUILD_DIR" && -f "$PROJECT_DIR/index.html" ]]; then
    BUILD_DIR="$PROJECT_DIR"
  fi
  if [[ -z "$BUILD_DIR" ]]; then
    echo 'Build completed, but no supported static output containing index.html was found.' >&2
    exit 1
  fi
elif [[ -f index.html ]]; then
  BUILD_DIR="$PROJECT_DIR"
else
  # This checkout contains no game source. Provide a visible, self-contained
  # deployment diagnostic so the preview remains testable until source is added.
  BUILD_DIR="$PROJECT_DIR/dist"
  timed mkdir -p "$BUILD_DIR"
  timed node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10131c"><title>PlayGround · Preview</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#10131c;color:#f5f7ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 35%,#28334f 0,#171c2a 42%,#10131c 78%)}main{width:min(720px,100%);padding:clamp(28px,7vw,64px);border:1px solid #ffffff20;border-radius:28px;background:#171c2be8;box-shadow:0 28px 90px #0008} .tag{display:inline-flex;align-items:center;gap:9px;color:#a8f0cf;font-size:12px;font-weight:750;letter-spacing:.13em;text-transform:uppercase}.dot{width:8px;height:8px;border-radius:50%;background:#65e8ad;box-shadow:0 0 16px #65e8ad}h1{font-size:clamp(38px,8vw,68px);letter-spacing:-.055em;line-height:.98;margin:24px 0 18px}p{color:#bac2d5;font-size:clamp(15px,2.4vw,18px);line-height:1.65;margin:0;max-width:560px}.rule{height:1px;background:#ffffff1a;margin:32px 0 22px}.foot{font-size:13px;color:#828da5}.mark{color:#9eafff}
</style></head><body><main><div class="tag"><span class="dot"></span> Preview server ready</div><h1>PlayGround<br><span class="mark">is standing by.</span></h1><p>The web preview is running, but this checkout does not include the game source yet. Add the project files and this server will build and publish them from the project directory.</p><div class="rule"></div><div class="foot">Static preview · Port ${process.env.PORT || 3000}</div></main></body></html>`)' "$BUILD_DIR/index.html"
fi

BUILD_DIR="$(cd "$BUILD_DIR" && pwd -P)"
case "$BUILD_DIR/" in
  "$PROJECT_DIR/"*) ;;
  *) echo 'Static build output must remain inside PROJECT_DIR.' >&2; exit 1 ;;
esac

RUNNER_TEMP="${RUNNER_TEMP:-/home/runner/work/_temp}"
METADATA_DIR="$RUNNER_TEMP/omgithub-web"
timed mkdir -p "$METADATA_DIR"
timed node -e 'const fs=require("node:fs"); fs.writeFileSync(process.argv[1], JSON.stringify({project:process.argv[2],directory:process.argv[3]}))' "$METADATA_DIR/deployment-output.json" "$PROJECT_DIR" "$BUILD_DIR"
export SERVE_DIR="$BUILD_DIR"

timed node -e '
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(process.env.SERVE_DIR), mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon",".wasm":"application/wasm",".glb":"model/gltf-binary"};
http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname)}catch{res.writeHead(400).end("Bad request");return}let file=path.resolve(root,"."+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end("Forbidden");return}try{if(fs.statSync(file).isDirectory())file=path.join(file,"index.html")}catch{if(!path.extname(file))file=path.join(root,"index.html")}try{const stat=fs.statSync(file);if(!stat.isFile())throw Error();res.writeHead(200,{"Content-Type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","Content-Length":stat.size,"Cache-Control":"no-cache"});fs.createReadStream(file).pipe(res)}catch{res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"}).end("Not found")}}).listen(Number(process.env.PORT||3000),"0.0.0.0",()=>console.log(`Serving ${root} on port ${process.env.PORT||3000}`));
'