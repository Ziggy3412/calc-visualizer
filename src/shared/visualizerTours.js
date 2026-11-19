const step=(title,text,selector,match,index=0)=>({title,text,target:{selector,match,index}})
// Match visible control text as well as CSS selectors: this keeps targets stable
// across selected examples, finite/infinite modes, and optional controls.
export const VISUALIZER_TOURS={
 limits:[
  step('Choose what x approaches','Enter a finite target, or click +∞ or −∞. For infinity, type inf and press Enter. The table then samples larger positive or negative inputs.','.bound-input'),
  step('Compare nearby values','For a finite target, compare left and right columns: both must approach the same value for a two-sided limit. At infinity, follow how f(x) changes as the magnitude of x grows.','.limit-table-section, table.limit-table'),
  step('Move the approach control','Drag this slider toward the target. In infinity mode it controls powers of ten, so each move explores much larger input values. Infinity is a direction rather than a point reached by the slider.','.viz-slider'),
 ],
 riemann:[
  step('Pick how slices are measured','Left and Right use an endpoint height. Midpoint samples the center; Trapezoid joins the endpoint heights. On an infinite interval these finite-width rules are disabled.','.viz-section','Rule'),
  step('Distinguish more slices from infinite bounds','n controls how many pieces approximate a fixed interval. Infinite slices means their widths tend to zero; it does not make the interval infinite. To integrate to infinity, use ±∞ in a or b instead. Infinite bounds automatically use the continuous view.','.viz-infinite-slices, .viz-slider'),
 ],
 pva:[
  step('Connect slope with derivative value','Enable the original function and its derivatives. The height on the first-derivative graph is the slope of the original; the second derivative tells you how that slope changes. For motion, these are position, velocity, and acceleration.','.pva-graph-tabs'),
  step('Match a tangent slope to the derivative','Enable a tangent to the original function. At the cursor’s x-value, that tangent’s slope equals the height f′(x). A horizontal tangent gives f′(x)=0, but does not by itself prove a maximum or minimum.','.viz-check-row','Tangent lines:'),
 ],
 implicitdiff:[
  step('Use a relation, not a slope formula','Enter an equation such as x²+y²=25. You do not need to solve for y. The tool differentiates y terms with the chain rule: differentiating y² gives 2y·dy/dx, not just 2y.','math-field.math-input'),
  step('The point must satisfy the equation','For x²+y²=25, (3,4) is on the curve and gives slope −3/4. An arbitrary pair may not lie on the curve, so no tangent can be computed there. A zero denominator can mean a vertical tangent or an undetermined slope.','.viz-section','Point'),
 ],
 relatedrates:[
  step('Identify the relationship','This equation connects the quantities at every instant. In a cone, similar triangles relate the changing radius to water depth; a cube has a fixed base area.','.viz-section','Equation in x and y'),
  step('Set the instant','Enter the two measurements at the instant you are studying. They must satisfy the relationship and stay inside the physical limits.','.viz-section','x at this instant'),
  step('Give the known rate','Choose which time rate is known, then enter its signed value. Positive means increasing; negative means decreasing or draining. The other rate is calculated.','.viz-section','Known rate'),
  step('Which rate stays constant?','Playback holds your chosen rate constant. At constant inflow dV/dt, a cone’s water level rises more slowly as its surface widens; a cube’s level rises at a constant rate. The depth slider changes height and volume together so the measurements stay consistent.','.water-tank-controls'),
 ],
 slopefield:[
  step('Enter a slope rule','Type the right-hand side g(x,y), such as x−y or −x/y. Each small segment shows the slope a solution would have at that point.','math-field.math-input'),
  step('Drop a starting point','Click a point on the graph to trace a solution through it in both directions. Traces stop at undefined slopes or where a reliable numerical step cannot be found.','.viz-graph'),
 ],
 polar:[
  step('Enter the radius','Write r as a function of theta, for example 2 or 1+cos(theta). The angle gives direction and the radius gives distance from the origin.','math-field.math-input'),
  step('Choose the angle range','Angles are in radians. You can enter expressions such as 2*pi, or use infinity for an unbounded sweep. Choose an interval that traces your intended region once.','.viz-section','θ start'),
 ],
 crosssection:[
  step('Set the base boundaries','Enter the top and bottom edges of the base region. A blank bottom means zero. The cross-section width is the distance between the boundaries.','.viz-section','Top boundary'),
  step('Choose the slice shape','Each shape has a different area formula. A square uses width²; a semicircle treats the width as its diameter. For a rectangle, also enter its height.','.viz-section','Cross Section Shape'),
 ],
 solids:[
  step('Define the region being revolved','Curve 1 and the optional curve 2 bound the region. With only one curve, the other boundary is zero. Choose y=f(x) or x=g(y) to match your independent variable; the bounds must use that same variable.','math-field.math-input'),
  step('Set the rotation axis','Radius is distance to the rotation axis, not automatically the curve’s height. Around y=2, for example, the distance from y=f(x) is |f(x)−2|. Pick the axis and its coordinate before interpreting any radius.','.viz-section','Axis of Revolution'),
  step('Choose a slicing method','Disks and washers slice perpendicular to the rotation axis; washers subtract the inner disk. Shells run parallel to the axis and use 2π × radius × height. A method warning means your function orientation does not match that slicing direction.','.viz-section','Method'),
 ],
 taylor:[
  step('Choose the center','The center is the input where the function and polynomial match. A center of zero gives a Maclaurin polynomial. It must be a finite point where the required derivatives exist.','.viz-section','Center point'),
  step('Change the degree','Degree n uses derivatives through order n at the center. Degree is not the number of nonzero terms: the degree-3 sine polynomial has only x and −x³/6. More terms can help nearby without guaranteeing convergence far away.','.viz-slider'),
 ],
 byparts:[
  step('Choose the factor u','Integration by parts reverses the product rule. Put the factor you want to differentiate here. For x·eˣ, a useful choice is u=x.','math-field.math-input',undefined,0),
  step('Enter dv/dx, not v','This box takes w(x), where dv=w(x)dx. For x·eˣ, enter eˣ here. The app integrates it from a to x to build v, choosing v(a)=0.','math-field.math-input',undefined,1),
  step('Understand the two regions','The axes here are u and v. In the clean increasing example, the area under the path is ∫v du and the area to its left is ∫u dv. Together they fill the endpoint rectangle.','.viz-graph'),
  step('Check the identity','The original integral equals the boundary product minus the other integral. The final numerical check should be close to zero. With infinite bounds, the identity is labeled as a finite preview and the original improper integral is estimated separately.','.viz-results'),
 ],
}
export function placeTourCard(target,width,height,cardWidth,cardHeight) {
 const pad=16,gap=34
 const w=Math.min(cardWidth,width-2*pad),h=Math.min(cardHeight,height-100)
 const options=[
  {x:target.right+gap,y:target.top,space:width-target.right-gap,fit:width-target.right-gap>=w},
  {x:target.left-gap-w,y:target.top,space:target.left-gap,fit:target.left-gap>=w},
  {x:target.left,y:target.bottom+gap,space:height-target.bottom-gap,fit:height-target.bottom-gap>=h},
  {x:target.left,y:target.top-gap-h,space:target.top-70-gap,fit:target.top-70-gap>=h},
 ]
 const chosen=options.filter(o=>o.fit).sort((a,b)=>b.space-a.space)[0]||{x:width-w-pad,y:height-h-pad}
 return {left:Math.max(pad,Math.min(width-w-pad,chosen.x)),top:Math.max(72,Math.min(height-h-pad,chosen.y)),width:w}
}
