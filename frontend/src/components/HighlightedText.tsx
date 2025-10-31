import React from 'react';

interface MatchPosition {
  start: number;
  end: number;
}

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  isActive: boolean;
  matchPositions: MatchPosition[];
}

const HighlightedText: React.FC<HighlightedTextProps> = React.memo(({
  text,
  searchQuery,
  isActive,
  matchPositions
}) => {
  if (!searchQuery || matchPositions.length === 0) {
    return <>{text}</>;
  }

  const parts: JSX.Element[] = [];
  let lastIndex = 0;

  matchPositions.forEach((pos, idx) => {
    // Text before match
    if (pos.start > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>
          {text.substring(lastIndex, pos.start)}
        </span>
      );
    }

    // Highlighted match
    parts.push(
      <mark
        key={`match-${idx}`}
        style={{
          backgroundColor: isActive ? '#ffd700' : '#ffeb3b',
          color: '#000',
          fontWeight: isActive ? 700 : 500,
          padding: '2px 4px',
          borderRadius: '3px',
          transition: 'all 0.2s ease'
        }}
      >
        {text.substring(pos.start, pos.end)}
      </mark>
    );

    lastIndex = pos.end;
  });

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">{text.substring(lastIndex)}</span>
    );
  }

  return <>{parts}</>;
}, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.isActive === nextProps.isActive &&
    JSON.stringify(prevProps.matchPositions) === JSON.stringify(nextProps.matchPositions)
  );
});

HighlightedText.displayName = 'HighlightedText';

export default HighlightedText;
