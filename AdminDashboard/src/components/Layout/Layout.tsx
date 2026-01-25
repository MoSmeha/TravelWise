import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  AppBar,
  Toolbar,
  CssBaseline,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import FlightIcon from '@mui/icons-material/Flight';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 88;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Users', icon: <PeopleIcon />, path: '/users' },
  { text: 'Itineraries', icon: <FlightIcon />, path: '/itineraries' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [open, setOpen] = React.useState(true);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px)`,
          ml: `${open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px`,
          transition: 'width 0.2s ease-in-out, margin 0.2s ease-in-out',
          bgcolor: 'white',
          boxShadow: 'none',
          borderBottom: '1px solid #f1f5f9',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            {/* Page Title can go here if needed, or left empty for simple look */}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                {user?.name || 'Admin User'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || 'admin@travelwise.com'}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar
                alt={user?.name || 'Admin'}
                src={user?.avatarUrl}
                sx={{ width: 40, height: 40, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  mt: 1.5,
                  minWidth: 180,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #f1f5f9',
                },
              }}
            >
              <MenuItem onClick={handleLogout} sx={{ gap: 1.5 }}>
                <LogoutIcon fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
            transition: 'width 0.2s ease-in-out',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            background: 'white',
            color: 'text.primary',
            borderRight: '1px solid #f1f5f9',
          },
        }}
      >
        <Box
          sx={{
            minHeight: 64, // Match Toolbar height
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            px: 2.5,
            borderBottom: '1px solid #f1f5f9',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#004e89', // Use primary color bg for logo container
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              mr: open ? 2 : 0,
              transition: 'margin 0.2s ease-in-out',
            }}
          >
           <img
              src="https://res.cloudinary.com/dgsxk7nf5/image/upload/v1769224390/TravelWise-Logo_ogc2ai.png"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{
              opacity: open ? 1 : 0,
              display: open ? 'block' : 'none',
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            TravelWise
          </Typography>
          
          {open && (
             <IconButton onClick={() => setOpen(false)} size="small" sx={{ ml: 'auto' }}>
               <MenuOpenIcon
                 sx={{
                   fontSize: 24,
                   color: 'text.secondary',
                 }}
               />
             </IconButton>
           )}
        </Box>

        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            const isDashboard = item.path === '/';
            // Simple logic to highlight active route, including exact match for root
            const active = isDashboard 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

             return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1, display: 'block' }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    borderRadius: 2,
                    backgroundColor: active ? '#004e89' : 'transparent',
                    color: active ? 'white' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: active ? '#003e6b' : '#f8fafc',
                      color: active ? 'white' : 'text.primary',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: active ? 'white' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      opacity: open ? 1 : 0,
                      display: open ? 'block' : 'none',
                    }}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        {/* Toggle button for collapsed state */}
        {!open && (
           <Box sx={{ mt: 'auto', p: 2, display: 'flex', justifyContent: 'center' }}>
             <IconButton onClick={() => setOpen(true)} size="small">
                <MenuOpenIcon sx={{ fontSize: 24, color: 'primary.main', transform: 'rotate(180deg)' }} />
             </IconButton>
           </Box>
        )}
      </Drawer>


        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 4,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>

    </Box>
  );
}
