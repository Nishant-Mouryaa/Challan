import React, { useEffect, useRef, useState } from 'react';
import {
  extractScannedAddress,
  findSavedClientMatches,
} from '../lib/scannedAddress';
import styles from '../styles/challanWorkspace.module.css';

const MAX_COMPRESSED_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;

function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadImageElement(file));
  }

  return loadImageElement(file);
}

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

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The photo could not be prepared for scanning.'));
      },
      'image/jpeg',
      quality
    );
  });
}

async function prepareImage(file) {
  let image;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error('Could not open this photo. Try a JPEG, PNG, or WebP image.');
  }

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / image.width,
      MAX_IMAGE_DIMENSION / image.height
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.75, 0.64]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_COMPRESSED_IMAGE_BYTES) return blob;
    }

    throw new Error(
      'The compressed photo is still too large. Try a closer, smaller photo of just the address label.'
    );
  } finally {
    image.close?.();
  }
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary);
}

function hasRecipientDetails(recipient) {
  return Object.values(recipient || {}).some(
    (value) => typeof value === 'string' && value.trim()
  );
}

export default function ChallanAddressScanner({
  clients,
  onDraftReady,
  onClientMatch,
}) {
  const inputRef = useRef(null);
  const workerPromiseRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [clientMatches, setClientMatches] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(
    () => () => {
      if (workerPromiseRef.current) {
        workerPromiseRef.current
          .then((worker) => worker.terminate())
          .catch((workerError) => {
            console.error('Unable to stop challan OCR worker:', workerError);
          });
      }
    },
    []
  );

  const getWorker = () => {
    if (!workerPromiseRef.current) {
      workerPromiseRef.current = import('tesseract.js')
        .then(({ createWorker }) =>
          createWorker('eng', 1, {
            logger: (status) => setProgress(status),
          })
        )
        .catch((workerError) => {
          workerPromiseRef.current = null;
          throw workerError;
        });
    }

    return workerPromiseRef.current;
  };

  const scanPhoto = async (file) => {
    setError('');
    setMessage('');
    setRecognizedText('');
    setClientMatches([]);
    setProgress({ status: 'Preparing photo', progress: 0 });
    setScanning(true);
    let stage = 'Preparing photo';

    try {
      const image = await prepareImage(file);
      stage = 'Loading on-device OCR';
      const worker = await getWorker();
      stage = 'Reading photo';
      const {
        data: { text = '' },
      } = await worker.recognize(image);
      const recipient = extractScannedAddress(text);
      const matches = findSavedClientMatches(clients, recipient, text);

      setRecognizedText(text);
      setClientMatches(matches);

      if (!hasRecipientDetails(recipient)) {
        setError(
          matches.length
            ? 'The label text was read. Choose a saved-client match below or enter the recipient details manually.'
            : 'Text was read, but recipient fields could not be identified. Review the recognized text below and enter the address manually.'
        );
        return;
      }

      onDraftReady(recipient);
      setMessage(
        matches.length
          ? 'Draft filled from the scan. If a saved-client match appears below, choose it to use those saved details; otherwise review and edit the fields.'
          : 'Challan draft filled from the scan. Review and edit the recipient details below before previewing or saving.'
      );
    } catch (scanError) {
      console.error('Unable to scan challan address:', scanError);
      const detail =
        scanError instanceof Error ? scanError.message : String(scanError);
      setError(
        stage === 'Preparing photo'
          ? detail || 'This photo could not be prepared for scanning.'
          : `${stage} failed${detail ? `: ${detail}` : '.'} Check your internet connection for the initial OCR download, then try again.`
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className={styles.addressScan}>
      <div>
        <strong>Scan recipient address</strong>
        <p>
          Take a label photo or choose one from your phone. The photo is read
          on this device and is not uploaded. The challan draft remains
          editable.
        </p>
      </div>

      <button
        type="button"
        className={`${styles.button} ${styles.primaryButton}`}
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
      >
        {scanning ? 'Reading address…' : 'Open camera or choose photo'}
      </button>
      <input
        ref={inputRef}
        className={styles.addressScanInput}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take or choose a recipient address photo"
        disabled={scanning}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) scanPhoto(file);
        }}
      />

      {scanning && (
        <p className={styles.addressScanStatus} role="status">
          {progress?.status === 'recognizing text'
            ? `Reading address on this device… ${Math.round(
                (progress.progress || 0) * 100
              )}%`
            : progress?.status
              ? `Preparing on-device OCR: ${progress.status}…`
              : 'Preparing photo and reading the address…'}
        </p>
      )}
      {message && (
        <p className={styles.addressScanSuccess} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.addressScanError} role="alert">
          {error}
        </p>
      )}
      {clientMatches.length > 0 && (
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
                setMessage(
                  'Saved client details added to the draft. Review and edit the recipient fields before saving.'
                );
              }}
            >
              Use {client.name}
              {client.city ? ` — ${client.city}` : ''}
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
