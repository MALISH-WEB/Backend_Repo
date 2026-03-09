import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './ProjectsPage.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'a-z', label: 'A → Z' },
  { value: 'z-a', label: 'Z → A' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [faculty, setFaculty] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/faculties')]).then(([cRes, fRes]) => {
      setCategories(cRes.data);
      setFaculties(fRes.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (faculty) params.faculty = faculty;
    if (sort) params.sort = sort;

    api.get('/projects', { params })
      .then(res => setProjects(res.data))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, [search, category, faculty, sort]);

  function clearFilters() {
    setSearch(''); setCategory(''); setFaculty(''); setSort('newest');
  }

  return (
    <div className="projects-page">
      <div className="projects-hero">
        <h1>Discover Student Projects</h1>
        <p>Explore innovative projects built by UCU students</p>
      </div>

      <div className="projects-container">
        <div className="filters-bar">
          <input
            className="search-input"
            type="text"
            placeholder="🔍  Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={faculty} onChange={e => setFaculty(e.target.value)}>
            <option value="">All Faculties</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || category || faculty || sort !== 'newest') && (
            <button className="btn-clear" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {loading && <div className="loading-state">Loading projects…</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && projects.length === 0 && (
          <div className="empty-state">
            <span>📭</span>
            <p>No projects found. Try adjusting your filters.</p>
          </div>
        )}

        <div className="projects-grid">
          {projects.map(project => (
            <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
              <div className="project-card-header">
                <span className="project-category">{project.category_name || 'General'}</span>
              </div>
              <h3 className="project-title">{project.title}</h3>
              <p className="project-description">
                {project.description?.length > 120
                  ? project.description.slice(0, 120) + '…'
                  : project.description}
              </p>
              <div className="project-meta">
                <span className="project-faculty">{project.faculty_name || 'Unknown Faculty'}</span>
                <span className="project-date">{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
