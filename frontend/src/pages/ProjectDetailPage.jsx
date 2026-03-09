import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProjectDetailPage.css';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/comments/${id}`),
    ])
      .then(([pRes, cRes]) => {
        setProject(pRes.data);
        setComments(cRes.data);
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);
    setCommentError('');
    try {
      const res = await api.post('/comments', { project_id: id, comment: newComment });
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      setCommentError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  }

  if (loading) return <div className="detail-loading">Loading project…</div>;
  if (error) return <div className="detail-error">{error}</div>;
  if (!project) return null;

  return (
    <div className="detail-page">
      <div className="detail-container">
        <Link to="/projects" className="back-link">← Back to Projects</Link>

        <div className="detail-main">
          <div className="detail-content">
            <div className="detail-tags">
              {project.category_name && (
                <span className="tag tag-category">{project.category_name}</span>
              )}
              {project.faculty_name && (
                <span className="tag tag-faculty">{project.faculty_name}</span>
              )}
            </div>

            <h1 className="detail-title">{project.title}</h1>

            <div className="detail-author-row">
              <span className="detail-author">by {project.user_name || 'Unknown'}</span>
              <span className="detail-date">{new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            <div className="detail-description">
              <p>{project.description}</p>
            </div>

            <div className="detail-links">
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="link-btn link-github">
                  <span>⚡</span> GitHub Repository
                </a>
              )}
              {project.live_url && (
                <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="link-btn link-live">
                  <span>🌐</span> Live Demo
                </a>
              )}
              {project.file_path && (
                <a href={`/uploads/${project.file_path.split('/').pop()}`} target="_blank" rel="noopener noreferrer" className="link-btn link-file">
                  <span>📎</span> Download Attachment
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="comments-section">
          <h2 className="comments-title">Comments <span className="comments-count">{comments.length}</span></h2>

          {user ? (
            <form onSubmit={handleComment} className="comment-form">
              {commentError && <div className="alert alert-error">{commentError}</div>}
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Share your thoughts on this project…"
                rows={3}
                required
              />
              <button type="submit" className="btn-submit-comment" disabled={commentLoading}>
                {commentLoading ? 'Posting…' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <div className="comment-login-prompt">
              <Link to="/login">Sign in</Link> to leave a comment.
            </div>
          )}

          <div className="comments-list">
            {comments.length === 0 && (
              <div className="no-comments">No comments yet. Be the first to comment!</div>
            )}
            {comments.map(c => (
              <div key={c.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{c.user_name || 'Anonymous'}</span>
                  <span className="comment-date">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="comment-text">{c.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
