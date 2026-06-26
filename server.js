const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Database connection error:", err);
});

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");

    // Table 1: Users (With explicit roles matching Use Cases)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        role VARCHAR CHECK(role IN ('Admin', 'Project Manager', 'Team Member')) NOT NULL
    )`);

    // Table 2: Projects
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        project_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name VARCHAR NOT NULL,
        description TEXT
    )`);

    // Table 3: Tasks
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        task_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        assigned_to INTEGER,
        task_name VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'To Do',
        priority VARCHAR DEFAULT 'Medium',
        due_date VARCHAR,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
    )`);

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding fresh ecosystem dataset...");

            // Seed Actors for explicit login verification
            db.run("INSERT INTO users (name, email, role) VALUES ('Alex Kim', 'admin@planflow.io', 'Admin')");
            db.run("INSERT INTO users (name, email, role) VALUES ('Marcus Jordan', 'pm@planflow.io', 'Project Manager')");
            db.run("INSERT INTO users (name, email, role) VALUES ('Sarah Rogers', 'sarah@planflow.io', 'Team Member')");
            db.run("INSERT INTO users (name, email, role) VALUES ('Ryan King', 'ryan@planflow.io', 'Team Member')", function() {

                // Seed Projects
                db.run("INSERT INTO projects (project_name, description) VALUES ('Website Redesign', 'UI overhaul & new landing pages')");
                db.run("INSERT INTO projects (project_name, description) VALUES ('Mobile App v2', 'iOS & Android feature release')");
                db.run("INSERT INTO projects (project_name, description) VALUES ('API Integration', 'Third-party payment gateway')", function() {

                    // Align metrics with image charts
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 1, 'Design system audit', 'To Do', 'High', '2026-06-25')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 2, 'Write copy for homepage', 'To Do', 'Medium', '2026-06-28')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 3, 'Navbar component build', 'In Progress', 'High', '2026-06-23')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 1, 'Responsive layout testing', 'In Progress', 'Low', '2026-06-24')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 2, 'Wireframes approved', 'Done', 'Medium', '2026-06-10')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (1, 3, 'Brand guidelines updated', 'Done', 'Low', '2026-06-12')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (3, 1, 'Sandbox testing complete', 'Done', 'High', '2026-06-18')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (2, 2, 'App store screenshots', 'In Progress', 'Low', '2026-06-20')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (2, 4, 'Beta feedback review', 'To Do', 'High', '2026-06-15')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (2, 4, 'Push notification setups', 'To Do', 'Medium', '2026-06-22')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (3, 4, 'Auth token validation loops', 'In Progress', 'High', '2026-06-27')");
                    db.run("INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (3, 4, 'Logger analytics module', 'Done', 'Medium', '2026-06-29')");

                    console.log("Unified database seed successful with Actors and Use Cases.");
                });
            });
        }
    });
});

// Use Case: Login API
app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "User profile not found. Try admin@planflow.io" });
        res.json(row);
    });
});

// Use Case: Manage Users APIs
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => res.json(rows));
});

app.post('/api/users', (req, res) => {
    const { name, email, role } = req.body;
    db.run('INSERT INTO users (name, email, role) VALUES (?, ?, ?)', [name, email, role], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ user_id: this.lastID });
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.run('DELETE FROM users WHERE user_id = ?', [req.params.id], () => res.json({ success: true }));
});

// Use Case: Create Projects APIs
app.get('/api/projects', (req, res) => {
    const query = `
        SELECT p.*, COUNT(t.task_id) as total_tasks,
        SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as done_tasks
        FROM projects p LEFT JOIN tasks t ON p.project_id = t.project_id GROUP BY p.project_id
    `;
    db.all(query, [], (err, rows) => res.json(rows));
});

app.post('/api/projects', (req, res) => {
    const { project_name, description } = req.body;
    db.run('INSERT INTO projects (project_name, description) VALUES (?, ?)', [project_name, description], function(err) {
        res.json({ project_id: this.lastID });
    });
});

// Use Case: Assign Tasks & View Detailed APIs
app.get('/api/tasks/detailed', (req, res) => {
    const query = `
        SELECT t.*, p.project_name, u.name as owner_name 
        FROM tasks t 
        JOIN projects p ON t.project_id = p.project_id
        LEFT JOIN users u ON t.assigned_to = u.user_id
    `;
    db.all(query, [], (err, rows) => res.json(rows));
});

app.post('/api/tasks', (req, res) => {
    const { title, project_id, assigned_to, priority, due_date } = req.body;
    db.run('INSERT INTO tasks (project_id, assigned_to, task_name, status, priority, due_date) VALUES (?, ?, ?, \'To Do\', ?, ?)', 
        [project_id, assigned_to || null, title, priority, due_date], function(err) {
            res.json({ task_id: this.lastID });
    });
});

// Use Case: Update Progress API (Drag and Drop / Column Shifts)
app.put('/api/tasks/:id', (req, res) => {
    db.run('UPDATE tasks SET status = ? WHERE task_id = ?', [req.body.status, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/tasks/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE task_id = ?', [req.params.id], () => res.json({ success: true }));
});

app.listen(PORT, () => console.log(`PlanFlow ecosystem running on http://localhost:${PORT}`));