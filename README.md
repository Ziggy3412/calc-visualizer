# Calc Visualizer

An interactive calculus workspace for exploring functions, derivatives,
integrals, series, differential equations, and 3D solids.

## Using the workspace

The app opens directly into a graph. Choose another visualizer from **Tools**. Each tool opens in its
own tab, and expressions and controls stay intact when switching tabs. Use
**Tools** to open another tool, or **+** for a new graph tab.
Double-click a tab name to rename it. **⌘T** opens a tab and **⌘W** closes the
current one (Ctrl on Windows/Linux); **⌘Q** quits the desktop app.
**Ctrl+Tab** moves to the next tab and **Ctrl+Shift+Tab** to the previous tab,
wrapping at either end. Click outside Study, Tools, Settings, or the expanded
Taylor polynomial to dismiss its popup; Escape also closes dialogs.

The expression panel can be hidden to make more room for the graph. Drag its
right edge to resize it, or focus the divider and use the arrow keys. Enter
expressions using the math keyboard or ordinary keys; incomplete expressions
show a message beside the input. Each Graph expression has a trash button;
Backspace or Delete removes an empty expression row. Focus a row outside its
formula and press Delete to remove the whole expression. Drag the graph to pan and use its zoom buttons
to zoom or reset. New expressions and interval bounds automatically
fit the visible curves; 2D views scale each axis independently. Automatic framing also covers implicit circles/ellipses, finite integration regions, polar curves, proof
plots, and 3D solids. Zoom out and pan to explore farther than the initial window;
unbounded functions are shown over a finite interval. Sliders also have numeric fields for entering precise values.

Every 3D visualizer has **2D / 3D** buttons. The 2D revolution view shows the
source curves, bounds, region, slice positions, and dashed rotation axis;
surface-area mode shows the source curve. Both dimensions share the same inputs.

## Implicit equations in every tool

Enter equations such as `x^2 + y^2 = 25` directly in any math input. In calculation
views, choose the upper or lower branch when the equation has two real roots.
Solids also supports solving for x using **x = g(y)**. Derivatives, Taylor,
Riemann sums, cross sections, and integration by parts use the selected branch;
choose bounds and a Taylor center inside its real domain. Polar converts
Cartesian equations using x = r cos(θ), y = r sin(θ). Slope Fields uses
−Fₓ/Fᵧ for a relation F(x,y) = 0.

Calculation inputs solve equations linear or quadratic in the dependent
variable, plus pure higher powers such as `y^3 = x`. More complex relations
show a message asking for an explicit branch; Graph can display general
implicit contours without choosing a branch. `x^2 + y^2 = 0` is a single point,
so it does not provide a differentiable branch over an interval.

## Study

The **Study** button contains **Practice**, **Theorems & Rules**, and **Proofs**.
The **Tools** button contains the calculus visualizers.

### Practice

Each of the 111 topic sections has 10 original multiple-choice questions, for
1,110 total (810 in AB; BC includes all 1,110). Choose questions 1–10 within a
topic, or use Previous/Next question. Each question includes a worked solution;
the sidebar shows how many answers are correct in each topic. Answers are
saved per question on this device, including progress from the original bank.
Challenge problems remain a separate set of 20 free-response problems.

### Proofs

**Study → Proofs** contains 14 general proofs, including IVT, EVT, Squeeze,
Fermat, Rolle, MVT, monotonicity, both FTC parts, integral MVT, integration by
parts, geometric series, p-series, and absolute convergence. Search or filter
by topic; read the full argument or reveal one step at a time. Each proof
links back to its theorem, and supported theorem entries link to their proof.
All 14 proofs include interactive visuals: secants, subtracting the MVT secant,
accumulated areas, rectangle decomposition, series terms, integral comparison,
and tail bounds.

### Theorems & rules

Open **Study → Theorems & Rules** for 47 searchable entries covering core
single-variable calculus and selected extensions. Filter by topic or choose
**AB essentials / AB + BC**. Every entry includes sufficient hypotheses, the
conclusion, rendered formulas, a worked example, common pitfalls, and related
ideas. The BC view also includes further-study results such as Cauchy’s MVT,
the root test, and monotone sequence convergence.

Seven interactive illustrations cover IVT, EVT, the Squeeze Theorem, MVT,
Rolle’s theorem, FTC Part 1, and the integral mean-value theorem. Controls show
actual target heights, bounds, or window radii. IVT, EVT, MVT, and Rolle also
include examples showing why their hypotheses matter. These use analytic
examples rather than numerical sampling to certify conditions. Relevant
practice questions have a **Read theorem & conditions** link that opens the
corresponding entry in its own tab.

## Visualizers

- **Limits**: approach a target from both sides, plot multiple expressions,
  inspect approach tables, and explore removable discontinuities.
- **Implicit Differentiation**: follow the chain and product rules, isolate dy/dx,
  and inspect ordinary, vertical, or singular tangents at a point.
- **Related Rates**: work through ladder, circle, balloon, and custom problems,
  differentiating with respect to time before substituting values and units.
- **Riemann Sums**: left, right, midpoint, and trapezoidal approximations.
- **Position, Velocity & Acceleration**: compare derivatives, tangent lines,
  concavity, inflection points, and critical points.
- **Polar Integration**: draw a polar curve and sweep its continuous area.
- **Volume by Cross Section**: build solids between top and bottom boundaries,
  including negative curves. For an implicit circle or ellipse, **Use both
  branches** fills both boundaries and fits the full bounded region. The base
  width is the distance between the curves for every cross-section shape.
- **Solids & Surface Area of Revolution**: explore disks, washers, shells,
  and surfaces with shaded 3D lighting and glass/solid/wireframe views.
- **Taylor / Maclaurin**: zoom at the mouse pointer, use gentle center-anchored
  zoom buttons, or choose **Near center / Fit both curves**. Taylor has no auto-fit: typing, changing degree, and changing the expansion
  point preserve your manual viewport. Near-center fits center both axes on the
  expansion point. Approximate a function or selected implicit branch
  through degree 50. Direct power-series arithmetic keeps high-degree roots
  fast; unsupported operations use a cancellable symbolic worker.
- **Slope Fields**: inspect directions and click to trace solution curves.
- **Integration by Parts**: explore the geometric rectangle-subtraction proof.

**Infinite slices (n → ∞)** is available only in Riemann sums, cross sections,
and solids/surface-area views that have finite slice or ring controls. It shows
a continuous fill or mesh rather than attempting to draw infinitely many
objects. Unchecking restores the finite count. Numerical integration is used
for displayed integral values; it is not symbolic proof of convergence.

## Development

- `npm run dev`: local web preview.
- `npm run lint`: ESLint checks.
- `npm test`: numerical, content, and theorem regression checks.
- `npm run build`: production web bundle; graph engines load on demand.
- `npm run electron:preview`: build and open the desktop shell.
- `npm run build:mac`: package a macOS application and disk image.

Built with React, MathLive, math.js, Plotly, Three.js, and Electron. Desktop
builds require a signing identity and notarization for signed distribution.
