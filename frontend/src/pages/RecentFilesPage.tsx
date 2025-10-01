import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Paper, Typography, Button, Stack, CircularProgress, Alert,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Chip, IconButton, Pagination,
    Menu, MenuItem, ListItemIcon, Divider, Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import DescriptionIcon from '@mui/icons-material/Description';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import SearchIcon from '@mui/icons-material/Search';



import {
    deleteFileApi, getRecentFilesApi, renameJobApi, 
    retryJobApi
} from '../services/fileApi';
import { RecentFile, JobStatus, JobDetail } from '../types/fileTypes';



const formatBytes = (bytes: number | null, decimals = 2): string => {

    if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
    if (isNaN(bytes) || !isFinite(bytes)) return '-';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i >= sizes.length) return parseFloat((bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)) + ' ' + sizes[sizes.length - 1];
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
const formatDuration = (seconds: number | null): string => {

    if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds)) return '-';
    const value = Math.round(seconds);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    const parts = [];
    if (h > 0) parts.push(h.toString().padStart(2, '0'));
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
};
const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return '-';
    try { return new Date(timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }); } catch { return timestamp; }
};


const RecentFilesPage: React.FC = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<RecentFile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');


    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [openedMenuFile, setOpenedMenuFile] = useState<null | RecentFile>(null);
    const isMenuOpen = Boolean(menuAnchorEl);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [renamingFile, setRenamingFile] = useState<JobDetail | null>(null);
    const [newName, setNewName] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);
    const [renameError, setRenameError] = useState<string | null>(null);



    const fetchFiles = useCallback(async (currentPage: number, search: string = '') => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getRecentFilesApi(currentPage, 10, search);
            if (response.success && response.data) {
                setFiles(response.data.files);
                setTotalPages(response.data.totalPages || 1);
                if (currentPage > (response.data.totalPages || 1)) {
                    setPage(Math.max(1, response.data.totalPages || 1));
                }
            } else {
                setError(response.message || "Could not load files.");
                setFiles([]); setTotalPages(1);
            }
        } catch (err: any) {
            setError(err.message || "Error fetching files.");
            setFiles([]); setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    }, []);


    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== debouncedSearchTerm) {
                setDebouncedSearchTerm(searchTerm);
                setPage(1);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, debouncedSearchTerm]);

    useEffect(() => {
        fetchFiles(page, debouncedSearchTerm);
    }, [page, debouncedSearchTerm, fetchFiles]);



    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };



    const getStatusChipColor = (status: JobStatus): "default" | "warning" | "success" | "error" | "info" => {
        switch (status) {
            case 'success': return 'success'; case 'waiting': return 'warning'; case 'processing': return 'info';
            case 'failed': return 'error'; default: return 'default';
        }
    };


    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, file: RecentFile) => {
        setMenuAnchorEl(event.currentTarget);
        setOpenedMenuFile(file);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setOpenedMenuFile(null);
    };




    const handleOpenTranscript = () => {
        if (!openedMenuFile) return;
        console.log("Open Transcript for:", openedMenuFile._id || openedMenuFile.id);

        navigate(`/transcript/${openedMenuFile._id || openedMenuFile.id}`);
        handleMenuClose();
    };

    const handleRenameFile = () => {
        if (!openedMenuFile) return;
        console.log("Open Rename Dialog for:", openedMenuFile._id);
        setRenamingFile(openedMenuFile);
        setNewName(openedMenuFile.originalName || openedMenuFile.fileName);
        setRenameError(null);
        setIsRenameDialogOpen(true);
        handleMenuClose();
    };

    const handleRenameDialogClose = () => {
        setIsRenameDialogOpen(false);
        setRenamingFile(null);
        setNewName('');
        setRenameError(null);
    };

    const handleRenameSave = async () => {
        if (!renamingFile || !newName.trim()) {
            setRenameError("New name cannot be empty.");
            return;
        }
        const jobId = renamingFile._id;
        if (!jobId) {
            setRenameError("Cannot rename file without a valid ID.");
            return;
        }

        setRenameLoading(true);
        setRenameError(null);
        try {
            const response = await renameJobApi(jobId, newName.trim());
            if (response.success) {
                handleRenameDialogClose();
                await fetchFiles(page);
            } else {
                setRenameError(response.message || "Failed to rename file.");
            }
        } catch (err: any) {
            setRenameError(err.message || "An error occurred during renaming.");
        } finally {
            setRenameLoading(false);
        }
    };



    const handleDeleteFile = async () => {
        if (!openedMenuFile) return;
        const fileToDelete = openedMenuFile;
        const jobId = fileToDelete._id;
        handleMenuClose();

        if (!jobId) {
            setError("Cannot delete file without a valid ID.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete "${fileToDelete.originalName || fileToDelete.fileName}"? This action cannot be undone.`)) {
            console.log("Deleting File ID:", jobId);
            setError(null);

            try {

                const response = await deleteFileApi(jobId);
                if (response.success) {
                    console.log("Delete successful");
                    await fetchFiles(page);
                } else {
                    setError(response.message || 'Delete failed.');
                }
            } catch (deleteError: any) {
                console.error("Delete Error:", deleteError);
                setError(`Delete failed: ${deleteError.message}`);
            } finally {

            }
        }
    };


    const handleRetry = async () => {
        if (!openedMenuFile || openedMenuFile.status !== 'failed') return;
        const fileToRetry = openedMenuFile;
        const jobId = fileToRetry._id;
        handleMenuClose();

        if (!jobId) {
            setError("Cannot retry job without a valid ID.");
            return;
        }

        console.log("Retrying Job ID:", jobId);
        setError(null);

        try {

            const response = await retryJobApi(jobId);
            if (response.success) {
                console.log("Retry request sent successfully");


                await fetchFiles(page);
            } else {
                setError(response.message || 'Retry request failed.');
            }
        } catch (retryError: any) {
            console.error("Retry Error:", retryError);
            setError(`Retry failed: ${retryError.message}`);
        } finally {

        }
    };



    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ m: 2, color: 'text.secondary', alignSelf: 'flex-start' }}> Back to Home </Button>
            <Container maxWidth="lg" sx={{ mt: 2, mb: 4, flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}> Recent Files </Typography>
                    <TextField
                        label="Search by File Name"
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ mb: 3 }}
                        InputProps={{
                            startAdornment: (<SearchIcon sx={{ color: 'action.active', mr: 1 }} />),
                        }}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/')} > New Translation </Button>
                </Stack>

                {isLoading && files.length === 0 && <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>}
                {error && !isLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {!error && (
                    <Paper elevation={3}>
                        <TableContainer>
                            <Table sx={{ minWidth: 650 }}>
                                <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}>
                                    <TableRow>
                                        <TableCell>File Name</TableCell> <TableCell align="center">Status</TableCell> <TableCell align="right">File Size</TableCell>
                                        <TableCell align="right">Duration</TableCell> <TableCell align="right">Create Time</TableCell> <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading && files.length > 0 && (<TableRow><TableCell colSpan={6} align="center"><CircularProgress size={20} /></TableCell></TableRow>)}
                                    {!isLoading && files.length === 0 && (<TableRow><TableCell colSpan={6} align="center">No recent files found.</TableCell></TableRow>)}
                                    {files.map((file) => (
                                        <TableRow key={file._id || file.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.04)' } }} >
                                            <TableCell component="th" scope="row" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}> {file.originalName || file.fileName} </TableCell>
                                            <TableCell align="center"> <Chip label={file.status} color={getStatusChipColor(file.status)} size="small" /> </TableCell>
                                            <TableCell align="right">{formatBytes(file.fileSize)}</TableCell>
                                            <TableCell align="right">{formatDuration(file.duration)}</TableCell>
                                            <TableCell align="right">{formatTimestamp(file.createdAt || file.createTime)}</TableCell>
                                            {}
                                            <TableCell align="center">
                                                <IconButton
                                                    aria-label={`actions for ${file.fileName}`}
                                                    id={`action-button-${file._id || file.id}`}
                                                    aria-controls={isMenuOpen && openedMenuFile?.id === file.id ? `action-menu-${file.id}` : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={isMenuOpen && openedMenuFile?.id === file.id ? 'true' : undefined}
                                                    size="small"

                                                    onClick={(event) => handleMenuOpen(event, file)}
                                                >
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                            {}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {totalPages > 1 && (<Stack spacing={2} sx={{ p: 2, alignItems: 'center' }}> <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" /> </Stack>)}
                    </Paper>
                )}
            </Container>

            {}
            {}
            <Menu
                id={`action-menu-${openedMenuFile?._id || openedMenuFile?.id}`}
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                MenuListProps={{ 'aria-labelledby': `action-button-${openedMenuFile?._id || openedMenuFile?.id}` }}
                PaperProps={{ sx: { bgcolor: '#3c3f58', color: 'text.primary', boxShadow: 3 } }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                {}
                {openedMenuFile && [
                    <MenuItem key="open" onClick={handleOpenTranscript} disabled={openedMenuFile.status !== 'success'}>
                        <ListItemIcon> <DescriptionIcon fontSize="small" /> </ListItemIcon> Open Transcript
                    </MenuItem>,
                    <MenuItem key="rename" onClick={handleRenameFile}>
                        <ListItemIcon> <DriveFileRenameOutlineIcon fontSize="small" /> </ListItemIcon> Rename File
                    </MenuItem>,
                    <MenuItem key="delete" onClick={handleDeleteFile} sx={{ color: 'error.light' }}>
                        <ListItemIcon sx={{ color: 'error.light' }}> <DeleteOutlineIcon fontSize="small" /> </ListItemIcon> Delete File
                    </MenuItem>,
                    <Divider key="divider" sx={{ my: 0.5, bgcolor: 'rgba(255, 255, 255, 0.12)' }} />,
                    <MenuItem key="retry" onClick={handleRetry} disabled={openedMenuFile.status !== 'failed'}>
                        <ListItemIcon> <ReplayIcon fontSize="small" /> </ListItemIcon> Retry
                    </MenuItem>
                ]}
            </Menu>

            {}
            {}
            <Dialog
                open={isRenameDialogOpen}
                onClose={handleRenameDialogClose}
                aria-labelledby="rename-dialog-title"
                disableEscapeKeyDown={renameLoading}
            >
                <DialogTitle id="rename-dialog-title">Rename File</DialogTitle>
                <DialogContent>
                    {}
                    {renamingFile && (
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Current name: {renamingFile.originalName || renamingFile.fileName}
                        </Typography>
                    )}

                    {}
                    <TextField
                        autoFocus
                        margin="dense"
                        id="new-file-name"
                        label="New File Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        error={!!renameError}
                        helperText={renameError}
                        disabled={renameLoading}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRenameDialogClose} disabled={renameLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleRenameSave} disabled={renameLoading}>
                        {}
                        {renameLoading ? <CircularProgress size={20} /> : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
            {}
        </Box>
    );
};

export default RecentFilesPage;