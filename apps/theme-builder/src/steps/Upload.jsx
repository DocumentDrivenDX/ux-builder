import { Button, Icon } from "@ux-builder/ui";
import { useRef, useState } from "react";
import { colourName } from "../model.js";

/* Step 1, "Upload logo" (prototype step 1). */

const SAMPLE = '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="Acme Legal logo"><rect x="4" y="4" width="64" height="64" rx="10" fill="#1F3A5F"/><path d="M22 54 36 18l14 36" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/><rect x="27" y="40" width="18" height="6" fill="#B4442C"/><circle cx="54" cy="18" r="6" fill="#E8A33D"/></svg>';
export const sampleFile = () => new File([SAMPLE], "acme-legal-logo.svg", { type: "image/svg+xml" });

export function Upload({ logo, scanning, onLogo, onDarkLogo, onMark, onReplace, onNext }) {
  const input = useRef(null), dark = useRef(null), mark = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <section className="tb-two">
      <div className="tb-col">
        <h1>Start with the client's logo</h1>
        <p className="tb-lede">Upload an SVG or PNG. We read its brand colours and ignore black, white and greys. Add a dark-background version, and the client's mark for the favicon, if they have them.</p>
        <label
          className={`tb-drop${over ? " tb-drop--over" : ""}`} htmlFor="logo-file"
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); e.dataTransfer.files[0] && onLogo(e.dataTransfer.files[0]); }}
        >
          <Icon name="upload" size="1.75rem" />
          <b>Drop a logo here, or choose a file</b>
          <span className="tb-hint">SVG or PNG · light and dark versions</span>
          <input ref={input} className="tb-sr" id="logo-file" type="file" accept=".svg,.png,image/svg+xml,image/png" onChange={(e) => e.target.files[0] && onLogo(e.target.files[0])} />
        </label>
        <Button variant="text" onClick={() => onLogo(sampleFile())}>Use the sample logo</Button>
      </div>
      <div className="tb-panel tb-col">
        <span className="tb-eyebrow">{logo ? "Uploaded" : "Waiting for a logo"}</span>
        {logo ? (
          <div className="tb-row">
            <img className="tb-logo" src={logo.url} alt={`Uploaded logo ${logo.filename}`} />
            <div>
              <b>{logo.filename}</b>
              <div className="tb-hint">light background · <button type="button" className="tb-link" onClick={onReplace}>Replace</button></div>
              {logo.dark
                ? <div className="tb-hint">dark background: {logo.dark.filename}</div>
                : <div className="tb-hint"><button type="button" className="tb-link" onClick={() => dark.current.click()}>Add a dark-background version</button></div>}
              <input ref={dark} className="tb-sr" type="file" accept=".svg,.png,image/svg+xml,image/png" aria-label="Dark-background logo" onChange={(e) => e.target.files[0] && onDarkLogo(e.target.files[0])} />
              {logo.mark
                ? <div className="tb-hint tb-row"><img className="tb-mark" src={logo.mark.url} alt={`Mark ${logo.mark.filename}`} /> mark and favicon: {logo.mark.filename}</div>
                : <div className="tb-hint"><button type="button" className="tb-link" onClick={() => mark.current.click()}>Add a mark / favicon</button> (the symbol on its own, ideally square)</div>}
              <input ref={mark} className="tb-sr" type="file" accept=".svg,.png,image/svg+xml,image/png" aria-label="Mark and favicon" onChange={(e) => e.target.files[0] && onMark(e.target.files[0])} />
            </div>
          </div>
        ) : <p className="tb-hint">Your logo and the colours we find in it will appear here.</p>}
        {scanning && <div><span className="tb-eyebrow">Reading colours</span><div className="tb-scan"><i /></div></div>}
        {logo && !scanning && (
          <>
            <span className="tb-eyebrow">Brand colours we found</span>
            {logo.analysis.monochrome
              ? <p className="tb-hint">None: the logo is black, white or grey. The palettes use a suggested colour you can steer.</p>
              : <ul className="tb-chips" aria-label="Brand colours we found">{logo.analysis.candidates.map((c, i) => (
                  <li key={c.hex} className="tb-row tb-chip-in" style={{ animationDelay: `${i * 180}ms` }}>
                    <span className="tb-swatch" style={{ background: c.hex }} /><code>{c.hex}</code>
                    <span className="tb-hint">{colourName(c.hex)} · {Math.round(c.share * 100)}% of the logo's colour</span>
                  </li>))}</ul>}
            <Button onClick={onNext}>Suggest palettes</Button>
          </>
        )}
      </div>
    </section>
  );
}
