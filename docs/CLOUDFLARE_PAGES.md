# Cloudflare Pages (`next-on-pages`)

## `nodejs_compat` (required)

Next.js on Workers uses Node built-ins (`node:buffer`, `node:async_hooks`, …). You **must** enable **`nodejs_compat`**.

### Option A — Dashboard (fastest)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → your project  
2. **Settings** → **Runtime** (or **Functions**) → **Compatibility flags**  
3. Add the flag named exactly **`nodejs_compat`** for **Production** and **Preview**.  
   - Searching for `node` often lists *other* flags (`enable_nodejs_process_v2`, etc.). Those are **not** a substitute — pick **`nodejs_compat`** from the list (or type it fully).  
4. **Save**, then **Deployments** → **Retry deployment** (or push a new commit)

### Option B — From code (`wrangler.toml`, recommended)

The repo root **`wrangler.toml`** sets **`nodejs_compat`** so you do not need to add flags in the dashboard:

```toml
compatibility_flags = ["nodejs_compat"]
```

1. Commit and push **`wrangler.toml`**.
2. Pages must use the **[V2 build system](https://developers.cloudflare.com/pages/configuration/build-image/#v2-build-system)** so the Wrangler file is applied.
3. **`name`** must match your **Pages project name** exactly. If deploy fails, run `npx wrangler pages download config` and align `name` / paths.
4. **`pages_build_output_dir`** is `.vercel/output/static` (output of `npx @cloudflare/next-on-pages`).

Build command (example):

```bash
npx @cloudflare/next-on-pages@1
```

## References

- [Compatibility flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/)
- [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
