<?php
// Ativa a exibição de erros para depuração (pode remover em produção)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CABEÇALHOS CORS ---
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Resposta ao pedido pre-flight OPTIONS do navegador
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- INÍCIO DA DEPURAÇÃO ---
// INSTRUÇÕES: Descomente (remova o //) de um bloco de CADA VEZ, salve e teste.
// Se vir a mensagem de 'debug_message' na resposta do separador "Network",
// significa que o script chegou até ali. Se continuar a receber 'net::ERR_FAILED',
// o erro está entre o ponto anterior e o atual.

// echo json_encode(['debug_message' => 'Ponto 1: Script iniciado.']); exit();

session_start();
// echo json_encode(['debug_message' => 'Ponto 2: Sessão iniciada.']); exit();

// Se o erro acontecer aqui, verifique o caminho e se o ficheiro 'database.php' não tem erros.
include_once '../config/database.php';
// echo json_encode(['debug_message' => 'Ponto 3: Ficheiro da base de dados incluído.']); exit();

// Se o erro acontecer aqui, o nome da classe 'Database' pode estar errado no ficheiro database.php.
$database = new Database();
// echo json_encode(['debug_message' => 'Ponto 4: Objeto Database instanciado.']); exit();

// Se o erro acontecer aqui, as suas credenciais da base de dados estão erradas
// ou a extensão PDO não está ativa no XAMPP.
$db = $database->getConnection();
// echo json_encode(['debug_message' => 'Ponto 5: Conexão com a BD obtida.']); exit();

// --- FIM DA DEPURAÇÃO ---

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

switch ($action) {

    case 'register':
        if ($method !== 'POST') {
            http_response_code(405); // Method Not Allowed
            echo json_encode(['message' => 'Método não permitido para registo.']);
            exit;
        }
        
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->email) || empty($data->password)) {
            http_response_code(400); // Bad Request
            echo json_encode(['message' => 'Dados incompletos.']);
            exit;
        }

        $query = "SELECT id FROM users WHERE email = :email";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email', $data->email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            http_response_code(409); // Conflict
            echo json_encode(['message' => 'Email já registado.']);
        } else {
            $query = "INSERT INTO users (email, password) VALUES (:email, :password)";
            $stmt = $db->prepare($query);
            
            $password_hash = password_hash($data->password, PASSWORD_BCRYPT);

            $stmt->bindParam(':email', $data->email);
            $stmt->bindParam(':password', $password_hash);

            if ($stmt->execute()) {
                http_response_code(201); // Created
                echo json_encode(['message' => 'Utilizador registado com sucesso.']);
            } else {
                http_response_code(500); // Internal Server Error
                echo json_encode(['message' => 'Não foi possível registar o utilizador.']);
            }
        }
        break;

    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Método não permitido para login.']);
            exit;
        }
        
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->email) || empty($data->password)) {
             http_response_code(400);
             echo json_encode(['message' => 'Dados incompletos.']);
             exit;
        }

        $query = "SELECT id, email, password FROM users WHERE email = :email";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':email', $data->email);
        $stmt->execute();
        
        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (password_verify($data->password, $row['password'])) {
                $_SESSION['user_id'] = $row['id'];
                $_SESSION['user_email'] = $row['email'];

                http_response_code(200);
                echo json_encode(['message' => 'Login bem-sucedido.', 'user' => ['email' => $row['email']]]);
            } else {
                http_response_code(401); // Unauthorized
                echo json_encode(['message' => 'Email ou senha inválidos.']);
            }
        } else {
             http_response_code(401);
             echo json_encode(['message' => 'Email ou senha inválidos.']);
        }
        break;

    case 'logout':
        session_destroy();
        http_response_code(200);
        echo json_encode(['message' => 'Logout bem-sucedido.']);
        break;

    case 'status':
        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(['message' => 'Método não permitido para status.']);
            exit;
        }
        
        if (isset($_SESSION['user_id'])) {
            $query = "SELECT SUM(points) as total_points FROM tasks WHERE user_id = :user_id AND completed = 1";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $_SESSION['user_id']);
            $stmt->execute();
            $points_row = $stmt->fetch(PDO::FETCH_ASSOC);
            $points = $points_row['total_points'] ?? 0;

            http_response_code(200);
            echo json_encode([
                'loggedIn' => true,
                'user' => ['email' => $_SESSION['user_email']],
                'points' => (int)$points
            ]);
        } else {
            http_response_code(200);
            echo json_encode(['loggedIn' => false]);
        }
        break;

    default:
        http_response_code(404); // Not Found
        echo json_encode(['message' => "Ação desconhecida ou não especificada. Ação recebida: '{$action}'."]);
        break;
}
?>
