const m = String.raw
const expr = (ascii, latex = ascii) => ({ ascii, latex })
// The examples are deliberately small enough to check by hand.
export const VISUALIZER_GUIDES = {
  limits: {
    intro: 'A limit asks where the output is heading as the input gets close to a target. It is about nearby values, which can differ from the value at the target itself.',
    formula: m`\lim_{x\to a}f(x)=L`,
    picture: 'The horizontal axis is x and the vertical axis is f(x). The two approach markers come toward the target from opposite sides. Their blue and red colors distinguish left from right; the curve’s base color is independent of those approach colors.',
    steps: ['Enter a function in an expression row. Add more rows to compare graphs; each row has its own color and delete button.', 'Set “lim x →” to a number, ∞, or −∞. Use the infinity buttons or type inf. For an infinite target, the magnitude slider explores progressively larger inputs. Move the approach slider toward the target and watch the two output heights.', 'Compare the left and right values in the table. A two-sided limit requires both sides to approach the same finite height. Pan or zoom to inspect the neighborhood.'],
    example: { title: 'A missing point can still have a limit', math: m`f(x)=\frac{x^2-1}{x-1},\qquad\lim_{x\to1}f(x)=2`, explanation: 'For x≠1, cancel x−1 to get x+1. Both sides approach 2 even though the original quotient is undefined at 1. The hole does not destroy the limit.', initial: { entries: [{ id: 1, expr: '(x^2-1)/(x-1)', latex: m`\frac{x^2-1}{x-1}` }], target: 1 } },
    caution: 'A graph or a finite table suggests a limit; it is not a proof. At a jump, the two one-sided limits disagree. At a vertical asymptote, the output may grow without bound.'
  },
  riemann: {
    intro: 'An integral adds many tiny contributions. A Riemann sum approximates that addition with rectangles: height is a sampled function value and width is a short input interval.',
    formula: m`\int_a^b f(x)\,dx=\lim_{n\to\infty}\sum_{i=1}^n f(x_i^*)\,\Delta x,\qquad\Delta x=\frac{b-a}{n}`,
    picture: 'The curve is the function. Rectangles approximate its signed area between a and b. The trapezoid option uses sloping tops instead. The numerical readout compares the chosen approximation with a more accurate numerical integral.',
    steps: ['Enter f(x) and choose a start a and end b. Either bound can be ∞ or −∞: type inf or use the infinity buttons. Infinite intervals use improper-integral estimates and a finite graph preview.', 'Choose Left, Right, Midpoint, or Trapezoid to decide how each slice’s height is measured.', 'Increase n and watch the approximation change. Use Infinite slices to show the limiting filled region; finite slices explain how that limit is built.'],
    example: { title: 'Four rectangles under a parabola', math: m`f(x)=x^2,\quad[a,b]=[0,1],\quad n=4,\quad L_4=\frac7{32},\quad\int_0^1x^2dx=\frac13`, explanation: 'The left heights are 0, 1/16, 1/4, and 9/16, each with width 1/4. Their sum is below 1/3 because x² increases on this interval. Compare the right and midpoint rules, then raise n.', initial: { expr: expr('x^2'), a: 0, b: 1, n: 4, rule: 'left' } },
    caution: 'A definite integral is signed accumulation. Regions below the x-axis subtract; total geometric area requires splitting the interval or integrating |f|.'
  },
  pva: {
    intro: 'A derivative is an instantaneous rate of change. If the original function is position, its first derivative is velocity and its second derivative is acceleration. The same picture works for any function and its derivatives.',
    formula: m`v(t)=s'(t),\qquad a(t)=v'(t)=s''(t)`,
    picture: 'The selected curves show the original function, its first derivative, and its second derivative. A tangent line shows the local slope at the cursor. A derivative’s value is a height on its own graph and a slope on the preceding graph.',
    steps: ['Enter a function and turn on the original, first-derivative, or second-derivative graphs you want to compare.', 'Move the cursor slider. Turn on tangent lines to connect a slope with the corresponding derivative value.', 'Use critical-point, concavity, and inflection overlays to inspect where behavior changes. Check signs on each side rather than judging from one point.'],
    example: { title: 'A particle that reverses direction', math: m`s(t)=t^3-3t,\quad v(t)=3t^2-3,\quad a(t)=6t`, explanation: 'Velocity is zero at t=−1 and t=1. The particle moves in the positive direction where |t|>1 and in the negative direction where |t|<1. At t=0 its position graph has slope −3 and acceleration is zero.', initial: { expr: expr('x^3-3*x', 'x^3-3x'), cursorX: 0, graphs: ['x','v','a'], tangents: ['x'] } },
    caution: 'Negative velocity means motion in the negative direction. Speed is |velocity|. A zero derivative is only a candidate for an extremum, not a guarantee.'
  },
  implicitdiff: {
    intro: 'Some curves are defined by a relationship between x and y instead of an explicit formula y=f(x). Implicit differentiation finds a tangent slope by remembering that y changes when x changes.',
    formula: m`F(x,y)=0\quad\Longrightarrow\quad F_x+F_y\,y'=0,\qquad y'=-\frac{F_x}{F_y}\quad(F_y\ne0)`,
    picture: 'The curve contains the points satisfying the equation. The marked point is where the tangent is computed. The worked steps show why differentiating a y term introduces a factor of dy/dx.',
    steps: ['Choose an example or enter a relation in x and y.', 'Enter the coordinates of a point on the curve. If the point does not satisfy the relation, correct it before interpreting the tangent.', 'Read the differentiation steps and compare the resulting slope with the tangent line.'],
    example: { title: 'A tangent to a circle', math: m`x^2+y^2=25,\quad2x+2yy'=0,\quad y'(3,4)=-\frac34`, explanation: 'The derivative of y² is 2y·y′, not just 2y. The tangent at (3,4) is y−4=−3(x−3)/4.', initial: { x: '3', y: '4' } },
    caution: 'The quotient formula requires Fy≠0. A zero denominator may indicate a vertical tangent; if both partial derivatives vanish, more analysis is needed.'
  },
  relatedrates: {
    intro: 'Related rates connects quantities that both change with time. Start with a geometric or physical constraint, differentiate it with respect to time, and use one known rate to solve for another.',
    formula: m`F(x(t),y(t))=0\quad\Longrightarrow\quad F_x\frac{dx}{dt}+F_y\frac{dy}{dt}=0`,
    picture: 'The diagram labels the related quantities. The algebra follows the same relationship through differentiation, substitution, and solving for the unknown rate. A negative answer describes a quantity decreasing.',
    steps: ['Choose a scenario: ladder, circle, balloon, inverted cone, or cube. In the water tanks, x is depth h and y is volume V. Read the fixed tank dimensions and units.', 'Enter a point satisfying the relationship, select which rate is known, and supply its signed value.', 'For the water tanks, move the depth slider or press Play water flow. The diagram and worked solution update together. Follow the steps and differentiate before inserting the instantaneous measurements.'],
    example: { title: 'A ladder’s top moves downward', math: m`x^2+y^2=169,\quad x=5,\ y=12,\ x'=2,\quad y'=-\frac{x}{y}x'=-\frac56\ \mathrm{m/s}`, explanation: 'The ladder length stays fixed. As its foot moves away, the top must move down, which explains the negative sign.', initial: { example: 'ladder' } },
    caution: 'Do not substitute an instantaneous length before differentiating: it is changing, not a constant. Keep units and the sign of the known rate.'
  },
  polar: {
    intro: 'Polar coordinates describe a point by its distance r from the origin and its angle θ. A small angle sweeps out a thin sector, whose area is approximately one half r² times the angle width.',
    formula: m`x=r\cos\theta,\quad y=r\sin\theta,\qquad A=\frac12\int_\alpha^\beta r(\theta)^2\,d\theta`,
    picture: 'The curve is traced as the angle changes. The shaded sweep accumulates sector area. The rectangular plot, when shown, relates radius to angle; it is not the same picture as the polar curve in the plane.',
    steps: ['Enter r as a function of the angle variable used by the input, and set the starting and ending angles in radians. You can use expressions such as pi.', 'Move the sweep control or play the animation to follow how the radius draws the curve.', 'Choose an interval that traces the desired region once. Compare a full sweep with shorter intervals to identify repeated petals or loops.'],
    example: { title: 'A circle described by a radius', math: m`r(\theta)=2,\quad0\le\theta\le2\pi,\qquad A=\frac12\int_0^{2\pi}4\,d\theta=4\pi`, explanation: 'The radius stays 2 while the direction makes one complete turn. The area agrees with πr².', initial: { expr: expr('2'), thetaStart: 0, thetaEnd: 2*Math.PI, thetaStartStr:'0', thetaEndStr:'2*pi' } },
    caution: 'The formula counts swept area with multiplicity. If the curve retraces a region, a longer interval can count it twice. Negative r points in the opposite direction.'
  },
  crosssection: {
    intro: 'Imagine cutting a solid into very thin slices. If you know each slice’s cross-sectional area, adding area times thickness gives the volume.',
    formula: m`V=\int_a^b A(x)\,dx,\qquad A_{\rm square}(x)=[f(x)-g(x)]^2`,
    picture: 'The base region lies between the entered boundary curves. At each x, its vertical width determines the size of the selected square, triangle, or semicircle. The 3D slices stand on that base width; the solid is not necessarily made by rotation.',
    steps: ['Enter the two base boundaries and the interval [a,b]. Choose a cross-section shape.', 'Move the slice position to see how the local base width determines the shape and its area.', 'Increase the slice count or use the continuous display. Rotate the 3D view to see how the slices form a solid.'],
    example: { title: 'Squares above a triangular base', math: m`f(x)=x,\quad g(x)=0,\quad0\le x\le1,\quad A(x)=x^2,\quad V=\frac13`, explanation: 'The square at x has side length x. Its area is x², so the volume is the integral of x², not the integral of the side length.', initial: { expr: expr('x'), bottomExpr: expr('0'), a:0, b:1, shape:'square' } },
    caution: 'Use the area formula for the selected shape. A semicircle with diameter w has area πw²/8; it does not have radius w. The boundaries must define the intended base region.'
  },
  solids: {
    intro: 'A solid of revolution is formed by rotating a curve or region around an axis. Disks, washers, and shells describe different slices of the same kind of solid. Surface area measures the outside skin instead of the material inside.',
    formula: m`V_{\rm washer}=\pi\int_a^b(R^2-r^2)\,dx,\qquad V_{\rm shell}=2\pi\int_a^b(\text{radius})(\text{height})\,dx`,
    picture: 'The profile is the shape before rotation. Rotating it builds the 3D solid; the highlighted slice shows the local disk, washer, or shell contribution. Surface mode shows the skin and uses a different formula.',
    steps: ['Enter the profile or region boundaries and bounds. Select the rotation axis, including its coordinate if shifted.', 'Choose the appropriate disk, washer, or shell setup. Identify radius as distance to the axis, not simply the curve’s y-value.', 'Play the revolution or inspect the slices. Switch between volume and surface area to compare what is being measured.'],
    example: { title: 'Rotate a line to make a cone', math: m`y=x,\quad0\le x\le1,\quad\text{about the x-axis},\qquad V=\pi\int_0^1x^2dx=\frac\pi3`, explanation: 'Each perpendicular slice is a disk of radius x. The final cone has radius 1 and height 1, agreeing with the geometric cone formula.', initial: { expr1:expr('x'), expr2:expr('0'), a:0, b:1, axisKey:'xaxis', method:'disk' } },
    caution: 'Outer radius is the larger distance to the axis. With shifted axes, subtract the axis coordinate carefully. Surface area and volume have different units and are not interchangeable.'
  },
  taylor: {
    intro: 'A Taylor polynomial copies a function’s value and successive derivatives at a chosen center. It approximates the function nearby; adding terms lets the polynomial match more local behavior.',
    formula: m`T_n(x)=\sum_{k=0}^n\frac{f^{(k)}(a)}{k!}(x-a)^k`,
    picture: 'One curve is the original function and the other is its polynomial approximation. They match at the center, and their closeness nearby shows the quality of the approximation. The polynomial is a finite sum, even when an infinite series would diverge far away.',
    steps: ['Enter a function or choose an example. Set the center a; a=0 gives a Maclaurin polynomial.', 'Change the degree and compare the curves near the center. The view stays fixed when you change degree so you can compare fairly.', 'Zoom and pan manually. Use Near center for a local view or Fit both curves when you explicitly want a broader view. Open the polynomial formula to inspect its terms.'],
    example: { title: 'Approximating sine near zero', math: m`\sin x\approx T_3(x)=x-\frac{x^3}{6},\qquad|R_3(x)|\le\frac{|x|^4}{24}`, explanation: 'Sine and this cubic share their first three derivatives at zero. At x=0.5 the polynomial is 23/48≈0.479167; the displayed remainder bound follows from |sin⁽⁴⁾|≤1.', initial: { expr:expr('sin(x)',m`\sin x`), center:0, degree:3 } },
    caution: 'Higher degree does not guarantee a good approximation at every input. Convergence and error depend on the function, center, and distance from the center. A visual match alone does not certify an error bound.'
  },
  slopefield: {
    intro: 'A differential equation y′=g(x,y) specifies slopes instead of an explicit solution. A slope field draws a short segment at many points, showing the direction a solution would take there.',
    formula: m`\frac{dy}{dx}=g(x,y),\qquad y(x_0)=y_0`,
    picture: 'Each short segment has slope g(x,y) at its location. A solution curve should follow those directions, bending as the local slopes change. Different starting points can produce different solution curves.',
    steps: ['Enter the right-hand side g(x,y), such as y, x−y, or x+y. Do not include “dy/dx=” in that field.', 'Click a starting point on the field to trace a numerical solution through that point.', 'Try several starting points. Inspect where slopes are zero, positive, or negative, and use zoom or pan to compare local behavior.'],
    example: { title: 'Exponential growth from slopes', math: m`y'=y,\quad y(0)=1\quad\Longrightarrow\quad y=e^x`, explanation: 'At height 1 the slope is 1; at height 2 it is 2. Along y=0 every segment is horizontal, so the zero function is also a solution with a different initial value.', initial: { expr:expr('y'), seeds:[{x:0,y:1}] } },
    caution: 'Traced curves are numerical approximations. Near singularities they may fail or stop. Uniqueness requires hypotheses; a slope field alone does not prove that only one solution passes through a point.'
  },
  byparts: {
    intro: 'Integration by parts helps integrate a product when differentiating one factor makes it simpler. It reverses the product rule: trade the original integral for a boundary product minus a different integral.',
    formula: m`(uv)'=u'v+uv'\quad\Longrightarrow\quad\int_a^b u\,dv=[uv]_a^b-\int_a^b v\,du`,
    picture: 'This is a u–v graph, not an x–y graph of the integrand. As the sweep parameter t runs from a to b, the point is (u(t),v(t)). For the clean increasing example, the area under the curve is ∫v du and the area to its left is ∫u dv. Together they fill the endpoint rectangle, whose area is u(b)v(b). Subtract the under-curve area to recover the left-hand area.',
    steps: ['Split the integrand into u(x) and dv=w(x)dx. Put the factor to differentiate into u(x), and put w(x) into the “dv/dx” field. Enter the derivative of v here, not v itself.', 'The app differentiates u to get du and numerically integrates w to build v(x)=∫ from a to x of w(t)dt. This choice makes v(a)=0. Choosing another constant would change the picture but not the integration-by-parts answer.', 'Set a and b. Press Play sweep or move the sweep slider to watch the two regions grow. Read the legend: ∫v du is under the curve and ∫u dv is to its left.', 'Compare the three readouts: the original integral, the boundary product, and the remaining integral. The check should be close to zero, meaning the identity agrees numerically.'],
    example: { title: 'Why ∫₀¹ x eˣ dx equals 1', math: m`u=x,\quad dv=e^x dx,\quad du=dx,\quad v=e^x-1`, explanation: 'With the app’s convention v(0)=0, the endpoint rectangle has area e−1. The area under the curve is ∫₀¹(eˣ−1)dx=e−2. The remaining left-hand area is (e−1)−(e−2)=1. In a standard hand solution you can instead use v=eˣ: [xeˣ]₀¹−∫₀¹eˣdx=e−(e−1)=1.', initial: { a:0,b:1 } },
    caution: 'The simple rectangle interpretation works for suitably increasing, nonnegative u and v. If they turn or cross axes, integrals use signed area and the clean two-region picture may fail; the identity still holds for suitable differentiable functions. LIATE is a helpful choice heuristic, not a theorem.'
  },
}
