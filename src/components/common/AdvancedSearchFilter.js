import React, { useState, useEffect, useMemo } from 'react';
import { FilterList as FilterIcon, HistoryIcon, Save as SaveIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MUIDatePicker } from '@mui/x-date-pickers/DatePicker';

import { Accordion, AccordionDetails, AccordionSummary, Badge, Box, Button, Checkbox, Chip, Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabelItemTextItem, Paper, Select, Slider, Switch, TextField, Tooltip, Typography, toLocaleString, toString } from '@mui/material';
  ViewColumn as ViewColumnIcon

const AdvancedSearchFilter = ({
  data = [],
  onFilteredData,
  searchFields = ['name', 'email'],
  filterFields = {},
  savedFilters = [],
  onSaveFilter,
  placeholder = "Search...",
  className = "",
  enableAdvanced = true,
  enableSorting = true,
  enableGrouping = true,
  maxItems = 1000
}) => {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupBy, setGroupBy] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [customFilter, setCustomFilter] = useState('');
  
  // Performance state
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState({ total: 0, filtered: 0, time: 0 });

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Save search history
  const saveSearchHistory = (term) => {
    if (term.length > 2) {
      const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };

  // Advanced search with fuzzy matching
  const fuzzyMatch = (text, searchTerm) => {
    if (!text || !searchTerm) return false;
    
    const textLower = text.toString().toLowerCase();
    const termLower = searchTerm.toLowerCase();
    
    // Exact match
    if (textLower.includes(termLower)) return true;
    
    // Fuzzy matching algorithm
    let termIndex = 0;
    for (let i = 0; i < textLower.length && termIndex < termLower.length; i++) {
      if (textLower[i] === termLower[termIndex]) {
        termIndex++;
      }
    }
    return termIndex === termLower.length;
  };

  // Apply filters and search
  const filteredData = useMemo(() => {
    const startTime = Date.now();
    setIsSearching(true);
    
    let result = [...data];
    
    // Text search
    if (searchTerm) {
      result = result.filter(item => 
        searchFields.some(field => {
          const value = getNestedValue(item, field);
          return fuzzyMatch(value, searchTerm);
        })
      );
    }
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value.length > 0) {
        const filterConfig = filterFields[field];
        
        if (filterConfig?.type === 'multiselect') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, field);
            return Array.isArray(value) ? value.includes(itemValue) : value === itemValue;
          });
        } else if (filterConfig?.type === 'range') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, field);
            const numValue = parseFloat(itemValue);
            return numValue >= value[0] && numValue <= value[1];
          });
        } else if (filterConfig?.type === 'date') {
          result = result.filter(item => {
            const itemDate = new Date(getNestedValue(item, field));
            const filterDate = new Date(value);
            return itemDate.toDateString() === filterDate.toDateString();
          });
        } else if (filterConfig?.type === 'boolean') {
          result = result.filter(item => {
            const itemValue = getNestedValue(item, field);
            return Boolean(itemValue) === value;
          });
        }
      }
    });
    
    // Apply custom filter
    if (customFilter) {
      try {
        const filterFunction = new Function('item', `return ${customFilter}`);
        result = result.filter(filterFunction);
      } catch (error) {
        console.error('Custom filter error:', error);
      }
    }
    
    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortBy);
        const bValue = getNestedValue(b, sortBy);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Limit results for performance
    if (result.length > maxItems) {
      result = result.slice(0, maxItems);
    }
    
    const endTime = Date.now();
    setSearchStats({
      total: data.length,
      filtered: result.length,
      time: endTime - startTime
    });
    
    setIsSearching(false);
    return result;
  }, [data, searchTerm, filters, sortBy, sortOrder, customFilter, searchFields, filterFields, maxItems]);

  // Get nested object value
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Update filtered data
  useEffect(() => {
    if (onFilteredData) {
      onFilteredData(filteredData);
    }
  }, [filteredData, onFilteredData]);

  // Handle search change
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    if (value) {
      saveSearchHistory(value);
    }
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update active filters display
    updateActiveFilters(field, value);
  };

  // Update active filters for display
  const updateActiveFilters = (field, value) => {
    setActiveFilters(prev => {
      const filtered = prev.filter(f => f.field !== field);
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        filtered.push({ field, value, label: getFilterLabel(field, value) });
      }
      return filtered;
    });
  };

  // Get filter label for display
  const getFilterLabel = (field, value) => {
    const fieldConfig = filterFields[field];
    const fieldLabel = fieldConfig?.label || field;
    
    if (Array.isArray(value)) {
      return `${fieldLabel}: ${value.join(', ')}`;
    }
    return `${fieldLabel}: ${value}`;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilters({});
    setActiveFilters([]);
    setSortBy('');
    setGroupBy('');
    setCustomFilter('');
  };

  // Remove specific filter
  const removeFilter = (field) => {
    setFilters(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
    setActiveFilters(prev => prev.filter(f => f.field !== field));
  };

  // Save current filter configuration
  const saveCurrentFilter = () => {
    const filterConfig = {
      id: Date.now().toString(),
      name: `Filter ${new Date().toLocaleString()}`,
      searchTerm,
      filters,
      sortBy,
      sortOrder,
      groupBy
    };
    
    if (onSaveFilter) {
      onSaveFilter(filterConfig);
    }
  };

  // Apply saved filter
  const applySavedFilter = (savedFilter) => {
    setSearchTerm(savedFilter.searchTerm || '');
    setFilters(savedFilter.filters || {});
    setSortBy(savedFilter.sortBy || '');
    setSortOrder(savedFilter.sortOrder || 'asc');
    setGroupBy(savedFilter.groupBy || '');
  };

  // Render filter controls
  const renderFilterControl = (field, config) => {
    const { type, options, label, min, max } = config;
    
    switch (type) {
      case 'multiselect':
        return (
          <FormControl fullWidth key={field} margin="normal">
            <InputLabel>{label}</InputLabel>
            <Select
              multiple
              value={filters[field] || []}
              onChange={(e) => handleFilterChange(field, e.target.value)}
              input={<OutlinedInput label={label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={(filters[field] || []).indexOf(option.value) > -1} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
        
      case 'select':
        return (
          <FormControl fullWidth key={field} margin="normal">
            <InputLabel>{label}</InputLabel>
            <Select
              value={filters[field] || ''}
              onChange={(e) => handleFilterChange(field, e.target.value)}
              label={label}
            >
              <MenuItem value="">All</MenuItem>
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
        
      case 'range':
        return (
          <Box key={field} sx={{ mt: 2, mb: 1 }}>
            <Typography gutterBottom>{label}</Typography>
            <Slider
              value={filters[field] || [min, max]}
              onChange={(e, value) => handleFilterChange(field, value)}
              valueLabelDisplay="auto"
              min={min}
              max={max}
              marks={[
                { value: min, label: min },
                { value: max, label: max }
              ]}
            />
          </Box>
        );
        
      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns} key={field}>
            <MUIDatePicker
              label={label}
              value={filters[field] || null}
              onChange={(value) => handleFilterChange(field, value)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
          </LocalizationProvider>
        );
        
      case 'boolean':
        return (
          <FormControlLabel
            key={field}
            control={
              <Switch
                checked={filters[field] || false}
                onChange={(e) => handleFilterChange(field, e.target.checked)}
              />
            }
            label={label}
          />
        );
        
      default:
        return (
          <TextField
            key={field}
            fullWidth
            label={label}
            value={filters[field] || ''}
            onChange={(e) => handleFilterChange(field, e.target.value)}
            margin="normal"
          />
        );
    }
  };

  return (
    <Paper className={`advanced-search-filter ${className}`} sx={{ p: 2 }}>
      {/* Main search bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
            endAdornment: searchTerm && (
              <IconButton onClick={() => setSearchTerm('')} size="small">
                <ClearIcon />
              </IconButton>
            )
          }}
        />
        
        {enableAdvanced && (
          <Tooltip title="Advanced Filters">
            <IconButton onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
              <Badge badgeContent={activeFilters.length} color="primary">
                <FilterList as FilterIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Save Filter">
          <IconButton onClick={saveCurrentFilter}>
            <Save as SaveIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search history suggestions */}
      {searchHistory.length > 0 && !searchTerm && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="textSecondary">Recent searches:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {searchHistory.slice(0, 5).map((term, index) => (
              <Chip
                key={index}
                label={term}
                size="small"
                onClick={() => setSearchTerm(term)}
                icon={<HistoryIcon />}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="textSecondary">Active filters:</Typography>
            <Button size="small" onClick={clearAllFilters} startIcon={<ClearIcon />}>
              Clear All
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {activeFilters.map((filter) => (
              <Chip
                key={filter.field}
                label={filter.label}
                onDelete={() => removeFilter(filter.field)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Advanced filters accordion */}
      {enableAdvanced && (
        <Accordion expanded={isAdvancedOpen} onChange={() => setIsAdvancedOpen(!isAdvancedOpen)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Advanced Filters & Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Filter controls */}
              <Grid size={{xs:12,md:6}}>
                <Typography variant="h6" gutterBottom>Filters</Typography>
                {Object.entries(filterFields).map(([field, config]) =>
                  renderFilterControl(field, config)
                )}
              </Grid>
              
              {/* Sorting and grouping */}
              <Grid size={{xs:12,md:6}}>
                <Typography variant="h6" gutterBottom>Sorting & Grouping</Typography>
                
                {enableSorting && (
                  <>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        label="Sort By"
                      >
                        <MenuItem value="">None</MenuItem>
                        {searchFields.map(field => (
                          <MenuItem key={field} value={field}>
                            {filterFields[field]?.label || field}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Sort Order</InputLabel>
                      <Select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        label="Sort Order"
                      >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                      </Select>
                    </FormControl>
                  </>
                )}
                
                {enableGrouping && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Group By</InputLabel>
                    <Select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      label="Group By"
                    >
                      <MenuItem value="">None</MenuItem>
                      {Object.entries(filterFields)
                        .filter(([, config]) => config.groupable)
                        .map(([field, config]) => (
                          <MenuItem key={field} value={field}>
                            {config.label}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
                
                {/* Custom filter */}
                <TextField
                  fullWidth
                  label="Custom Filter (JavaScript)"
                  value={customFilter}
                  onChange={(e) => setCustomFilter(e.target.value)}
                  margin="normal"
                  placeholder="e.g., item.age > 18 && item.status === 'active'"
                  helperText="Advanced users: Write JavaScript expression"
                />
              </Grid>
            </Grid>
            
            {/* Saved filters */}
            {savedFilters.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>Saved Filters</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {savedFilters.map((filter) => (
                    <Chip
                      key={filter.id}
                      label={filter.name}
                      onClick={() => applySavedFilter(filter)}
                      icon={<BookmarkIcon />}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Search stats */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          {isSearching ? 'Searching...' : 
           `Showing ${searchStats.filtered} of ${searchStats.total} results (${searchStats.time}ms)`}
        </Typography>
        
        {searchStats.filtered >= maxItems && (
          <Typography variant="caption" color="warning.main">
            Results limited to {maxItems} items for performance
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default AdvancedSearchFilter;
