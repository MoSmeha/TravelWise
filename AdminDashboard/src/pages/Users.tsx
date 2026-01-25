import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';




import { useUsersQuery } from '../hooks/useUserQueries';

export default function Users() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  // Debounce search for the query
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error: queryError } = useUsersQuery(page + 1, rowsPerPage, debouncedSearch || undefined);
  
  const users = data?.users || [];
  const total = data?.total || 0;
  const error = queryError instanceof Error ? queryError.message : (queryError ? 'Failed to load users' : '');

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Users
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage user accounts and permissions
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          backgroundColor: 'white',
          border: '1px solid #f1f5f9',
        }}
      >
        <TextField
          placeholder="Search by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
          backgroundColor: 'white',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }} align="center">
                  Itineraries
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }} align="center">
                  Posts
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{
                      '&:last-child td': { border: 0 },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={user.avatarUrl}
                          alt={user.name}
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box>
                          <Typography fontWeight={600} variant="body2">{user.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {user.isAdmin && (
                          <Chip
                            label="Admin"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600, bgcolor: '#ebf5ff', color: '#004e89' }}
                          />
                        )}
                        <Chip
                          label={user.emailVerified ? 'Verified' : 'Unverified'}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            bgcolor: user.emailVerified ? '#ecfdf5' : '#fef2f2',
                            color: user.emailVerified ? '#059669' : '#dc2626',
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={500}>{user.itineraryCount}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={500}>{user.postCount}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
