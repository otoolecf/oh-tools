# WASM VIPS challenges

- Needs very strict CORS headers to run the shared ArrayBuffer!
  - Ko-fi button breaks because of this
    - can probably just make a custom button that links out
  - Also, see if cloudflare CDN is an option on free plan, so you can set your own headers for library files
- need to figure out how to host the library files and get the headers there
- image editor sort of working! Not all operations working,but kind of cool. Need to figure out what is up with extended metadata fields.
- want to show metadata of transformed image too
