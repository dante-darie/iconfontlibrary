# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**iconfontlib** — A Node.js utility that packs SVG icons into font files (TTF, WOFF, WOFF2). It parses SVG shapes into geometric primitives, converts them to opentype.js commands, and generates font files.

## Commands

- **Build:** `npm run build` (runs `tsc`)
- **Lint:** `npm run lint` / `npm run lint:fix`
- **Format:** `npm run prettier`
- **Test:** `npm run test` (single run) / `npm run test:watch` (watch mode)
- **Test with coverage:** `npm run test:coverage` (80% threshold on lines, functions, branches, statements)

Pre-commit hook runs lint, prettier, and test automatically.

## Architecture

The pipeline follows this flow: **SVG → geometric shapes → opentype.js commands → glyphs → font file**

### Key Modules

- **`src/lib/svg.ts`** — `Parser` class: the core of the library. Takes an SVG string, uses Cheerio to parse it, and extracts all shapes (path, circle, ellipse, line, polygon, polyline, rect). Normalizes all shapes into three standard types: `Line`, `CubicBezierCurve`, `QuadraticBezierCurve`. Arc curves are approximated to cubic beziers. Exposes `shapes` (raw) and `standardShapes` (normalized).

- **`src/lib/opentype.ts`** — Placeholder for the opentype.js integration layer (currently empty).

- **`src/example/index.ts`** — Working reference implementation showing the full pipeline: parse SVG → build opentype Path → scale/translate glyph to fit font metrics → create Font → write TTF.

- **`src/index.ts`** — Entry point (architectural comments only, excluded from coverage).

### External Dependencies

- **`geometric-library`** — Local sibling package (`file:../geometric-library`). Provides geometric primitives (Point, Line, CubicBezierCurve, QuadraticBezierCurve, ArcCurve, Circle, Ellipse, Polygon) with transformation and conversion methods. Must be available at `../geometric-library`.
- **`opentype.js`** — Font generation library.
- **`cheerio`** — SVG/XML parsing.

## Code Style

- TypeScript strict mode enabled, target ESNext, module CommonJS
- Single quotes, semicolons required, 2-space indentation
- Explicit member accessibility required on class members (constructors excluded)
- Class members ordered alphabetically
- Import cycles disallowed (max depth 1)
- Prettier print width: 240 characters

## CI/CD

GitHub Actions workflow triggers on release creation: build → lint + test → publish to npm with provenance.
