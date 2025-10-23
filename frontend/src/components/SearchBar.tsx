import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Stack,
  Tooltip,
  InputAdornment,
  Collapse
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TuneIcon from '@mui/icons-material/Tune';

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  filterBySpeaker: number | null;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  resultsCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onOptionsToggle?: () => void;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  resultsCount,
  currentIndex,
  onNext,
  onPrev,
  onOptionsToggle,
  disabled = false
}) => {
  const [query, setQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: 1.5,
        mb: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack spacing={1}>
        <TextField
          id="transcript-search"
          fullWidth
          size="small"
          placeholder="Tìm kiếm trong transcript..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <Tooltip title="Xóa (Esc)">
                  <IconButton size="small" onClick={handleClear}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default'
            }
          }}
        />

        <Collapse in={isExpanded && query.length > 0}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="caption" color="text.secondary">
              {resultsCount === 0 ? (
                'Không tìm thấy kết quả'
              ) : (
                <>
                  {resultsCount === 1 ? '1 kết quả' : `${resultsCount} kết quả`}
                  {resultsCount > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      ({currentIndex + 1}/{resultsCount})
                    </span>
                  )}
                </>
              )}
            </Typography>

            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Kết quả trước (Shift+Enter)">
                <span>
                  <IconButton
                    size="small"
                    onClick={onPrev}
                    disabled={resultsCount === 0 || currentIndex === 0}
                  >
                    <KeyboardArrowUpIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Kết quả tiếp (Enter)">
                <span>
                  <IconButton
                    size="small"
                    onClick={onNext}
                    disabled={resultsCount === 0 || currentIndex === resultsCount - 1}
                  >
                    <KeyboardArrowDownIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              {onOptionsToggle && (
                <Tooltip title="Tùy chọn tìm kiếm">
                  <IconButton size="small" onClick={onOptionsToggle}>
                    <TuneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Collapse>
      </Stack>
    </Box>
  );
};

export default SearchBar;
