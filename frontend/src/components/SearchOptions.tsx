import React from 'react';
import {
  Popover,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { SearchOptions as SearchOptionsType } from './SearchBar';

interface SearchOptionsProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  options: SearchOptionsType;
  onOptionsChange: (options: SearchOptionsType) => void;
  speakerTags?: number[];
}

const SearchOptions: React.FC<SearchOptionsProps> = ({
  anchorEl,
  open,
  onClose,
  options,
  onOptionsChange,
  speakerTags = []
}) => {
  const handleCaseSensitiveChange = (checked: boolean) => {
    onOptionsChange({
      ...options,
      caseSensitive: checked
    });
  };

  const handleWholeWordChange = (checked: boolean) => {
    onOptionsChange({
      ...options,
      wholeWord: checked
    });
  };

  const handleSpeakerFilterChange = (value: string) => {
    onOptionsChange({
      ...options,
      filterBySpeaker: value === 'all' ? null : Number(value)
    });
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          p: 2,
          minWidth: 280,
          bgcolor: 'background.paper',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} mb={2}>
        Tùy chọn tìm kiếm
      </Typography>
      
      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={options.caseSensitive}
              onChange={(e) => handleCaseSensitiveChange(e.target.checked)}
              size="small"
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2">Phân biệt chữ hoa/thường</Typography>
              <Typography variant="caption" color="text.secondary">
                "Hello" khác "hello"
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={options.wholeWord}
              onChange={(e) => handleWholeWordChange(e.target.checked)}
              size="small"
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2">Khớp từ nguyên vẹn</Typography>
              <Typography variant="caption" color="text.secondary">
                Chỉ tìm từ độc lập
              </Typography>
            </Box>
          }
        />

        {speakerTags.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            
            <FormControl fullWidth size="small">
              <InputLabel>Lọc theo người nói</InputLabel>
              <Select
                value={options.filterBySpeaker ?? 'all'}
                onChange={(e) => handleSpeakerFilterChange(String(e.target.value))}
                label="Lọc theo người nói"
              >
                <MenuItem value="all">
                  <Typography variant="body2">Tất cả người nói</Typography>
                </MenuItem>
                {speakerTags.map(tag => (
                  <MenuItem key={tag} value={String(tag)}>
                    <Typography variant="body2">Người nói {tag}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      </Stack>

      <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
        <Typography variant="caption" color="text.secondary">
          💡 Tip: Dùng Enter để nhảy giữa các kết quả
        </Typography>
      </Box>
    </Popover>
  );
};

export default SearchOptions;
