import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractScannedAddress,
  rankSavedClientMatches,
  scoreScannedAddress,
} from '../lib/scannedAddress';
import styles from '../styles/challanWorkspace.module.css';

const MIN_SIDE = 1500; // upscale small photos so label text is big enough for OCR
const MAX_SIDE = 2200;
const GOOD_ENOUGH = 75; // stop trying more passes once the parse scores this well
const USABLE = 45; // below this, tell the user to double-check everything

// Optional: self-host OCR files (set NEXT_PUBLIC_OCR_BASE=/ocr). See notes in chat.
const OCR_BASE = process.env.NEXT_PUBLIC_OCR_BASE;
const WORKER_OPTIONS = OCR_BASE
  ? {
      workerPath: `${OCR_BASE}/worker.min.js`,
      corePath: `${OCR_BASE}/core`,
      langPath: `${OCR_BASE}/lang`,
    }
  : {};

// PSM 3 = automatic layout (handles table-style labels), PSM 6 = one text block.
const PLAN = [
  { rotation: 0, psm: '3', label: 'Reading address' },
  { rotation: 0, psm: '6', label: 'Trying another layout', only: (best) => best < 60 },
  { rotation: 90, psm: '3', label: 'Trying rotated photo', only: (best) => best < USABLE },
  { rotation: 270, psm: '3', label: 'Trying rotated photo', only: (best) => best < USABLE },
  { rotation: 180, psm: '3', label: 'Trying upside-down photo', only: (best) => best < USABLE },
];

/* ------------------------------ image helpers ------------------------------ */

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('This photo format could not be opened on this device.'));
    };
    image.src = objectUrl;
  });
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      // respect the phone's EXIF rotation so text is not sideways
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        /* fall through to <img> */
      }
    }
  }
  return loadImageElement(file);
}

// Grayscale + contrast stretch (2nd to 98th percentile). Helps with glare and shadows.
function enhance(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const hist = new Uint32Array(256);

  for (let i = 0; i < d.length; i += 4) {
    const gray = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0;
    d[i] = gray;
    hist[gray] += 1;
  }

  const total = width * height;
  let low = 0;
  let acc = 0;
  while (low < 255 && (acc += hist[low]) < total * 0.02) low += 1;
  let high = 255;
  acc = 0;
  while (high > 0 && (acc += hist[high]) < total * 0.02) high -= 1;
  const range = Math.max(1, high - low);

  for (let i = 0; i < d.length; i += 4) {
    let v = ((d[i] - low) * 255) / range;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
}

async function prepareCanvas(file) {
  let image;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error('Could not open this photo. Try a JPEG, PNG, or WebP image.');
  }

  try {
    const longest = Math.max(image.width, image.height);
    const scale =
      longest > MAX_SIDE
        ? MAX_SIDE / longest
        : longest < MIN_SIDE
          ? Math.min(MIN_SIDE / longest, 2)
          : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    enhance(canvas);
    return canvas;
  } finally {
    image.close?.();
  }
}

