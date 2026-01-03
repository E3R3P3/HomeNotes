const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar base de datos SQLite3
const db = new sqlite3.Database('./tareas.db', (err) => {
  if (err) {
    console.error('Error abriendo base de datos:', err);
  } else {
    console.log('Base de datos conectada');
    inicializarBD();
  }
});

// Inicializar tabla de tareas
function inicializarBD() {
  db.run(`
    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      completada INTEGER DEFAULT 0,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_completada DATETIME
    )
  `);
}

// Rutas

// Página principal
app.get('/', (req, res) => {
  res.render('index');
});

// API - Obtener todas las tareas
app.get('/api/tareas', (req, res) => {
  db.all('SELECT * FROM tareas ORDER BY completada ASC, fecha_creacion DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// API - Crear nueva tarea
app.post('/api/tareas', (req, res) => {
  const { titulo, descripcion } = req.body;
  
  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  db.run(
    'INSERT INTO tareas (titulo, descripcion) VALUES (?, ?)',
    [titulo.trim(), descripcion || ''],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, titulo, descripcion, completada: 0 });
      }
    }
  );
});

// API - Marcar tarea como completada
app.put('/api/tareas/:id/completar', (req, res) => {
  const { id } = req.params;
  const { completada } = req.body;

  const query = completada
    ? 'UPDATE tareas SET completada = 1, fecha_completada = CURRENT_TIMESTAMP WHERE id = ?'
    : 'UPDATE tareas SET completada = 0, fecha_completada = NULL WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

// API - Eliminar tarea
app.delete('/api/tareas/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM tareas WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

// API - Actualizar tarea
app.put('/api/tareas/:id', (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion } = req.body;

  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  db.run(
    'UPDATE tareas SET titulo = ?, descripcion = ? WHERE id = ?',
    [titulo.trim(), descripcion || '', id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});