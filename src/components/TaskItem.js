import React from "react";

const TaskItem = ({ task, handleComplete }) => {
  const difficultyColors = {
    fácil: "#00FF00",
    médio: "#FFA500",
    difícil: "#FF0000",
  };

  return (
    <div className="task" style={{ backgroundColor: difficultyColors[task.difficulty] }}>
      <p>
        {task.text} - <b>{task.difficulty}</b> - 📅 {task.date} ({task.recurrence})
        {task.expired && " (Expirada)"}
      </p>
      <button onClick={() => handleComplete(task.id)} disabled={task.completed || task.expired}>
        {task.completed ? "✅ Concluído" : "Concluir"}
      </button>
    </div>
  );
};

export default TaskItem;