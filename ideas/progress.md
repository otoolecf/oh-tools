# WASM VIPS challenges

- Needs very strict CORS headers to run the shared ArrayBuffer!
  - Ko-fi button breaks because of this
    - can probably just make a custom button that links out
  - Also, see if cloudflare CDN is an option on free plan, so you can set your own headers for library files
- need to figure out how to host the library files and get the headers there
- need to arrange image layout: options on left side instead of bottom (unless mobile?)
- figure out full metadata
  - in image.h: GType get_typeof(const std::string &field)
  - and more details from c: https://www.libvips.org/API/8.17/libvips-header.html
- add stitching/stacking from 2 (or more)
- make text images
- should outline getting libvips working, like metadata, in a blog! It is hard
  Iptc-Data: [702 bytes]
  Xmp-Data: [31249 bytes]

# Image Editor Progress

## Working Features

- Basic operations: resize, crop, rotate, flip
- Classic filters: sepia, vintage, warm, cool, high contrast
- Tint with LAB colorspace (proper implementation)
- File format conversion (JPEG, PNG, WebP)
- Metadata display and export

## Additional Classic Filters to Implement

### Dramatic Filter

```javascript
// High contrast with slightly desaturated colors
const matrix = [
  [1.2, -0.1, -0.1],
  [-0.1, 1.2, -0.1],
  [-0.1, -0.1, 1.2],
];
return image.recomb(matrix).cast("uchar").linear([1.1], [-10]);
```

### Faded Film Filter

```javascript
// Low contrast, lifted blacks for vintage film look
const matrix = [
  [0.8, 0.1, 0.1],
  [0.1, 0.8, 0.1],
  [0.1, 0.1, 0.8],
];
return image.recomb(matrix).cast("uchar").linear([0.9], [25]);
```

### Cross Process Filter

```javascript
// Exaggerated colors with shifted tones (film cross-processing)
const matrix = [
  [1.4, -0.2, 0.0],
  [-0.1, 1.2, -0.3],
  [0.0, -0.4, 1.6],
];
return image.recomb(matrix).cast("uchar");
```

### B&W High Contrast Filter

```javascript
// Convert to black & white with boosted contrast
const matrix = [
  [0.4, 0.4, 0.2],
  [0.4, 0.4, 0.2],
  [0.4, 0.4, 0.2],
];
return image.recomb(matrix).cast("uchar").linear([1.3], [-20]);
```

### Vibrant Filter

```javascript
// Boosted saturation for vivid colors
const matrix = [
  [1.3, -0.15, -0.15],
  [-0.15, 1.3, -0.15],
  [-0.15, -0.15, 1.3],
];
return image.recomb(matrix).cast("uchar");
```

### Muted Tones Filter

```javascript
// Reduced saturation with soft, subdued colors
const matrix = [
  [0.7, 0.2, 0.1],
  [0.1, 0.7, 0.2],
  [0.2, 0.1, 0.7],
];
return image.recomb(matrix).cast("uchar").linear([0.95], [5]);
```

## Implementation Notes

All filters use VIPS `recomb()` method with 3x3 color transformation matrices:

- Each row represents output channels (R, G, B)
- Each column represents input channels (R, G, B)
- Values determine how much of each input contributes to each output
- `linear([multiplier], [offset])` adjusts brightness/contrast
- `cast('uchar')` ensures proper 8-bit output format

## Potential Issues

- Some filters may need debugging for event listener binding
- Matrix values might need fine-tuning for better results
- Consider adding intensity sliders for user control
