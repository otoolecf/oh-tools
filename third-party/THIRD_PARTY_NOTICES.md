# Third-party notices and corresponding source

Oh! Tools' original code is licensed under ISC. Included libraries, fonts,
icons, and compiled codecs retain their own copyright notices and licenses.
No term in the project license restricts replacing these libraries or reverse
engineering them to debug a modified version. Ko-fi's mark remains Ko-fi's.

The site's `/licenses/` page is the public source-download index. It hosts the
source archives and patches alongside the compiled assets, including the exact
npm source archives for these components:

| Component | Shipped version | License | Source |
| --- | --- | --- | --- |
| wasm-vips JavaScript/C++ bindings | 0.0.19 | MIT | `/licenses/sources/wasm-vips-0.0.19-source.tar.gz` |
| heic-to | 1.6.7 | LGPL-3.0 | `/licenses/sources/heic-to-1.6.7-source.tgz` |
| libheif in heic-to | 1.23.7 | LGPL-3.0-or-later | `/licenses/sources/libheif-1.23.7.tar.gz` |
| libde265 in heic-to | 1.0.15 | LGPL-3.0-or-later | `/licenses/sources/libde265-1.0.15.tar.gz` |
| ExifReader | 4.52.0 | MPL-2.0 | `/licenses/sources/exifreader-4.52.0-source.tgz` |
| Mediabunny | 1.63.0 | MPL-2.0 | `/licenses/sources/mediabunny-1.63.0-source.tgz` |

The ExifReader, Mediabunny, and heic-to sources are provided under their own
licenses in those archives. Their package license texts are also available at
`/licenses/exifreader/LICENSE`, `/licenses/mediabunny/LICENSE`, and
`/licenses/heic-to/LICENSE`. No upstream library source is modified by this
application; Vite bundles/minifies JavaScript during the site build.

VIPS's compiled libraries include LGPL components (glib 2.90.0, libexif 0.6.26,
libheif 1.23.5, and libvips 8.18.7), used under LGPLv3 through the
upstream later-version provisions. Full upstream notices are at
`/licenses/wasm-vips/THIRD-PARTY-NOTICES.md`. The GNU LGPLv3 and GPLv3 license
texts accompany this distribution at `/licenses/LGPL-3.0.txt` and
`/licenses/GPL-3.0.txt`. The source index includes the native libraries, their
build dependencies and the upstream Emscripten patches; it is not limited to
the JavaScript wrappers. The manifest records versioned download URLs, sizes,
and SHA-256 checksums. Source archives larger than the hosting file limit are
split into numbered parts; concatenate all parts in order and verify the
complete archive's hash before extracting it.

## Rebuilding or replacing libraries

Keep source downloads available for as long as the matching compiled assets
are distributed. Changing a dependency requires updating the source manifest
and this notice; the build checks the named package versions and hashes and
fails rather than publishing changed or unavailable source material.

To rebuild VIPS, download the archives from `/licenses/sources/manifest.json`,
join any split archive, and verify its SHA-256. Extract the wasm-vips source
archive. Use Emscripten 6.0.10 and the compiler/build tools documented in its
`build/README.md` (CMake, Meson/Ninja, autotools, Python and Rust). The supplied
`/licenses/sources/rebuild-vips.sh` is upstream's v0.0.19 build recipe with its
native source/patch download commands replaced by local file reads. Run it
from the extracted wasm-vips project directory with `OH_SOURCE_DIR` set to the
absolute directory containing the verified archives and patches. Other build
flags and generated binding steps remain upstream's. Rust/compiler toolchain
packages may require their normal package registries. Copy the resulting
`lib/vips.js`, `lib/vips.wasm`, `lib/vips-heif.wasm`, `lib/vips-jxl.wasm` and `lib/vips-resvg.wasm`
into `node_modules/wasm-vips/lib/` in your local app checkout, then rebuild the
app. This permits using an interface-compatible modified library without
changing the project's license. A native rebuild need not be byte-identical
to the original binaries to be replaceable.

For HEIC, extract the heic-to and libheif 1.23.7 sources and follow the supplied
README/build-emscripten.sh. The release uses libde265 1.0.15; its source is
included. Build the JavaScript decoder with `USE_WASM=0`, replace the module
in heic-to's `src/lib/`, then run the package's build step. Point the root npm
dependency at your local rebuilt package and rebuild the app. Preserve the
GNU license texts and source material when distributing your rebuild.

For ExifReader/Mediabunny, extract their source package, make your changes, and
follow the package's own build instructions. Use the local package in the root
npm dependency and run the app build. The MPL-covered files and any changes
to them remain available under MPL-2.0, independently of the application's ISC
code. All original notices must be retained.

## Retained historical vendor files

The preserved Git history includes heic-to 1.2.1 and wasm-vips 0.0.14 vendor
artifacts. Their matching native sources and patches remain in the source
index, along with the original `/licenses/sources/rebuild-vips-0.0.14.sh`
recipe (Emscripten 4.0.10). The source index also includes heic-to 1.2.1's complete source npm
archive. Its README release table identifies libheif 1.20.1; the corresponding
libheif and libde265 1.0.15 source archives are included above. The previous Mediabunny 1.32.0 MPL source package also remains available.
The same applicable license texts and upstream copyright notices apply to
those historical files.

## Other components

The build copies available license/notice files from every installed runtime
package into `/licenses/<package>/`. This includes DuckDB-WASM (MIT), noble
hashes (MIT), jsdiff (BSD-3-Clause), bwip-js (MIT plus bundled notices), PassHelp
(MIT), JSON5 (MIT), and jsonrepair (ISC). Version-pinned DuckDB engine assets
and optional extensions may download from their providers, as documented on
About; those components retain their own upstream licenses. Inter uses the
SIL Open Font License, and the Lucide-derived wrench uses ISC; their texts are
at `/licenses/brand/`.

The root repository retains its original ISC copyright notice. Funding links
are optional and may be replaced or removed in forks.
