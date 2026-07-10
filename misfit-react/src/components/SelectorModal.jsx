import { useState } from 'react';
import { useApp }   from '../context/AppContext';

export default function SelectorModal() {
  const { selectorModal, setSelectorModal, addToCart, openPayment, showToast } = useApp();
  const [size,   setSize]   = useState(null);
  const [colour, setColour] = useState(null);

  if (!selectorModal) return null;
  const { product: p, action } = selectorModal;

  function confirm() {
    if (!size)   { showToast('Please select a size', 'error');   return; }
    const reqColour = p.colours && p.colours.length > 0;
    if (reqColour && !colour) { showToast('Please select a colour', 'error'); return; }
    setSelectorModal(null);
    if (action === 'cart') addToCart(p, size, colour || 'Standard');
    else openPayment([{ product: p, size, colour: colour || 'Standard', qty: 1 }]);
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="selector-modal">
        <button className="modal-close" onClick={() => setSelectorModal(null)}>x</button>
        <h3>{action === 'cart' ? 'Add to Cart' : 'Buy Now'}</h3>
        <div className="selector-product-preview">
          <strong>{p.name}</strong> &nbsp;·&nbsp; ₹{p.price}
        </div>
        <div className="selector-step">
          <h4>Choose Size</h4>
          <div className="size-picker">
            {(p.sizes || []).map(s => (
              <button
                key={s}
                className={`size-option ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >{s}</button>
            ))}
          </div>
        </div>
        {p.colours && p.colours.length > 0 && (
          <div className="selector-step">
            <h4>Choose Colour</h4>
            <div className="colour-swatches">
              {(p.colours || []).map((c, i) => (
                <div
                  key={c}
                  className={`colour-swatch ${colour === c ? 'active' : ''}`}
                  style={{ background: (p.colourHex || [])[i] || '#888' }}
                  title={c}
                  onClick={() => setColour(c)}
                />
              ))}
            </div>
          </div>
        )}
        <button className="btn-confirm" onClick={confirm}>Confirm</button>
      </div>
    </div>
  );
}
