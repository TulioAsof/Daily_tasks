import React, { useState, useEffect, useCallback } from "react";
import { Container, Typography, Button, TextField, Select, MenuItem, Box } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TaskList from "./components/TaskList";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/Backend/api';

const App = () => {
    // --- ESTADO DA APLICAÇÃO ---
    const [user, setUser] = useState(null); // Guarda os dados do utilizador se estiver logado
    const [isLoading, setIsLoading] = useState(true); // Controla o ecrã de carregamento inicial
    const [tasks, setTasks] = useState([]);
    const [points, setPoints] = useState(0);
    
    // Estado dos formulários
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

    // Função para fazer fetch com tratamento de erros e credenciais
    const apiFetch = async (endpoint, options = {}) => {
        // Inclui credenciais (cookies de sessão) em todas as requisições
        options.credentials = 'include';
        
        try {
            const response = await fetch(`${API_URL}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                // Se a resposta não for OK, lança um erro com a mensagem da API
                throw new Error(data.message || 'Ocorreu um erro na API.');
            }
            return data;
        } catch (error) {
            // Mostra o erro num toast
            toast.error(error.message);
            // Propaga o erro para que possa ser tratado no local da chamada, se necessário
            throw error;
        }
    };

    // --- LÓGICA DE AUTENTICAÇÃO E DADOS ---

    const fetchTasks = useCallback(async () => {
        try {
            const fetchedTasks = await apiFetch('api/task.php');
            setTasks(fetchedTasks);
        } catch (error) {
            // O erro já é mostrado pelo apiFetch
        }
    }, []);

    // Verifica o estado do login ao carregar a app
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const data = await apiFetch('api/user.php?action=status');
                if (data.loggedIn) {
                    setUser(data.user);
                    setPoints(data.points);
                    await fetchTasks();
                }
            } catch (error) {
                // Não faz nada, o utilizador simplesmente não está logado
            } finally {
                setIsLoading(false);
            }
        };
        checkLoginStatus();
    }, [fetchTasks]);

    // --- MANIPULADORES DE EVENTOS ---

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = await apiFetch('api/user.php?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            toast.success(data.message);
            setUser(data.user);
            // Após o login, busca os pontos e tarefas
            const statusData = await apiFetch('api/user.php?action=status');
            setPoints(statusData.points);
            await fetchTasks();
        } catch (error) {
            // O erro já é tratado e exibido pelo apiFetch
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const data = await apiFetch('api/user.php?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            toast.success(data.message + " Por favor, faça o login.");
            // Após o registo, muda para a tela de login
            setIsRegistering(false);
            setPassword("");
        } catch (error) {
            // O erro já é tratado e exibido pelo apiFetch
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
            // O erro já é tratado e exibido pelo apiFetch
        }
    };

    const handleAddTask = async () => {
        if (!text || !date) {
            toast.error("Preencha todos os campos obrigatórios!");
            return;
        }
        try {
            await apiFetch('api/tasks.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, difficulty, date, recurrence }),
            });
            toast.success("Tarefa adicionada!");
            // Limpa o formulário e atualiza a lista de tarefas
            setText("");
            setDate("");
            setDifficulty("médio");
            fetchTasks();
        } catch (error) {
            // O erro já é tratado e exibido pelo apiFetch
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
            // Atualiza os pontos e a lista de tarefas
            setPoints(prev => prev + data.points_awarded);
            fetchTasks();
        } catch (error) {
             // O erro já é tratado e exibido pelo apiFetch
        }
    };

    // --- RENDERIZAÇÃO ---

    if (isLoading) {
        return (
            <Container sx={{ textAlign: "center", paddingTop: "20%" }}>
                <Typography variant="h4">A carregar...</Typography>
            </Container>
        );
    }

    if (!user) {
        return (
            <Container component="main" maxWidth="xs" sx={{ padding: 2, textAlign: "center", marginTop: 8 }}>
                <Typography variant="h4">{isRegistering ? "Registar" : "Login"} - Tarefa a Dois</Typography>
                <Box component="form" onSubmit={isRegistering ? handleRegister : handleLogin} sx={{ mt: 1 }}>
                    <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required autoFocus />
                    <TextField fullWidth label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        {isRegistering ? "Registar" : "Entrar"}
                    </Button>
                    <Button variant="text" onClick={() => setIsRegistering(!isRegistering)}>
                        {isRegistering ? "Já tenho conta" : "Criar nova conta"}
                    </Button>
                </Box>
                <ToastContainer position="bottom-right" />
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
                    <TextField fullWidth label="Nova tarefa" value={text} onChange={(e) => setText(e.target.value)} margin="normal" />
                    <TextField fullWidth type="date" label="Data de vencimento" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} margin="normal" />
                    <Select fullWidth value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <MenuItem value="fácil">Fácil (5 pts)</MenuItem>
                        <MenuItem value="médio">Médio (10 pts)</MenuItem>
                        <MenuItem value="difícil">Difícil (15 pts)</MenuItem>
                    </Select>
                    <Select fullWidth value={recurrence} onChange={(e) => setRecurrence(e.target.value)} sx={{ mt: 2 }}>
                        <MenuItem value="nenhuma">Sem recorrência</MenuItem>
                        <MenuItem value="diária">Diária</MenuItem>
                        <MenuItem value="semanal">Semanal</MenuItem>
                        <MenuItem value="mensal">Mensal</MenuItem>
                    </Select>
                    <Button variant="contained" onClick={handleAddTask} sx={{ mt: 2 }}>Adicionar</Button>
                </Box>
            )}

            <Box sx={{ display: "flex", gap: 1, my: 2 }}>
                <Button variant={tab === 'pendentes' ? 'contained' : 'outlined'} onClick={() => setTab("pendentes")}>Pendentes</Button>
                <Button variant={tab === 'concluidas' ? 'contained' : 'outlined'} onClick={() => setTab("concluidas")}>Concluídas</Button>
                <Button variant={tab === 'expiradas' ? 'contained' : 'outlined'} onClick={() => setTab("expiradas")}>Expiradas</Button>
                <Button variant="contained" color="secondary" onClick={() => setFocusMode(!focusMode)} sx={{ ml: 'auto' }}>
                    {focusMode ? "Sair do Foco" : "Modo Foco"}
                </Button>
            </Box>

            <TaskList tasks={tasks} tab={tab} handleComplete={handleComplete} />
            <ToastContainer position="bottom-right" />
        </Container>
    );
};

export default App;
