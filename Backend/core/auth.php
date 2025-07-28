<?php
/**
 * /core/auth.php
 *
 * Este ficheiro contém funções de ajuda para a autenticação.
 * É utilizado para proteger os endpoints da API, garantindo que apenas
 * utilizadores autenticados possam aceder a recursos protegidos.
 */

/**
 * Verifica se o utilizador está atualmente autenticado,
 * analisando a variável de sessão.
 *
 * @return bool Retorna true se o utilizador estiver autenticado, caso contrário, false.
 */
function is_user_logged_in(): bool {
    // A forma mais segura de verificar é garantir que a sessão foi iniciada
    // e que a nossa variável 'user_id' está definida.
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return isset($_SESSION['user_id']);
}

/**
 * Exige que um utilizador esteja autenticado para continuar a execução do script.
 * Se o utilizador não estiver autenticado, a função envia uma resposta HTTP 401
 * (Unauthorized), um JSON com uma mensagem de erro, e termina o script.
 *
 * Esta função deve ser chamada no início de qualquer endpoint que necessite de proteção.
 *
 * @return void
 */
function require_login(): void {
    if (!is_user_logged_in()) {
        // Envia o cabeçalho de resposta HTTP para acesso não autorizado.
        http_response_code(401);

        // Envia uma resposta JSON clara.
        echo json_encode([
            'status' => 'error',
            'message' => 'Acesso negado. É necessária autenticação.'
        ]);

        // Termina a execução do script para evitar que o código subsequente seja executado.
        exit();
    }
}

/**
 * Obtém o ID do utilizador atualmente autenticado a partir da sessão.
 *
 * @return int|null Retorna o ID do utilizador se estiver autenticado, caso contrário, null.
 */
function get_current_user_id(): ?int {
    if (is_user_logged_in()) {
        return (int)$_SESSION['user_id'];
    }
    return null;
}
?>