# Dependency review

The initial scaffold was upgraded to Expo 57.0.29 and its bundled compatible React/React Native packages. Next.js is 16.4.1. The npm lockfile fixes the installed dependency graph and installation preserves registry integrity checks.

`npm audit --omit=dev` still reports 28 affected packages (18 high, 10 moderate, no critical) in this graph. These counts include packages affected transitively, not 28 distinct advisories. The underlying advisories reported are:

- `braces` <= 3.0.3: deeply nested pattern denial of service (GHSA-vfj7-8cjw-p6xm).
- `node-forge` <= 1.4.0: RSA signature verification issue (GHSA-86w9-cpqp-85rv).
- `decode-uri-component` <= 0.4.2: malformed URI decoding denial of service (GHSA-vcc3-ghjq-m6fr).
- `uuid` < 11.1.1: buffer bounds validation issue (GHSA-w5hq-g745-h8pq).

The current registry versions checked for braces (3.0.3) and node-forge (1.4.0) remain affected. Several affected dependency paths are Expo/native build tooling, but runtime exposure has not been comprehensively assessed; the audit findings are not dismissed as development-only. Do not force incompatible major transitive overrides or accept npm's proposed Expo downgrade just to remove warnings.

This is a local development prototype. Before production release, update supported upstream dependencies as patches become available, review the runtime bundle and build/signing exposure, and rerun the audit and functional checks. There is no claim of a clean security audit.
