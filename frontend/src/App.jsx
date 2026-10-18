
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/jobs";

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: response.ok
        ? "The server returned an unexpected response."
        : "The server returned an invalid error response.",
    };
  }
}

const STATUSES = [
  "Applied",
  "OA",
  "Interview",
  "Offer",
  "Rejected",
];

function App() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
  total: 0,
  applied: 0,
  oa: 0,
  interviews: 0,
  offers: 0,
  rejected: 0,
});
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Applied");

  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch jobs whenever search, filter, sorting, or saved data changes
  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          search: searchTerm,
          status: filter,
          sort: sortOption,
        });

        const response = await fetch(
          `${API_URL}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Could not load applications.");
        }

        const data = await response.json();

        if (!cancelled) {
          setJobs(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load applications.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, filter, sortOption, refreshKey]);

  
useEffect(() => {
  let cancelled = false;

  async function fetchStats() {
    try {
      const response = await fetch(`${API_URL}/stats`);

      if (!response.ok) {
        throw new Error("Could not load statistics.");
      }

      const data = await response.json();

      if (!cancelled) {
        setStats(data);
      }
    } catch (err) {
      console.error("Statistics loading error:", err.message);
    }
  }

  fetchStats();

  return () => {
    cancelled = true;
  };
}, [refreshKey]);


  function resetForm() {
    setCompany("");
    setRole("");
    setStatus("Applied");
    setEditingId(null);
  }

  
async function handleSubmit(event) {
  event.preventDefault();
  setError("");

  const cleanCompany = company.trim();
  const cleanRole = role.trim();

  if (!cleanCompany || !cleanRole) {
    setError("Company and role are required.");
    return;
  }

  if (cleanCompany.length > 100) {
    setError("Company name must be 100 characters or fewer.");
    return;
  }

  if (cleanRole.length > 100) {
    setError("Job role must be 100 characters or fewer.");
    return;
  }

  setSaving(true);

  try {
    const isEditing = editingId !== null;

    const response = await fetch(
      isEditing ? `${API_URL}/${editingId}` : API_URL,
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: cleanCompany,
          role: cleanRole,
          status,
        }),
      }
    );

   const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data.message || "Could not save application."
      );
    }

    resetForm();
    setRefreshKey((previous) => previous + 1);
  } catch (err) {
    setError(err.message || "Something went wrong.");
  } finally {
    setSaving(false);
  }
}


  function editJob(job) {
    setEditingId(job.id);
    setCompany(job.company);
    setRole(job.role);
    setStatus(job.status);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteJob(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await readResponse(response);
        
        throw new Error(
          data.message || "Could not delete application."
        );
      }

      if (editingId === id) {
        resetForm();
      }

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>JobTrack</h1>
          <p>Keep your job search organized.</p>
        </div>

        <span className="badge">My workspace</span>
      </header>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

    
<section className="stats">
  <div className="stat-card">
    <span>Total applications</span>
    <h2>{stats.total}</h2>
  </div>
  <div className="stat-card">
    <span>Applied</span>
    <h2>{stats.applied}</h2>
  </div>
  <div className="stat-card">
    <span>Online assessments</span>
    <h2>{stats.oa}</h2>
  </div>
  <div className="stat-card">
    <span>Interviews</span>
    <h2>{stats.interviews}</h2>
  </div>
  <div className="stat-card">
    <span>Offers</span>
    <h2>{stats.offers}</h2>
  </div>
  <div className="stat-card">
    <span>Rejected</span>
    <h2>{stats.rejected}</h2>
  </div>
</section>


      <section className="panel">
        <h2>
          {editingId !== null
            ? "Edit application"
            : "Add an application"}
        </h2>

        <form onSubmit={handleSubmit} className="job-form">
          <input
            placeholder="Company name"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            required
          />

          <input
            placeholder="Job role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Application status"
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId !== null
                ? "Save changes"
                : "+ Add job"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              className="cancel-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </form>
      </section>

      <section className="panel">
        <div className="list-header">
          <h2>Your applications</h2>

          <div className="list-controls">
            <input
              type="search"
              placeholder="Search company or role..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search applications"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter applications by status"
            >
              <option value="All">All statuses</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              aria-label="Sort applications"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="company">Company A–Z</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading applications...</p>
        ) : jobs.length === 0 ? (
          <p className="empty">
            No applications found. Add a job or change your search/filter.
          </p>
        ) : (
          <div className="job-list">
            {jobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="job-info">
                  <h3>{job.role}</h3>
                  <p>{job.company}</p>
                  <p>Applied: {job.appliedOn}</p>
                </div>

                <div className="job-actions">
                  <span className={`status status-${job.status.toLowerCase()}`}>
  {job.status}
</span>

                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => editJob(job)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteJob(job.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
