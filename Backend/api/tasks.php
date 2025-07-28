<?php
// --- MANIPULADOR DE ERROS GLOBAL ---
// Este bloco irá capturar QUALQUER erro, aviso ou falha no PHP e formatá-lo como JSON.
// Isto garante que o frontend nunca receba uma resposta HTML inválida.
function shutdownHandler() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR])) {
        // Se um erro fatal ocorreu, limpa qualquer saída parcial
        if (ob_get_length()) {
            ob_clean();
        }
        
        // Garante que os cabeçalhos corretos são enviados
        header("Access-Control-Allow-Origin: http://localhost:3000");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json; charset=UTF-8");
        http_response_code(500); // Internal Server Error

        echo json_encode([
            'message' => 'Ocorreu um erro fatal no servidor que não pôde ser recuperado.',
            'error_details' => [
                'type'    => $error['type'],
                'message' => $error['message'],
                'file'    => $error['file'],
                'line'    => $error['line']
            ]
        ]);
    }
}
register_shutdown_function('shutdownHandler');
ob_start(); // Inicia o buffer de saída para podermos limpá-lo em caso de erro

// Ativa a exibição de todos os erros
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CABEÇALHOS CORS ---
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Resposta ao pedido pre-flight OPTIONS do navegador
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- INÍCIO DA LÓGICA DA APLICAÇÃO ---

try {
    include_once '../core/auth.php';
    require_login();

    $user_id = get_current_user_id();

    include_once '../config/database.php';

    $database = new Database();
    $db = $database->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            $query = "SELECT id, text, difficulty, date, recurrence, completed, expired, points FROM tasks WHERE user_id = :user_id ORDER BY created_at DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($tasks as &$task) {
                $task['completed'] = (bool)$task['completed'];
                $task['expired'] = (bool)$task['expired'];
                $task['points'] = (int)$task['points'];
            }

            http_response_code(200);
            echo json_encode($tasks);
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"));
            
            if (empty($data->text) || empty($data->difficulty) || empty($data->date)) {
                throw new InvalidArgumentException('Dados incompletos para criar a tarefa.');
            }

            $query = "INSERT INTO tasks (user_id, text, difficulty, date, recurrence) VALUES (:user_id, :text, :difficulty, :date, :recurrence)";
            $stmt = $db->prepare($query);
            
            $text = htmlspecialchars(strip_tags($data->text));
            
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':text', $text);
            $stmt->bindParam(':difficulty', $data->difficulty);
            $stmt->bindParam(':date', $data->date);
            $stmt->bindParam(':recurrence', $data->recurrence ?? 'nenhuma');

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(['message' => 'Tarefa criada com sucesso.']);
            } else {
                throw new Exception('Não foi possível executar a query de inserção.');
            }
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"));

            if (empty($data->id)) {
                throw new InvalidArgumentException('ID da tarefa não fornecido.');
            }
            
            $task_id = $data->id;

            $query = "SELECT difficulty FROM tasks WHERE id = :id AND user_id = :user_id AND completed = 0 AND expired = 0";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $task_id);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();

            if ($stmt->rowCount() == 1) {
                $task = $stmt->fetch(PDO::FETCH_ASSOC);
                $reward = ['fácil' => 5, 'médio' => 10, 'difícil' => 15][$task['difficulty']];
                
                $update_query = "UPDATE tasks SET completed = 1, points = :points WHERE id = :id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(':points', $reward);
                $update_stmt->bindParam(':id', $task_id);
                
                if ($update_stmt->execute()) {
                    http_response_code(200);
                    echo json_encode(['message' => 'Tarefa completada!', 'points_awarded' => $reward]);
                } else {
                    throw new Exception('Não foi possível executar a query de atualização.');
                }
            } else {
                http_response_code(404);
                echo json_encode(['message' => 'Tarefa não encontrada ou já foi finalizada.']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['message' => "Método {$method} não permitido neste endpoint."]);
            break;
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400); // Bad Request
    echo json_encode(['message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Erro na base de dados.', 'error' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Ocorreu um erro interno no servidor.', 'error' => $e->getMessage()]);
}

// Limpa e envia o buffer de saída
ob_end_flush();
?>
