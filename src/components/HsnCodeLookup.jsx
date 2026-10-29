import React, { useEffect, useMemo, useState } from 'react';
import styles from '../styles/form.module.css';

let hsnCodesRequest;

const loadHsnCodes = () => {
  if (!hsnCodesRequest) {
    hsnCodesRequest = fetch('/hsn-codes.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load HSN codes (${response.status})`);
        }
        return response.json();
      })
      .then((codes) => {
        if (
          !Array.isArray(codes) ||
          !codes.every(
            (entry) =>
              typeof entry.description === 'string' && typeof entry.code === 'string'
          )
        ) {
          throw new Error('The HSN code list has an invalid format');
        }
        return codes;
      })
      .catch((error) => {
        hsnCodesRequest = undefined;
        throw error;
      });
  }
  return hsnCodesRequest;
};

const HsnCodeLookup = ({ itemIndex, onSelect }) => {
  const [query, setQuery] = useState('');
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (normalizedQuery.length < 2 || codes) return undefined;

    let active = true;
    setLoading(true);
    setLoadError('');

    loadHsnCodes()
      .then((data) => {
        if (active) setCodes(data);
      })
      .catch((error) => {
        if (active) {
          console.error('Error loading HSN codes:', error);
          setLoadError('Unable to load HSN codes. Edit the HSN code manually or try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [codes, normalizedQuery]);

  const matches = useMemo(() => {
    if (normalizedQuery.length < 2 || !codes) return [];

    const rankedMatches = [];

    for (const entry of codes) {
      const code = entry.code.toLowerCase();
      const description = entry.description.toLowerCase();
      if (!code.includes(normalizedQuery) && !description.includes(normalizedQuery)) {
        continue;
      }

      const priority =
        code === normalizedQuery
          ? 0
          : code.startsWith(normalizedQuery)
            ? 1
            : description.startsWith(normalizedQuery)
              ? 2
              : 3;
      const position = rankedMatches.findIndex((match) => priority < match.priority);
      if (position === -1) {
        if (rankedMatches.length < 8) rankedMatches.push({ entry, priority });
      } else {
        rankedMatches.splice(position, 0, { entry, priority });
        if (rankedMatches.length > 8) rankedMatches.pop();
      }
    }

    return rankedMatches.map(({ entry }) => entry);
  }, [codes, normalizedQuery]);

  const inputId = `hsn-lookup-${itemIndex}`;
  const listId = `${inputId}-results`;

  return (
    <div className={styles.hsnLookup}>
      <label htmlFor={inputId}>Find matching HSN</label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search item or code"
        className={styles.itemInput}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
      />
      {normalizedQuery.length > 0 && normalizedQuery.length < 2 && (
        <div className={styles.hsnLookupStatus} role="status">
          Type at least 2 characters to search.
        </div>
      )}
      {loading && (
        <div className={styles.hsnLookupStatus} role="status">
          Loading HSN codes...
        </div>
      )}
      {loadError && (
        <div className={styles.hsnLookupError} role="alert">
          {loadError}
        </div>
      )}
      {codes && normalizedQuery.length >= 2 && matches.length === 0 && (
        <div className={styles.hsnLookupStatus} role="status">
          No matching HSN codes found.
        </div>
      )}
      {matches.length > 0 && (
        <ul id={listId} className={styles.hsnSuggestions} role="listbox">
          {matches.map((match, index) => (
            <li key={`${match.code}-${match.description}-${index}`} role="presentation">
              <button
                type="button"
                className={styles.hsnSuggestion}
                role="option"
                aria-selected="false"
                onClick={() => {
                  onSelect(match);
                  setQuery('');
                }}
              >
                <strong>{match.code}</strong>
                <span>{match.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HsnCodeLookup;
