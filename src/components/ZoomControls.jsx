export default function ZoomControls({ onZoomIn, onZoomOut, onReset }) {
  return <div className="zoom-controls">
    <button className="zoom-btn" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">+</button>
    <button className="zoom-btn zoom-home" onClick={onReset} title="Reset view" aria-label="Reset view">⌂</button>
    <button className="zoom-btn" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">−</button>
  </div>
}
