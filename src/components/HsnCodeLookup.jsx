import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import s from '../styles/invoiceWorkspace.module.css';

let hsnCodesRequest;

const loadHsnCodes = () => {
  if (!hsnCodesRequest) {
    hsnCodesRequest = fetch('/hsn-codes.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load HSN codes (${response.status})`
          );
        }

        return response.json();
      })
      .then((codes) => {
        if (
          !Array.isArray(codes) ||
          !codes.every(
            (entry) =>
              typeof entry?.description === 'string' &&
              typeof entry?.code === 'string'
          )
        ) {
          throw new Error('Invalid HSN code list format.');
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

const HsnCodeLookup = ({
  itemIndex,
  onSelect,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();

  const inputId = `hsn-lookup-${itemIndex}`;
  const listId = `${inputId}-results`;
  const statusId = `${inputId}-status`;

  const shouldLoad =
    open && normalizedQuery.length >= 2 && !codes;

  useEffect(() => {
    if (!shouldLoad) return undefined;

    let active = true;

    setLoading(true);
    setError('');

    loadHsnCodes()
      .then((data) => {
        if (active) {
          setCodes(data);
        }
      })
      .catch((loadError) => {
        if (active) {
          console.error('HSN lookup failed:', loadError);

          setError(
            'Could not load suggestions. Enter the HSN code manually or retry.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [shouldLoad, retryCount]);

  const matches = useMemo(() => {
    if (!codes || normalizedQuery.length < 2) return [];

    const ranked = [];

    for (const entry of codes) {
      const code = entry.code.toLowerCase();
      const description = entry.description.toLowerCase();

      if (
        !code.includes(normalizedQuery) &&
        !description.includes(normalizedQuery)
      ) {
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

      const insertAt = ranked.findIndex(
        (match) => priority < match.priority
      );

      if (insertAt === -1) {
        if (ranked.length < 8) {
          ranked.push({ entry, priority });
        }
      } else {
        ranked.splice(insertAt, 0, { entry, priority });

        if (ranked.length > 8) {
          ranked.pop();
        }
      }
    }

    return ranked.map(({ entry }) => entry);
  }, [codes, normalizedQuery]);

  const showResults =
    open && !disabled && matches.length > 0;

  const chooseMatch = (match) => {
    onSelect(match);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Let Escape close suggestions before closing a parent modal.
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      }

      return;
    }

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault();
      setOpen(true);

      if (!matches.length) return;

      setActiveIndex((previous) => {
        if (event.key === 'ArrowDown') {
          return previous < 0
            ? 0
            : (previous + 1) % matches.length;
        }

        return previous <= 0
          ? matches.length - 1
          : previous - 1;
      });

      return;
    }

    if (
      event.key === 'Enter' &&
      showResults &&
      activeIndex >= 0 &&
      matches[activeIndex]
    ) {
      event.preventDefault();
      chooseMatch(matches[activeIndex]);
    }
  };

  return (
    <div className={s.hsnLookup}>
      <label htmlFor={inputId}>Find matching HSN</label>

      <input
        id={inputId}
        type="text"
        value={query}
        disabled={disabled}
        placeholder="Search product or HSN code"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={showResults}
        aria-controls={showResults ? listId : undefined}
        aria-describedby={statusId}
        aria-activedescendant={
          showResults &&
          activeIndex >= 0 &&
          matches[activeIndex]
            ? `${listId}-${activeIndex}`
            : undefined
        }
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />

      <div
        id={statusId}
        className={s.lookupStatus}
        role="status"
        aria-live="polite"
      >
        {open && normalizedQuery.length === 1 && (
          <span>Type at least two characters.</span>
        )}

        {open &&
          normalizedQuery.length >= 2 &&
          loading &&
          !codes && <span>Loading HSN codes…</span>}

        {open && error && !codes && (
          <span className={s.lookupError}>
            {error}{' '}

            <button
              type="button"
              className={s.inlineButton}
              disabled={loading}
              onClick={() => {
                setOpen(true);
                setRetryCount((previous) => previous + 1);
              }}
            >
              Retry
            </button>
          </span>
        )}

        {open &&
          codes &&
          normalizedQuery.length >= 2 &&
          !matches.length && (
            <span>
              No matches found. You can enter the code manually.
            </span>
          )}
      </div>

      {showResults && (
        <ul
          id={listId}
          className={s.hsnSuggestions}
          role="listbox"
          aria-label="Matching HSN codes"
        >
          {matches.map((match, index) => (
            <li
              id={`${listId}-${index}`}
              key={`${match.code}-${match.description}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              className={`${s.hsnSuggestion} ${
                activeIndex === index
                  ? s.hsnSuggestionActive
                  : ''
              }`}
              onMouseDown={(event) => {
                // Keep focus on the combobox until selection completes.
                event.preventDefault();
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseMatch(match)}
            >
              <strong>{match.code}</strong>
              <span>{match.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HsnCodeLookup;