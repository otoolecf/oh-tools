# Open-source audit fixes — October 31, 2026

The source/history audit identified unsafe rendering, persistent SQL credentials,
a vulnerable metadata parser, incomplete source notices, and misleading notes.
These fixes apply to the maintained release tree; old deployments require their
own deployment/cutover.

## Implemented

- Escape untrusted HTML text and attributes in CSV headers/values, filenames,
  schema/stats/export previews, image metadata, video metadata, peer messages,
  HMAC output, and parser errors. Data-bearing inline handlers are replaced by
  closures or listeners; metadata links permit HTTP(S), and peer previews permit
  raster formats. Selected files still stay in the browser.
- Quote generated SQL identifiers/literals, preserving filenames and columns
  containing quotes. SQL itself remains an intentional power-user capability.
- Keep query history in memory and exclude values, comments, URLs and
  credential-related statements. Delete the old persisted history key and offer
  Clear History. Remove runtime payload/debug logs.
- Update ExifReader to 4.52.0, jsdiff to 8.0.4, and heic-to to 1.6.7. Replace the
  unmaintained CryptoJS dependency with existing noble legacy digest functions;
  Web Crypto continues to handle SHA/HMAC. npm audit reports zero advisories.
- Require rate limiting, bounded typed records, and SQLite Durable Objects for
  atomic signaling creation/consumption. Retain a payload-free code reservation
  until expiry. Base64 signaling is still explicitly disclosed as readable by
  the service; this change does not claim encrypted rendezvous.
- Publish GNU license texts, package notices, exact source archives, SHA-256
  manifests and rebuild/replacement instructions at `/licenses/`. Native source
  and patches accompany the compiled libraries. Builds fail on version/hash
  mismatch. Large archives are split to respect the static-asset file limit.
- Archive the old design proposals with explicit historical labels, document
  current architecture, and remove dated Search Console operational observations.
- Add redacted full-history secret scanning, dependency advisory checks and
  weekly npm/Actions update proposals to CI. The Ko-fi link remains optional
  and uses a local icon plus explicit opener/referrer protection.

## Validation

All 36 local Playwright tests passed. The new coverage exercises hostile CSV
headers/filenames/copy values, image metadata and link attributes, received peer
file/text controls, hash output, diff errors, SQL history removal, rate-limiter
failure, record limits, concurrent creation/retrieval, expiration and code reuse.
Independent digest/HMAC vectors verify the CryptoJS replacement.

Production and staging build checks verify license files, reconstructed source
archive hashes, static metadata and deployment-file boundaries. Staged-source
Gitleaks scanning and npm audit are clean. The source archive cache is ignored
and is not committed.

On remote staging, the frontend security tests, HEIC import, complete image-edit
sequence, JSON/Parquet/Excel round trips, shared navigation, noindex headers and
license downloads passed. The site and signaling service deploy separately.
Production has not been changed by this work.

## History and publication

An isolated full-history mirror replaces the owner's Gmail author/committer
metadata with the verified GitHub no-reply identity. For all 70 original
commits, verification checks identical file trees, messages and author names;
rewritten commits necessarily have different IDs. The original private mirror
is kept for recovery. New work uses the no-reply identity too.

GitHub can retain original commits in read-only PR references. A clean mirror
can therefore be used for a new repository while preserving the complete
sanitized history; simply force-pushing branches does not establish removal
from an existing repository's PR references/caches. Publishing or changing the
production/default branch is a separate final step, after reviewing the chosen
publication target and verifying hosted CI/repository protection settings.
