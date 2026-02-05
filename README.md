## TODO

- Refactor commands to use `geometric-library` for calculations.
- Test implementation to check if glyphs are properly computed and sent into the ttf font.
- Implement a normalizing function to rescale glyphs by a factor of `unitsPerEm/height`.
- Implement a normalizing function to center glyphs vertically. Translate the y axis by `(unitsPerEm / 2) - yMin + (height / 2)`.
- Implement a normalizing function to align glyphs left. Translate the x axis by `-xMin`.
