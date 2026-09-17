import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';

export default function CodeViewer({
  code,
  vulnerableLines = [],
  highlightStart = null,
  highlightEnd = null,
  activeFindingTitle = null,
  fileName = 'Contract.sol',
  maxHeight = '480px'
}) {
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (highlightStart && bodyRef.current) {
      const lineElement = bodyRef.current.querySelector(`[data-line="${highlightStart}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightStart]);

  if (!code) {
    return (
      <div className="state-box" style={{ padding: '24px' }}>
        <span className="state-desc">No source code loaded.</span>
      </div>
    );
  }

  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // safe fallback
    }
  };

  const isLineVulnerable = (lineNum) => {
    if (highlightStart && highlightEnd && lineNum >= highlightStart && lineNum <= highlightEnd) return true;
    if (highlightStart && !highlightEnd && lineNum === highlightStart) return true;
    if (vulnerableLines && vulnerableLines.includes(lineNum)) return true;
    return false;
  };

  return (
    <div className="code-viewer-container">
      <div className="code-viewer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {fileName}
          </span>
          {highlightStart && (
            <span className="badge-severity high" style={{ fontSize: '9px' }}>
              Lines {highlightStart}{highlightEnd && highlightEnd !== highlightStart ? `–${highlightEnd}` : ''} Flagged
            </span>
          )}
          {activeFindingTitle && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              ({activeFindingTitle})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-secondary btn-sm"
          style={{ padding: '2px 8px', fontSize: '10px' }}
          title="Copy source code"
        >
          {copied ? <Check size={12} color="var(--accent-teal)" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div
        className="code-viewer-body"
        ref={bodyRef}
        style={{ maxHeight }}
        tabIndex={0}
        aria-label={`Source code of ${fileName}`}
      >
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isVulnerable = isLineVulnerable(lineNum);
          const isPrimaryFlag = lineNum === highlightStart;

          return (
            <div
              key={lineNum}
              data-line={lineNum}
              className={`code-line ${isVulnerable ? 'vulnerable' : ''}`}
            >
              <span className="line-number">{lineNum}</span>
              <span className="code-content">
                {formatSyntax(line)}
                {isPrimaryFlag && (
                  <span className="finding-pill-tag">
                    <AlertCircle size={10} />
                    <span>Trigger</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Lightweight safe syntax highlighter for Solidity tokens without external heavy parser
 */
function formatSyntax(line) {
  if (!line) return ' ';

  // Check for comments
  if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
    return <span style={{ color: '#777873', fontStyle: 'italic' }}>{line}</span>;
  }

  // Keywords
  const keywords = [
    'pragma', 'solidity', 'contract', 'interface', 'library', 'is',
    'function', 'modifier', 'event', 'constructor', 'fallback', 'receive',
    'public', 'private', 'external', 'internal', 'view', 'pure', 'payable',
    'returns', 'return', 'require', 'assert', 'revert', 'emit',
    'if', 'else', 'for', 'while', 'mapping', 'struct', 'enum',
    'uint256', 'uint', 'int256', 'int', 'address', 'bool', 'bytes32', 'bytes', 'string',
    'memory', 'storage', 'calldata', 'override', 'virtual', 'constant', 'immutable'
  ];

  // Tokenize safely
  const tokens = line.split(/(\b[a-zA-Z0-9_]+\b|[^\s\w]+|\s+)/g).filter(Boolean);

  return tokens.map((token, i) => {
    if (keywords.includes(token)) {
      return (
        <span key={i} style={{ color: '#7DA3A1', fontWeight: 500 }}>
          {token}
        </span>
      );
    }
    if (/^"(.*)"$/.test(token) || /^'(.*)'$/.test(token)) {
      return (
        <span key={i} style={{ color: '#D9B382' }}>
          {token}
        </span>
      );
    }
    if (/^0x[a-fA-F0-9]+$/.test(token) || /^[0-9]+$/.test(token)) {
      return (
        <span key={i} style={{ color: '#D9B382', fontFamily: 'var(--font-mono)' }}>
          {token}
        </span>
      );
    }
    if (token === 'msg' || token === 'block' || token === 'tx' || token === 'abi') {
      return (
        <span key={i} style={{ color: '#705446', fontWeight: 600 }}>
          {token}
        </span>
      );
    }
    return token;
  });
}
