import React, { useState, useEffect, useRef, useId } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X, Check, GraduationCap } from 'lucide-react';

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 20;

export default function UniversitySearch({ value = null, onChange, label = 'Select your university' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const refocusAfterClear = useRef(false);
  const requestId = useRef(0);
  const listboxId = useId();

  // Debounced search against the trigram RPC.
  useEffect(() => {
    const term = query.trim();

    if (term.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const currentRequest = ++requestId.current;

    const timer = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc('search_universities', {
        search_term: term,
        match_threshold: MATCH_THRESHOLD,
        match_count: MATCH_COUNT,
      });

      if (currentRequest !== requestId.current) return;

      if (rpcError) {
        setError('Could not load universities. Please try again.');
        setResults([]);
      } else {
        setError(null);
        setResults(data ?? []);
      }
      setActiveIndex(-1);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (university) => {
    onChange?.(university);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const clear = () => {
    refocusAfterClear.current = true;
    onChange?.(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    if (!value && refocusAfterClear.current) {
      refocusAfterClear.current = false;
      inputRef.current?.focus();
    }
  }, [value]);

  const term = query.trim();
  const showDropdown = open && term.length >= MIN_CHARS;
  const showEmpty = showDropdown && !loading && !error && results.length === 0;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (showDropdown) {
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (!open || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      select(results[activeIndex]);
    }
  };

  return (
    <section className="panel occupation-search" ref={containerRef}>
      <label htmlFor={`${listboxId}-input`} className="occupation-question">
        {label}
      </label>
      <p className="text-muted text-sm mb-2">
        Start typing a university name &mdash; spelling doesn&apos;t have to be exact.
      </p>

      {value ? (
        <div className="occupation-selected">
          <GraduationCap size={18} className="occupation-selected-icon" />
          <div className="occupation-selected-body">
            <span className="occupation-selected-name">{value.name}</span>
            <span className="occupation-selected-meta">
              {value.country}{value.state_province ? ` · ${value.state_province}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="occupation-clear"
            onClick={clear}
            aria-label="Clear selected university"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div className="occupation-input-wrap">
          <Search size={18} className="occupation-input-icon" aria-hidden="true" />
          <input
            id={`${listboxId}-input`}
            ref={inputRef}
            type="text"
            className="occupation-input"
            placeholder="e.g. University of Sydney"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {showDropdown && (
        <ul className="occupation-dropdown" id={listboxId} role="listbox">
          {loading && <li className="occupation-status">Searching&hellip;</li>}

          {error && <li className="occupation-status occupation-error">{error}</li>}

          {showEmpty && (
            <li className="occupation-status">
              No university matches &ldquo;{term}&rdquo;.
            </li>
          )}

          {!loading &&
            !error &&
            results.map((uni, index) => (
              <li key={uni.id} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`occupation-option ${index === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(uni)}
                >
                  <span className="occupation-option-name">{uni.name}</span>
                  <span className="occupation-option-meta">
                    {uni.country}{uni.state_province ? ` · ${uni.state_province}` : ''}
                  </span>
                  {index === activeIndex && (
                    <Check size={16} className="occupation-option-check" />
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
