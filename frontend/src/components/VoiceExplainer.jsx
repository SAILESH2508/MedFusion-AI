import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { api } from '../services/api';

const LOCALE_MAP = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
};

const LANG_LABELS = {
  en: 'EN',
  ta: 'தமிழ்',
  hi: 'हिंदी',
};

function VoiceExplainer({ text, label }) {
  const [language, setLanguage] = useState('en');
  const [displayText, setDisplayText] = useState(text || '');
  const [translating, setTranslating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const originalTextRef = useRef(text || '');

  // Keep originalTextRef in sync if the text prop changes
  useEffect(() => {
    originalTextRef.current = text || '';
    if (language === 'en') {
      // English: just update display text directly
      setDisplayText(text || '');
    } else {
      // Non-English: re-translate so the new result text is shown in the selected language
      if (!text) {
        setDisplayText('');
        return;
      }
      setTranslating(true);
      api
        .post('/ai/explain/', { text: text, language })
        .then((res) => {
          setDisplayText(res.data.explanation || text);
        })
        .catch(() => {
          setDisplayText(text);
        })
        .finally(() => setTranslating(false));
    }
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSpeechSupport = typeof window !== 'undefined' && !!window.speechSynthesis;

  const handleLanguageChange = async (lang) => {
    if (lang === language) return;

    // Stop any ongoing speech
    if (speaking && hasSpeechSupport) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

    setLanguage(lang);

    if (lang === 'en') {
      setDisplayText(originalTextRef.current);
      return;
    }

    // Translate via backend
    setTranslating(true);
    try {
      const response = await api.post('/ai/explain/', {
        text: originalTextRef.current,
        language: lang,
      });
      setDisplayText(response.data.explanation || originalTextRef.current);
    } catch (err) {
      // On error, keep original text
      setDisplayText(originalTextRef.current);
    } finally {
      setTranslating(false);
    }
  };

  const handleListen = () => {
    if (!hasSpeechSupport) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(displayText);
    utterance.lang = LOCALE_MAP[language] || 'en-IN';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasSpeechSupport) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!text) return null;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px',
        marginTop: '12px',
      }}
    >
      {/* Header row: label + language buttons */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <span
          className="text-secondary font-monospace text-uppercase"
          style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}
        >
          {label ? `🔊 ${label}` : '🔊 Voice'}
        </span>

        {/* Language selector */}
        <div className="d-flex gap-1">
          {Object.entries(LANG_LABELS).map(([code, labelText]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              disabled={translating}
              aria-label={`Switch to ${code === 'en' ? 'English' : code === 'ta' ? 'Tamil' : 'Hindi'}`}
              aria-pressed={language === code}
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                border: language === code
                  ? '1.5px solid var(--theme-accent, #00f5d4)'
                  : '1.5px solid rgba(255,255,255,0.15)',
                borderRadius: '5px',
                background: language === code
                  ? 'rgba(0,245,212,0.10)'
                  : 'rgba(255,255,255,0.04)',
                color: language === code ? 'var(--theme-accent, #00f5d4)' : 'rgba(255,255,255,0.55)',
                cursor: translating ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s ease',
                width: 'auto',
              }}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      {/* Translated / original text display */}
      {translating ? (
        <div
          className="text-secondary font-monospace"
          style={{ fontSize: '0.82rem', lineHeight: '1.5', padding: '4px 0' }}
        >
          <span className="animate-pulse">Translating…</span>
        </div>
      ) : (
        <p
          className="text-secondary font-monospace m-0"
          style={{ fontSize: '0.82rem', lineHeight: '1.55' }}
        >
          {displayText}
        </p>
      )}

      {/* Listen / Stop button */}
      <div className="d-flex align-items-center gap-2 mt-2">
        {!hasSpeechSupport ? (
          <span
            className="text-secondary font-monospace"
            style={{ fontSize: '0.72rem', opacity: 0.7 }}
          >
            Voice not supported in this browser.
          </span>
        ) : (
          <button
            onClick={handleListen}
            disabled={translating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '6px',
              background: speaking
                ? 'rgba(255,100,100,0.12)'
                : 'rgba(255,255,255,0.05)',
              color: speaking ? '#f87171' : 'rgba(255,255,255,0.7)',
              cursor: translating ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              width: 'auto',
            }}
          >
            {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {speaking ? 'Stop' : 'Listen'}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <p
        className="text-secondary font-monospace m-0 mt-2"
        style={{ fontSize: '0.65rem', opacity: 0.55, lineHeight: '1.4' }}
      >
        Translation powered by Gemini AI. Medical values and medication names are preserved.
      </p>
    </div>
  );
}

export default VoiceExplainer;