function rotateCanvas(source, degrees) {
  if (!degrees) return source;
  const swap = degrees % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? source.height : source.width;
  canvas.height = swap ? source.width : source.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function hasRecipientDetails(recipient) {
  return Object.values(recipient || {}).some(
    (value) => typeof value === 'string' && value.trim()
  );
}

/* -------------------------------- component -------------------------------- */

/**
 * Props
 *  clients                 saved clients (for matching)
 *  onDraftReady(recipient) fill the form; return false if the user declined to overwrite
 *  onClientMatch(client)   apply a saved client
 *  autoApplyStrongMatch    auto-use a saved client when exactly one strong match exists
 *  preload                 download the OCR engine in the background when the form opens
 */
export default function ChallanAddressScanner({
  clients,
  onDraftReady,
  onClientMatch,
  autoApplyStrongMatch = true,
  preload = true,
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const workerPromiseRef = useRef(null);
  const mountedRef = useRef(false);
  const scanIdRef = useRef(0);
  const attemptLabelRef = useRef('Reading address');
  const lastProgressKeyRef = useRef('');

  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [recognizedText, setRecognizedText] = useState('');
  const [clientMatches, setClientMatches] = useState([]);
  const [lastRecipient, setLastRecipient] = useState(null);
  const [autoApplied, setAutoApplied] = useState(null);

  const getWorker = useCallback(() => {
    if (!workerPromiseRef.current) {
      workerPromiseRef.current = import('tesseract.js')
        .then(({ createWorker }) =>
          createWorker('eng', 1, {
            ...WORKER_OPTIONS,
            logger: (m) => {
              if (!mountedRef.current || m.status !== 'recognizing text') return;
              // update the UI in 5% steps instead of on every tick
              const key = String(Math.round((m.progress || 0) * 20));
              if (key === lastProgressKeyRef.current) return;
              lastProgressKeyRef.current = key;
              setStatus(`${attemptLabelRef.current}… ${Math.round((m.progress || 0) * 100)}%`);
            },
          })
        )
        .catch((workerError) => {
          workerPromiseRef.current = null;
          throw workerError;
        });
    }
    return workerPromiseRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (cb) => window.setTimeout(cb, 1200);
    const cancel =
      typeof window.cancelIdleCallback === 'function'
        ? window.cancelIdleCallback.bind(window)
        : window.clearTimeout.bind(window);
    const handle = preload ? schedule(() => getWorker().catch(() => {})) : null;

    return () => {
      mountedRef.current = false;
      if (handle !== null) cancel(handle);
      const pending = workerPromiseRef.current;
      workerPromiseRef.current = null; // so a StrictMode remount does not reuse a dead worker
      pending
        ?.then((worker) => worker.terminate())
        .catch((workerError) => console.error('Unable to stop OCR worker:', workerError));
    };
  }, [getWorker, preload]);

  const resetOutput = () => {
    setError('');
    setMessage('');
    setWarnings([]);
    setRecognizedText('');
    setClientMatches([]);
    setLastRecipient(null);
    setAutoApplied(null);
  };

  const scanPhoto = async (file) => {
    const scanId = ++scanIdRef.current;
    const isCurrent = () => mountedRef.current && scanId === scanIdRef.current;
    resetOutput();
    setScanning(true);
    setStatus('Preparing photo…');
    let stage = 'prepare';

    try {
      const base = await prepareCanvas(file);
      if (!isCurrent()) return;

      stage = 'load';
      setStatus('Loading on-device OCR…');
      const worker = await getWorker();
      if (!isCurrent()) return;

      stage = 'read';
      let best = null;
      for (let i = 0; i < PLAN.length; i += 1) {
        const step = PLAN[i];
        if (best && step.only && !step.only(best.score)) continue;

        attemptLabelRef.current = step.label;
        lastProgressKeyRef.current = '';
        setStatus(`${step.label}…`);
        await worker.setParameters({
          tessedit_pageseg_mode: step.psm,
          preserve_interword_spaces: '1',
        });
        const {
          data: { text = '' },
        } = await worker.recognize(rotateCanvas(base, step.rotation));
        if (!isCurrent()) return;

        const recipient = extractScannedAddress(text);
        const score = scoreScannedAddress(recipient);
        if (!best || score > best.score) best = { text, recipient, score };
        if (best.score >= GOOD_ENOUGH) break;
      }

      stage = 'parse';
      const { text, recipient, score } = best;
      const ranked = rankSavedClientMatches(clients, recipient);
      const strong = ranked.filter((entry) => entry.strong);

      setRecognizedText(text);
      setClientMatches(ranked.map((entry) => entry.client));
      setWarnings(recipient.meta?.warnings || []);

      if (!hasRecipientDetails(recipient)) {
        setError(
          ranked.length
            ? 'The label text was read. Choose a saved-client match below or enter the details manually.'
            : 'Text was read, but no address could be identified. If the label is handwritten, type it manually. Handwriting is not reliable with on-device OCR.'
        );
        return;
      }

      const accepted = onDraftReady(recipient);
      if (accepted === false) {
        setMessage('Scan discarded. The form was left unchanged.');
        return;
      }
      setLastRecipient(recipient);

      if (autoApplyStrongMatch && strong.length === 1) {
        onClientMatch(strong[0].client);
        setAutoApplied(strong[0].client);
        setMessage(
          `Matched saved client ${strong[0].client.name}${
            strong[0].client.city ? ` (${strong[0].client.city})` : ''
          } and used its saved details. Review before saving.`
        );
      } else {
        setMessage(
          score < USABLE
            ? 'Low-confidence read. Check every recipient field carefully before saving.'
            : ranked.length
              ? 'Draft filled from the scan. Pick a saved-client match below to use its saved details, or review and edit the fields.'
              : 'Draft filled from the scan. Review and edit the recipient details before previewing or saving.'
        );
      }
    } catch (scanError) {
      if (!isCurrent()) return;
      console.error('Unable to scan challan address:', scanError);
      const detail = scanError instanceof Error ? scanError.message : String(scanError);
      if (stage === 'prepare') {
        setError(detail || 'This photo could not be prepared for scanning.');
      } else if (stage === 'load') {
        setError(
          `The on-device OCR engine could not be loaded${detail ? ` (${detail})` : ''}. Check your internet connection for the first download, then try again.`
        );
      } else if (stage === 'read') {
        setError(`Reading the photo failed${detail ? `: ${detail}` : '.'} Try a closer, sharper photo of just the label.`);
      } else {
        setError(`The text was read but could not be understood${detail ? `: ${detail}` : '.'}`);
      }
    } finally {
      if (isCurrent()) {
        setScanning(false);
        setStatus('');
      }
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) scanPhoto(file);
  };

  return (
    <div className={styles.addressScan}>
      <div>
        <strong>Scan recipient address</strong>
        <p>
          Take a photo of the label or pick one from your gallery. The photo is read on this
          device and is not uploaded. Only the receiver block is used, the sender is ignored.
        </p>
      </div>

      <button
        type="button"
        className={`${styles.button} ${styles.primaryButton}`}
        disabled={scanning}
        onClick={() => cameraRef.current?.click()}
      >
        {scanning ? 'Reading address…' : 'Take photo of label'}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.secondaryButton}`}
        disabled={scanning}
        onClick={() => galleryRef.current?.click()}
      >
        Choose photo from gallery
      </button>
      <input
        ref={cameraRef}
        className={styles.addressScanInput}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a recipient address photo"
        disabled={scanning}
        onChange={handleFile}
      />
      <input
        ref={galleryRef}
        className={styles.addressScanInput}
        type="file"
        accept="image/*"
        aria-label="Choose a recipient address photo"
        disabled={scanning}
        onChange={handleFile}
      />

      {scanning && (
        <p className={styles.addressScanStatus} role="status">
          {status || 'Reading address…'}
        </p>
      )}
      {message && (
        <p className={styles.addressScanSuccess} role="status">
          {message}
        </p>
      )}
      {autoApplied && lastRecipient && (
        <button
          type="button"
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => {
            onDraftReady(lastRecipient);
            setAutoApplied(null);
            setMessage('Switched back to the scanned details. Review and edit before saving.');
          }}
        >
          Use scanned text instead of saved client
        </button>
      )}
      {error && (
        <p className={styles.addressScanError} role="alert">
          {error}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className={styles.addressScanWarnings}>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {clientMatches.length > 0 && !autoApplied && (
        <div className={styles.addressScanMatches}>
          <strong>Possible saved-client matches</strong>
          <p>Choose a match to fill the form with its saved details.</p>
          {clientMatches.map((client) => (
            <button
              key={client.id}
              type="button"
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={() => {
                onClientMatch(client);
                setAutoApplied(null);
                setMessage(
                  'Saved client details added to the draft. Review and edit the recipient fields before saving.'
                );
              }}
            >
              Use {client.name}
              {client.city ? ` — ${client.city}` : ''}
              {client.pin ? ` (${client.pin})` : ''}
            </button>
          ))}
        </div>
      )}
      {recognizedText && (
        <details className={styles.addressScanText}>
          <summary>View recognized text</summary>
          <pre>{recognizedText}</pre>
        </details>
      )}
    </div>
  );
}