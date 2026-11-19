const m = String.raw
const step = (title, explanation, math) => ({ title, explanation, math })
export const PROOFS = [
  { id: 'ivt', idea: 'Use completeness of the real numbers to find the boundary between values below and above the target.', steps: [
    step('Reduce to increasing endpoint heights', 'Assume f(a)<N<f(b). If the heights are reversed, apply the argument to −f and −N.', m`S=\{x\in[a,b]:f(x)<N\},\qquad c=\sup S`),
    step('Locate the boundary', 'S is nonempty since a belongs to it and is bounded above by b. Continuity at a gives points of S to the right of a. Continuity at b gives a neighborhood of b disjoint from S. Thus a<c<b.', m`a<c<b`),
    step('Rule out a value below N', 'If f(c)<N, continuity makes f(x)<N on a neighborhood of c. A point to the right of c would belong to S, contradicting that c is an upper bound.'),
    step('Rule out a value above N', 'If f(c)>N, continuity gives a neighborhood of c where f>N. But the definition of supremum supplies points of S arbitrarily close to c from below. This is a contradiction.'),
    step('Conclude', 'Both strict inequalities are impossible, so f(c)=N. This proves existence of an intermediate value.', m`\exists c\in(a,b):f(c)=N`),
  ] },
  { id: 'evt', idea: 'Compactness prevents a continuous function from escaping to infinity or approaching an extreme without attaining it.', steps: [
    step('Prove boundedness', 'If f were unbounded in magnitude, choose xₙ in [a,b] with |f(xₙ)|>n. By Bolzano–Weierstrass, a subsequence converges to c in [a,b]. Continuity would make its function values converge to the finite number f(c), a contradiction.'),
    step('Approach the supremum', 'The nonempty bounded image has a finite supremum M by completeness. For each n choose xₙ with f(xₙ)>M−1/n.', m`M-\frac1n<f(x_n)\le M`),
    step('Extract a convergent subsequence', 'Compactness gives xₙₖ→v in [a,b]. Squeezing the function values and using continuity gives f(v)=M.', m`f(v)=\lim_{k\to\infty}f(x_{n_k})=M`),
    step('Obtain the minimum', 'Apply the maximum argument to −f. A point maximizing −f minimizes f. Thus both absolute extrema are attained.'),
  ], dependencies: 'Completeness of ℝ, Bolzano–Weierstrass, continuity, and the Squeeze Theorem.' },
  { id: 'squeeze', idea: 'Both bounds eventually lie within any requested distance of the common limit.', steps: [
    step('Choose an arbitrary tolerance', 'Let ε>0. Since g and h approach L, choose positive δ₁ and δ₂ so their distances from L are each below ε in the corresponding deleted neighborhoods.'),
    step('Use a common neighborhood', 'Choose δ small enough for both limit estimates and for the assumed ordering g≤f≤h to hold.', m`0<|x-a|<\delta\Rightarrow L-\varepsilon<g(x)\le f(x)\le h(x)<L+\varepsilon`),
    step('Apply the definition of limit', 'The inequality implies |f(x)−L|<ε for every sufficiently close x≠a. Since ε was arbitrary, f approaches L.', m`\lim_{x\to a}f(x)=L`),
  ] },
  { id: 'fermat', idea: 'At an interior maximum, the left and right difference quotients force opposite bounds on the same derivative.', steps: [
    step('Assume a local maximum', 'For sufficiently small h of either sign, f(c+h)≤f(c). The point is interior, so both signs are available.'),
    step('Use positive increments', 'Divide the nonpositive numerator by positive h and take the right limit.', m`h>0:\quad\frac{f(c+h)-f(c)}h\le0\Rightarrow f'(c)\le0`),
    step('Use negative increments', 'Division reverses the inequality when h<0. The derivative exists, so the left and right limits agree.', m`h<0:\quad\frac{f(c+h)-f(c)}h\ge0\Rightarrow f'(c)\ge0`),
    step('Combine the bounds', 'The only number both nonpositive and nonnegative is zero. For a local minimum, apply the same argument to −f.', m`f'(c)=0`),
  ] },
  { id: 'rolle', idea: 'Equal endpoint heights force any nonconstant excursion to have an interior extremum.', steps: [
    step('Handle the constant case', 'If f is constant on [a,b], its derivative is zero at every interior point.'),
    step('Apply EVT in the nonconstant case', 'The function attains its absolute minimum and maximum. Since f(a)=f(b) and f is not constant, at least one extreme differs from that common endpoint height.'),
    step('Locate an interior extremum', 'An extreme with a different height cannot occur at either endpoint. Choose an interior point c where that extreme is attained.'),
    step('Apply Fermat’s theorem', 'Differentiability holds at c, so its derivative is zero.', m`\exists c\in(a,b):f'(c)=0`),
  ], dependencies: 'EVT and Fermat’s theorem.' },
  { id: 'mvt', idea: 'Subtract the secant line so the new function has equal endpoint values, then use Rolle’s theorem.', steps: [
    step('Define the secant slope', 'The interval has positive length, so the denominator is nonzero.', m`s=\frac{f(b)-f(a)}{b-a}`),
    step('Subtract the secant line', 'The new function is continuous on [a,b] and differentiable on (a,b), because f has those properties.', m`g(x)=f(x)-f(a)-s(x-a)`),
    step('Check the endpoints', 'The secant line agrees with f at both endpoints.', m`g(a)=g(b)=0`),
    step('Apply Rolle’s theorem', 'There is a c in (a,b) with g′(c)=0. Differentiating g recovers the required equality.', m`0=g'(c)=f'(c)-s\Rightarrow f'(c)=\frac{f(b)-f(a)}{b-a}`),
  ], dependencies: 'Rolle’s theorem.' },
  { id: 'monotonicity', idea: 'Apply MVT to any two points in the interval.', steps: [
    step('Choose any two inputs', 'Let x₁<x₂ be arbitrary points in the interval. Differentiability supplies the continuity needed on the smaller closed interval.'),
    step('Use the mean-value identity', 'MVT supplies c strictly between the inputs.', m`f(x_2)-f(x_1)=f'(c)(x_2-x_1)`),
    step('Read the sign', 'Since x₂−x₁>0, positive derivatives give f(x₂)>f(x₁), negative derivatives give the reverse inequality, and derivatives identically zero give equality for every pair.'),
  ], dependencies: 'MVT.' },
  { id: 'ftc1', idea: 'A short interval’s average height approaches its height at the fixed endpoint.', steps: [
    step('Write the difference quotient', 'Let x be interior and h≠0 small enough to keep x+h in the interval. Integral additivity gives:', m`\frac{A(x+h)-A(x)}h=\frac1h\int_x^{x+h}f(t)\,dt`),
    step('Use continuity at x', 'For any ε>0, continuity gives |f(t)−f(x)|<ε whenever t is sufficiently close to x.'),
    step('Bound the error on either side', 'The integral triangle inequality on the interval between x and x+h works for positive and negative h. Its length is |h|.', m`\left|\frac1h\int_x^{x+h}f(t)\,dt-f(x)\right|\le\frac1{|h|}\int_{\min(x,x+h)}^{\max(x,x+h)}|f(t)-f(x)|\,dt\le\varepsilon`),
    step('Take the limit', 'The error tends to zero, so the difference quotient tends to f(x).', m`A'(x)=f(x)`),
  ], dependencies: 'Integral additivity and the integral triangle inequality.' },
  { id: 'ftc2', idea: 'The accumulation function and any other antiderivative differ by a constant.', steps: [
    step('Build an accumulation function', 'For continuous f, FTC Part 1 says this function has derivative f in the interior and is continuous on the closed interval.', m`A(x)=\int_a^xf(t)\,dt,\qquad A'=f`),
    step('Compare with the given antiderivative', 'Take an antiderivative F continuous on [a,b], differentiable inside, with F′=f. The difference has zero derivative.', m`(F-A)'=0`),
    step('Apply the constant-function consequence of MVT', 'F−A is constant across the interval, including its endpoints by continuity.', m`F(b)-A(b)=F(a)-A(a)`),
    step('Substitute the accumulation values', 'A(a)=0 and A(b) is the required integral.', m`\int_a^bf(x)\,dx=F(b)-F(a)`),
  ], dependencies: 'FTC Part 1 and the zero-derivative consequence of MVT.' },
  { id: 'integral-mvt', idea: 'The average height lies between the minimum and maximum heights; continuity fills in all heights between them.', steps: [
    step('Bound the function using EVT', 'A continuous function on [a,b] attains a minimum m and maximum M.', m`m\le f(x)\le M`),
    step('Integrate and divide by the interval length', 'Order preservation and b−a>0 imply:', m`m\le\frac1{b-a}\int_a^bf(x)\,dx\le M`),
    step('Use IVT', 'The average is between two attained heights, so IVT supplies a point c in [a,b] with that height. If m=M, every point works.', m`f(c)=\frac1{b-a}\int_a^bf(x)\,dx`),
    step('Why an interior point can be chosen', 'If f is nonconstant, continuity makes the average strictly above m and strictly below M: near a point above m there is a positive integral contribution to f−m, and similarly for M−f. An intermediate-height point between extrema lies in (a,b).'),
  ], dependencies: 'EVT, integral comparison, and IVT.' },
  { id: 'parts', idea: 'Integrate both sides of the product rule.', steps: [
    step('Start with a derivative identity', 'For continuously differentiable u and v, the product rule holds at every point.', m`(uv)'=u'v+uv'`),
    step('Integrate over the interval', 'Linearity splits the right side into two integrals.', m`\int_a^b(uv)'\,dx=\int_a^bu'v\,dx+\int_a^buv'\,dx`),
    step('Apply FTC and rearrange', 'FTC evaluates the integral of the product’s derivative. Subtract the first term on the right.', m`\int_a^buv'\,dx=[uv]_a^b-\int_a^bvu'\,dx`),
  ], dependencies: 'Product rule, integral linearity, and FTC Part 2.' },
  { id: 'geometric', idea: 'Shift a finite sum by one power and subtract, then take a limit.', steps: [
    step('Write the finite partial sum', 'There are N+1 terms because indexing begins at zero.', m`S_N=a+ar+\cdots+ar^N`),
    step('Multiply by the ratio and subtract', 'Every middle term cancels. For r≠1 divide by 1−r.', m`(1-r)S_N=a-ar^{N+1}\Rightarrow S_N=\frac{a(1-r^{N+1})}{1-r}`),
    step('Take the limit for |r|<1', 'The power rᴺ⁺¹ tends to zero, giving the infinite sum.', m`\sum_{n=0}^\infty ar^n=\lim_{N\to\infty}S_N=\frac a{1-r}`),
    step('Exclude the other ratios', 'For a≠0 and |r|≥1, the terms arⁿ do not approach zero, so the series diverges by the nth-term test. If a=0, every term is zero.'),
  ], dependencies: 'Limits of geometric sequences and the nth-term test.' },
  { id: 'p-series', idea: 'Compare the decreasing positive terms with their improper integral.', steps: [
    step('Handle p≤0', 'The terms 1/nᵖ do not approach zero, so the series diverges.'),
    step('For p>0, apply the integral test', 'The function x⁻ᵖ is positive, continuous, and decreasing for x≥1. The integral test therefore applies.'),
    step('Evaluate for p≠1', 'If p>1, B¹⁻ᵖ tends to zero and the integral is finite. If 0<p<1, B¹⁻ᵖ grows without bound.', m`\int_1^B x^{-p}\,dx=\frac{B^{1-p}-1}{1-p}`),
    step('Handle p=1', 'The logarithm grows without bound, so the harmonic series diverges. Combining the cases gives convergence exactly for p>1.', m`\int_1^B\frac{dx}{x}=\ln B\longrightarrow\infty`),
  ], dependencies: 'Integral test, power-rule integration, and the nth-term test.' },
  { id: 'absolute', idea: 'Bound every signed tail by the corresponding tail of the convergent absolute-value series.', steps: [
    step('Use the Cauchy criterion on the absolute series', 'Since Σ|aₙ| converges, for each ε>0 there is N so every tail beyond N has magnitude sum less than ε.', m`m>n\ge N\Rightarrow\sum_{k=n+1}^m|a_k|<\varepsilon`),
    step('Apply the triangle inequality', 'Let Sₙ be the signed partial sums. Their differences are bounded by those absolute tails.', m`|S_m-S_n|=\left|\sum_{k=n+1}^ma_k\right|\le\sum_{k=n+1}^m|a_k|<\varepsilon`),
    step('Use completeness', 'The signed partial sums form a Cauchy sequence of real numbers, hence converge. By definition the signed series converges.'),
  ], dependencies: 'Cauchy criterion, triangle inequality, and completeness of ℝ.' },
]
