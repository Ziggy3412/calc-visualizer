// Shared Plotly layout + config so every 2D graph looks identical:
// same grid, same zero lines, same hover spikes, same margins.

// Plot config used by every 2D tab (mode bar hidden; wheel zoom is handled by
// our own onWheel so it stays in sync with the +/− buttons).
export const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: false,
  doubleClick: false,
}

const AXIS_BASE = {
  showgrid: true,
  gridcolor: '#e8e8e8',
  zeroline: true,
  zerolinecolor: '#777',
  zerolinewidth: 1.3,
  showline: false,
  mirror: false,
  showspikes: true,
  spikemode: 'across',
  spikecolor: '#999',
  spikethickness: 1,
  spikedash: 'dot',
}

// Standard cartesian layout. Pass the view window plus any tab extras.
export function cartesianLayout({
  xMin, xMax, yMin, yMax,
  xTitle, yTitle,
  shapes = [],
  annotations = [],
  showLegend = false,
}) {
  return {
    autosize: true,
    margin: { t: 30, r: 20, b: 40, l: 45 },
    xaxis: {
      ...AXIS_BASE,
      range: [xMin, xMax],
      ...(xTitle ? { title: { text: xTitle, font: { size: 12 } } } : {}),
    },
    yaxis: {
      ...AXIS_BASE,
      range: [yMin, yMax],
      // No scaleanchor: the axes show exactly the requested window so curves
      // sampled over that same window reach both edges.
      ...(yTitle ? { title: { text: yTitle, font: { size: 12 } } } : {}),
    },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    hovermode: 'closest',
    dragmode: 'pan',
    shapes,
    annotations,
    showlegend: showLegend,
    legend: { x: 1, xanchor: 'right', y: 1, bgcolor: 'rgba(255,255,255,0.8)' },
  }
}
