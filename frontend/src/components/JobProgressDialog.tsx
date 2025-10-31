import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress,
    Stepper,
    Step,
    StepLabel,
    Alert,
    Chip,
    Stack
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useJobStatus } from '../hooks/useJobStatus';
import { JobStatusUpdate } from '../services/transcriptionSocket';

interface JobProgressDialogProps {
    open: boolean;
    jobId: string | null;
    onClose: () => void;
    onComplete?: (data: { transcription: string; segments: any[] }) => void;
}

const JobProgressDialog: React.FC<JobProgressDialogProps> = ({
    open,
    jobId,
    onClose,
    onComplete
}) => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const steps = [
        { label: 'Uploading', statuses: ['uploading'] },
        { label: 'Extracting Audio', statuses: ['extracting'] },
        { label: 'Uploading to Cloud', statuses: ['uploading_cloud', 'creating_job'] },
        { label: 'Queued', statuses: ['queued'] },
        { label: 'Transcribing', statuses: ['processing'] },
        { label: 'Complete', statuses: ['success', 'translation_complete'] }
    ];

    const jobState = useJobStatus({
        jobId: jobId || undefined,
        onStatusChange: (update: JobStatusUpdate) => {
            // Update active step based on status
            const stepIndex = steps.findIndex(step => step.statuses.includes(update.status));
            if (stepIndex !== -1) {
                setActiveStep(stepIndex);
                
                // Mark previous steps as completed
                const newCompleted = new Set<number>();
                for (let i = 0; i < stepIndex; i++) {
                    newCompleted.add(i);
                }
                setCompletedSteps(newCompleted);
            }

            // Call onComplete when transcription is done
            if (update.status === 'success' && update.transcription && update.segments) {
                if (onComplete) {
                    onComplete({
                        transcription: update.transcription,
                        segments: update.segments
                    });
                }
            }
        }
    });

    const getStatusColor = (): 'error' | 'success' | 'info' => {
        if (jobState.isFailed) return 'error';
        if (jobState.isSuccess) return 'success';
        return 'info';
    };

    const getStatusIcon = () => {
        if (jobState.isFailed) return <ErrorIcon color="error" />;
        if (jobState.isSuccess) return <CheckCircleIcon color="success" />;
        return <HourglassEmptyIcon color="info" />;
    };

    const handleClose = () => {
        if (!jobState.isProcessing) {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            disableEscapeKeyDown={jobState.isProcessing}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={2}>
                    {getStatusIcon()}
                    <Typography variant="h6">
                        {jobState.isFailed ? 'Processing Failed' : 
                         jobState.isSuccess ? 'Processing Complete' : 
                         'Processing Video'}
                    </Typography>
                    {jobState.processingTime && (
                        <Chip 
                            label={`${jobState.processingTime}s`} 
                            size="small" 
                            color="success"
                            variant="outlined"
                        />
                    )}
                </Stack>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ width: '100%', py: 2 }}>
                    {/* Stepper */}
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((step, index) => (
                            <Step key={step.label} completed={completedSteps.has(index)}>
                                <StepLabel>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Status message */}
                    {jobState.message && (
                        <Alert 
                            severity={getStatusColor()} 
                            icon={jobState.isProcessing ? <HourglassEmptyIcon /> : undefined}
                            sx={{ mb: 2 }}
                        >
                            {jobState.message}
                        </Alert>
                    )}

                    {/* Progress bar */}
                    {jobState.isProcessing && (
                        <Box sx={{ mb: 2 }}>
                            {jobState.progress !== null ? (
                                <>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={jobState.progress} 
                                        sx={{ height: 8, borderRadius: 1 }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                                        {jobState.progress}%
                                    </Typography>
                                </>
                            ) : (
                                <LinearProgress sx={{ height: 8, borderRadius: 1 }} />
                            )}
                        </Box>
                    )}

                    {/* Success preview */}
                    {jobState.isSuccess && jobState.transcription && (
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                            <Typography variant="subtitle2" color="success.dark" gutterBottom>
                                Preview:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                                maxHeight: 150, 
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {jobState.transcription.substring(0, 300)}
                                {jobState.transcription.length > 300 && '...'}
                            </Typography>
                        </Box>
                    )}

                    {/* Translation status */}
                    {jobState.status === 'translating' && (
                        <Alert severity="info" icon={<HourglassEmptyIcon />}>
                            Translation in progress... Transcription results are already available!
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                {jobState.isSuccess && (
                    <Button onClick={() => navigate('/files')} variant="contained" color="primary">
                        View Results
                    </Button>
                )}
                {!jobState.isProcessing && (
                    <Button onClick={handleClose} variant="outlined">
                        {jobState.isSuccess ? 'Close' : 'Cancel'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default JobProgressDialog;
