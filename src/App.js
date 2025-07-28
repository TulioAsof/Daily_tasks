import React, { useState, useEffect, useCallback } from "react";
import { Container, Typography, Button, TextField, Select, MenuItem, Box, CircularProgress } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TaskList from "./components/TaskList";

// A URL base da sua API. Será diferente em produção.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/Backend';

const App = () => {
    // --- ESTADO DA APLICAÇÃO ---
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Controla o ecrã de carregamento inicial
    const [isSubmitting, setIsSubmitting] = useState(false); // Controla o estado de submissão dos formulários
    const [tasks, setTasks] = useState([]);
    const [points, setPoints] = useState(0);
    
    // Estado dos formulários de autenticação
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Estado do formulário de nova tarefa
    const [text, setText] = useState("");
    const [difficulty, setDifficulty] = useState("médio");
    const [date, setDate] = useState("");
    const [recurrence, setRecurrence] = useState("nenhuma");

    // Estado da UI
    const [tab, setTab] = useState("pendentes");
    const [focusMode, setFocusMode] = useState(false);

    // --- FUNÇÕES DA API ---

    const apiFetch = async (endpoint, options = {}) => {
        options.credentials = 'include';
        
        // Normaliza a URL para funcionar com ou sem a barra final na API_URL
        const finalUrl = `${API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

        const response = await fetch(finalUrl, options);
        const data = await response.json();

        if (!response.ok) {
            // Se a resposta não for OK, lança um erro com a mensagem da API
            throw new Error(data.message || 'Ocorreu um erro na API.');
        }
        return data;
    };

    // --- LÓGICA DE DADOS ---

    const fetchTasks = useCallback(async () => {
        if (!user) return; // Não busca tarefas se o utilizador não estiver logado
        try {
            // A resposta da API agora contém um objeto com 'tasks' e 'points'
            const data = await apiFetch('api/tasks.php');
            setTasks(data.tasks);
            setPoints(data.points); // Atualiza o estado dos pontos com o valor do backend
        } catch (error) {
            console.error("Falha ao atualizar tarefas:", error.message);
        }
    }, [user]);

    const checkLoginStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('api/user.php?action=status');
            if (data.loggedIn) {
                setUser(data.user);
                setPoints(data.points);
            }
        } catch (error) {
            // Silencioso, o utilizador simplesmente não está logado
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    useEffect(() => {
        if (user) {
            fetchTasks(); 

            const intervalId = setInterval(fetchTasks, 60000); 

            return () => clearInterval(intervalId);
        }
    }, [user, fetchTasks]);


    // --- MANIPULADORES DE EVENTOS ---

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const action = isRegistering ? 'register' : 'login';
        try {
            const data = await apiFetch(`api/user.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            
            if (isRegistering) {
                toast.success(data.message + " Por favor, faça o login.");
                setIsRegistering(false);
                setPassword("");
            } else {
                toast.success(data.message);
                setUser(data.user);
                await checkLoginStatus();
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            const data = await apiFetch('api/user.php?action=logout');
            toast.info(data.message);
            setUser(null);
            setTasks([]);
            setPoints(0);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleAddTask = async () => {
        if (!text || !date) {
            toast.error("Preencha a descrição e a data da tarefa!");
            return;
        }
        setIsSubmitting(true);
        try {
            await apiFetch('api/tasks.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, difficulty, date, recurrence }),
            });
            toast.success("Tarefa adicionada!");
            setText("");
            setDate("");
            setDifficulty("médio");
            await fetchTasks(); // Atualiza a lista de tarefas e os pontos
        } catch (error) {
            toast.error(`Erro ao adicionar tarefa: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async (taskId) => {
        try {
            const data = await apiFetch('api/tasks.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId }),
            });
            toast.success(`+${data.points_awarded} pontos!`);
            
            setPoints(prev => Number(prev) + Number(data.points_awarded));
            
            setTasks(prevTasks => prevTasks.map(t => 
                t.id === taskId ? { ...t, completed: 1, points: data.points_awarded } : t
            ));
        } catch (error) {
             toast.error(error.message);
        }
    };

    // --- RENDERIZAÇÃO ---

    if (isLoading) {
        return (
            <Container sx={{ textAlign: "center", paddingTop: "20%" }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>A carregar...</Typography>
            </Container>
        );
    }

    if (!user) {
        return (
            <Container component="main" maxWidth="xs" sx={{ padding: 2, textAlign: "center", marginTop: 8 }}>
                <Typography variant="h4">{isRegistering ? "Registar" : "Login"} - Tarefa a Dois</Typography>
                <Box component="form" onSubmit={handleAuthAction} sx={{ mt: 1 }}>
                    <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required autoFocus disabled={isSubmitting} />
                    <TextField fullWidth label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required disabled={isSubmitting} />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isRegistering ? "Registar" : "Entrar")}
                    </Button>
                    <Button variant="text" onClick={() => setIsRegistering(!isRegistering)} disabled={isSubmitting}>
                        {isRegistering ? "Já tenho conta" : "Criar nova conta"}
                    </Button>
                </Box>
                <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
            </Container>
        );
    }

    return (
        <Container sx={{ padding: 2 }} className={focusMode ? "focus-mode" : ""}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h4">Tarefa a Dois</Typography>
                <Button variant="outlined" color="error" onClick={handleLogout}>Sair</Button>
            </Box>
            <Typography variant="h6">Pontuação: {points} (Nível {Math.floor(points / 100)})</Typography>

            {!focusMode && (
                <Box sx={{ my: 2, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
                    <TextField fullWidth label="Nova tarefa" value={text} onChange={(e) => setText(e.target.value)} margin="normal" disabled={isSubmitting} />
                    <TextField fullWidth type="date" label="Data de vencimento" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} margin="normal" disabled={isSubmitting} />
                    <Select fullWidth value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={isSubmitting}>
                        <MenuItem value="fácil">Fácil (5 pts)</MenuItem>
                        <MenuItem value="médio">Médio (10 pts)</MenuItem>
                        <MenuItem value="difícil">Difícil (15 pts)</MenuItem>
                    </Select>
                    <Select fullWidth value={recurrence} onChange={(e) => setRecurrence(e.target.value)} sx={{ mt: 2 }} disabled={isSubmitting}>
                        <MenuItem value="nenhuma">Sem recorrência</MenuItem>
                        <MenuItem value="diária">Diária</MenuItem>
                        <MenuItem value="semanal">Semanal</MenuItem>
                        <MenuItem value="mensal">Mensal</MenuItem>
                    </Select>
                    <Button variant="contained" onClick={handleAddTask} sx={{ mt: 2 }} disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : "Adicionar"}
                    </Button>
                </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, my: 2, flexWrap: 'wrap' }}>
                <Button variant={tab === 'pendentes' ? 'contained' : 'outlined'} onClick={() => setTab("pendentes")}>Pendentes</Button>
                <Button variant={tab === 'concluidas' ? 'contained' : 'outlined'} onClick={() => setTab("concluidas")}>Concluídas</Button>
                <Button variant={tab === 'expiradas' ? 'contained' : 'outlined'} onClick={() => setTab("expiradas")}>Expiradas</Button>
                <Button variant="contained" color="secondary" onClick={() => setFocusMode(!focusMode)} sx={{ ml: 'auto' }}>
                    {focusMode ? "Sair do Foco" : "Modo Foco"}
                </Button>
            </Box>

            <TaskList tasks={tasks} tab={tab} handleComplete={handleComplete} />
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
        </Container>
    );
};

export default App;
