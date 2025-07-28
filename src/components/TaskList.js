import React from 'react';
import { Box, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const TaskList = ({ tasks, tab, handleComplete }) => {
    
    const getDifficultyChipColor = (difficulty) => {
        switch (difficulty) {
            case 'fácil': return { backgroundColor: '#e8f5e9', color: '#2e7d32' }; // Verde
            case 'médio': return { backgroundColor: '#fff3e0', color: '#f57c00' }; // Laranja
            case 'difícil': return { backgroundColor: '#ffebee', color: '#d32f2f' }; // Vermelho
            default: return { backgroundColor: '#f5f5f5', color: '#424242' };
        }
    };

    const filteredTasks = tasks.filter(task => {
        switch (tab) {
            case 'pendentes':
                return task.completed == 0 && task.expired == 0;
            case 'concluidas':
                return task.completed == 1;
            case 'expiradas':
                return task.expired == 1;
            default:
                return true;
        }
    });

    if (!tasks || tasks.length === 0) {
        return (
             <Paper sx={{ textAlign: 'center', padding: 4, mt: 2 }}>
                <Typography color="text.secondary">Comece por adicionar a sua primeira tarefa!</Typography>
            </Paper>
        );
    }
    
    if (filteredTasks.length === 0) {
        return (
            <Paper sx={{ textAlign: 'center', padding: 4, mt: 2 }}>
                <Typography color="text.secondary">Nenhuma tarefa encontrada nesta secção.</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredTasks.map(task => (
                <Paper key={task.id} elevation={2} sx={{ display: 'flex', alignItems: 'center', p: 2, transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 6 } }}>
                    {tab === 'pendentes' && (
                        <Tooltip title="Completar Tarefa">
                            <IconButton color="primary" onClick={() => handleComplete(task.id)}>
                                <CheckCircleOutlineIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {tab === 'concluidas' && (
                         <CheckCircleIcon color="success" sx={{ mr: 1.5 }} />
                    )}
                     {tab === 'expiradas' && (
                         <ErrorIcon color="error" sx={{ mr: 1.5 }} />
                    )}

                    <Box sx={{ flexGrow: 1, ml: 1 }}>
                        <Typography variant="body1" sx={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.text}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {/* CORREÇÃO: Verifica se a data existe antes de a formatar */}
                                Vencimento: {task.date ? new Date(task.date.replace(/-/g, '/')).toLocaleDateString() : 'Sem data'}
                            </Typography>
                            <Box component="span" sx={{
                                ...getDifficultyChipColor(task.difficulty),
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                {task.difficulty}
                            </Box>
                        </Box>
                    </Box>

                    {task.points != 0 && (
                        <Typography 
                            variant="h6" 
                            sx={{ fontWeight: 'bold', color: task.points > 0 ? 'success.main' : 'error.main' }}
                        >
                            {task.points > 0 ? `+${task.points}` : task.points}
                        </Typography>
                    )}
                </Paper>
            ))}
        </Box>
    );
};

export default TaskList;
