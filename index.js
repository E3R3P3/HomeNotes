const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;

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
  db.run(`
    CREATE TABLE IF NOT EXISTS subtareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      completada INTEGER DEFAULT 0,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_completada DATETIME,
      FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE
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

// API - Obtener subtareas de una tarea
app.get('/api/tareas/:id/subtareas', (req, res) => {
  const { id } = req.params;
  db.all('SELECT * FROM subtareas WHERE tarea_id = ? ORDER BY completada ASC, fecha_creacion DESC', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API - Crear subtarea para una tarea
app.post('/api/tareas/:id/subtareas', (req, res) => {
  const { id } = req.params;
  const { titulo } = req.body;
  if (!titulo || titulo.trim() === '') return res.status(400).json({ error: 'El título es requerido' });

  db.run('INSERT INTO subtareas (tarea_id, titulo) VALUES (?, ?)', [id, titulo.trim()], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, tarea_id: Number(id), titulo, completada: 0 });
  });
});

// API - Actualizar subtarea
app.put('/api/subtareas/:id', (req, res) => {
  const { id } = req.params;
  const { titulo } = req.body;
  if (!titulo || titulo.trim() === '') return res.status(400).json({ error: 'El título es requerido' });

  db.run('UPDATE subtareas SET titulo = ? WHERE id = ?', [titulo.trim(), id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// API - Marcar subtarea completada/pendiente
app.put('/api/subtareas/:id/completar', (req, res) => {
  const { id } = req.params;
  const { completada } = req.body;
  const query = completada
    ? 'UPDATE subtareas SET completada = 1, fecha_completada = CURRENT_TIMESTAMP WHERE id = ?'
    : 'UPDATE subtareas SET completada = 0, fecha_completada = NULL WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// API - Eliminar subtarea
app.delete('/api/subtareas/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM subtareas WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});