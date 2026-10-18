
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


function validateJob({ company, role, status }) {
  const validStatuses = [
    "Applied",
    "OA",
    "Interview",
    "Offer",
    "Rejected",
  ];

  if (
    typeof company !== "string" ||
    !company.trim() ||
    company.trim().length > 100
  ) {
    return "Company must be between 1 and 100 characters.";
  }

  if (
    typeof role !== "string" ||
    !role.trim() ||
    role.trim().length > 100
  ) {
    return "Role must be between 1 and 100 characters.";
  }

  if (!validStatuses.includes(status)) {
    return "Please provide a valid application status.";
  }

  return null;
}


const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Check API and database connection
app.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      message: "JobTrack API is running!",
      database: "Connected",
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    res.status(500).json({ message: "Database connection failed." });
  }
});

// Get, search, filter, and sort applications
app.get("/api/jobs", async (req, res) => {
  const {
    search = "",
    status = "All",
    sort = "newest",
  } = req.query;

  const allowedStatuses = [
    "Applied", "OA", "Interview", "Offer", "Rejected",
  ];

  if (status !== "All" && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter." });
  }

  const orderBy =
    sort === "company"
      ? "company ASC, created_at DESC"
      : sort === "oldest"
        ? "created_at ASC"
        : "created_at DESC";

  try {
    const result = await pool.query(
      `SELECT
         id,
         company,
         role,
         status,
         TO_CHAR(applied_on, 'DD/MM/YYYY') AS "appliedOn"
       FROM jobs
       WHERE
         ($1 = '' OR company ILIKE '%' || $1 || '%'
          OR role ILIKE '%' || $1 || '%')
         AND ($2 = 'All' OR status = $2)
       ORDER BY ${orderBy}`,
      [String(search).trim(), status]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch jobs error:", error.message);
    res.status(500).json({ message: "Could not fetch applications." });
  }
});


 // Get dashboard statistics for ALL applications
app.get("/api/jobs/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Applied')::int AS applied,
        COUNT(*) FILTER (WHERE status = 'OA')::int AS oa,
        COUNT(*) FILTER (WHERE status = 'Interview')::int AS interviews,
        COUNT(*) FILTER (WHERE status = 'Offer')::int AS offers,
        COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected
      FROM jobs
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Statistics error:", error.message);
    res.status(500).json({
      message: "Could not fetch dashboard statistics.",
    });
  }
});



 // Create an application
app.post("/api/jobs", async (req, res) => {
  const { company, role, status = "Applied" } = req.body || {};

  const validationError = validateJob({ company, role, status });

  if (validationError) {
    return res.status(400).json({
      message: validationError,
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO jobs (company, role, status)
       VALUES ($1, $2, $3)
       RETURNING id, company, role, status,
         TO_CHAR(applied_on, 'DD/MM/YYYY') AS "appliedOn"`,
      [company.trim(), role.trim(), status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create job error:", error.message);
    res.status(500).json({
      message: "Could not create application.",
    });
  }
});



 // Update an application
app.put("/api/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { company, role, status } = req.body || {};

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      message: "Invalid application ID.",
    });
  }

  const validationError = validateJob({ company, role, status });

  if (validationError) {
    return res.status(400).json({
      message: validationError,
    });
  }

  try {
    const result = await pool.query(
      `UPDATE jobs
       SET company = $1, role = $2, status = $3
       WHERE id = $4
       RETURNING id, company, role, status,
         TO_CHAR(applied_on, 'DD/MM/YYYY') AS "appliedOn"`,
      [company.trim(), role.trim(), status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update job error:", error.message);
    res.status(500).json({
      message: "Could not update application.",
    });
  }
});


// Delete an application
app.delete("/api/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid application ID." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Delete job error:", error.message);
    res.status(500).json({ message: "Could not delete application." });
  }
});

app.listen(PORT, () => {
  console.log(`JobTrack API running at http://localhost:${PORT}`);
});
