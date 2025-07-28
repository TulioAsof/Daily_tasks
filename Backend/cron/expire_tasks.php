#!/usr/bin/php
<?php
// /cron/expire_tasks.php

// A primeira linha #!/usr/bin/php é para execução via linha de comando

include_once dirname(__FILE__).'/../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Penalidades baseadas na dificuldade
$penalties = ['fácil' => 2, 'médio' => 5, 'difícil' => 8];

// Seleciona tarefas não completadas e não expiradas que venceram
$query = "SELECT id, difficulty FROM tasks WHERE completed = 0 AND expired = 0 AND date < CURDATE()";
$stmt = $db->prepare($query);
$stmt->execute();

$expired_tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
$count = 0;

foreach ($expired_tasks as $task) {
    $penalty = $penalties[$task['difficulty']];
    
    // Atualiza a tarefa como expirada e aplica pontos negativos como penalidade
    $update_query = "UPDATE tasks SET expired = 1, points = :penalty WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    
    // Armazenando a penalidade como pontos negativos
    $negative_points = -$penalty;
    $update_stmt->bindParam(':penalty', $negative_points);
    $update_stmt->bindParam(':id', $task['id']);
    
    if($update_stmt->execute()){
        $count++;
    }
}

// Log da execução (útil para debug)
echo "Processo de expiração finalizado. $count tarefas marcadas como expiradas.\n";
?>